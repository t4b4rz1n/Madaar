from django.db import transaction
from django.utils.text import Truncator
from django.utils.translation import gettext_lazy as _
from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import (
    Board,
    Task,
    TaskActivityLog,
    TaskChecklistItem,
    TaskComment,
    TaskStatus,
)


class BoardService:
    """Service layer for Kanban Board business logic."""

    @staticmethod
    @transaction.atomic
    def create_board(title, project, created_by, description=None, background_color=None):
        # Lock existing boards to prevent race condition
        existing_boards = list(Board.objects.filter(project=project).select_for_update())
        max_order = len(existing_boards)
        board = Board.objects.create(
            title=title,
            description=description,
            background_color=background_color or "#6366f1",
            project=project,
            created_by=created_by,
            order=max_order + 1,
        )

        # Create default Kanban statuses (columns) for the board
        default_statuses = [
            ("todo", _("To Do")),
            ("doing", _("Doing")),
            ("review", _("Review")),
            ("done", _("Done")),
        ]
        statuses_to_create = [
            TaskStatus(
                board=board,
                code=code,
                name=str(name),
                order=index + 1,
            )
            for index, (code, name) in enumerate(default_statuses)
        ]
        TaskStatus.objects.bulk_create(statuses_to_create)

        return board

    @staticmethod
    @transaction.atomic
    def reorder_boards(project, board_orders, actor=None):
        """
        board_orders: list of dicts [{'id': uuid, 'order': int}, ...]
        """
        boards_to_update = []
        board_ids = [item["id"] for item in board_orders if "id" in item]
        if board_ids:
            boards_dict = {
                str(b.id): b
                for b in Board.objects.filter(id__in=board_ids, project=project).select_for_update()
            }
            for item in board_orders:
                board_obj = boards_dict.get(str(item["id"]))
                if board_obj:
                    board_obj.order = item["order"]
                    boards_to_update.append(board_obj)

            if boards_to_update:
                Board.objects.bulk_update(boards_to_update, ["order"])

        if actor and boards_to_update:
            first_board = boards_to_update[0]
            TaskActivityLog.objects.create(
                board=first_board,
                actor=actor,
                action=Truncator(
                    str(_("Reordered boards in project '%(project)s'") % {"project": project.name})
                ).chars(255),
            )


class TaskStatusService:
    """Service layer for per-board TaskStatus (Kanban Columns) CRUD and reordering."""

    @staticmethod
    @transaction.atomic
    def create_status(board, code, name, order=None, actor=None):
        if order is None:
            existing_statuses = list(TaskStatus.objects.filter(board=board).select_for_update())
            max_order = len(existing_statuses)
            order = max_order + 1

        status_obj = TaskStatus.objects.create(
            board=board,
            code=code,
            name=name,
            order=order,
        )

        if actor:
            TaskActivityLog.objects.create(
                board=board,
                actor=actor,
                action=Truncator(str(_("Added status '%(name)s' to board") % {"name": name})).chars(
                    255
                ),
            )

        return status_obj

    @staticmethod
    @transaction.atomic
    def delete_status(status_obj, actor=None):
        board = status_obj.board
        name = status_obj.name

        status_obj.is_deleted = True
        status_obj.save(update_fields=["is_deleted"])
        from .cascade_services import TaskCascadeService

        TaskCascadeService.soft_delete_status(status_obj)

        if actor:
            TaskActivityLog.objects.create(
                board=board,
                actor=actor,
                action=Truncator(
                    str(_("Removed status '%(name)s' from board") % {"name": name})
                ).chars(255),
            )

    @staticmethod
    @transaction.atomic
    def reorder_statuses(board, status_orders, actor=None):
        """
        status_orders: list of dicts [{'id': uuid, 'order': int}, ...]
        """
        status_ids = [item["id"] for item in status_orders if "id" in item]
        if status_ids:
            statuses_dict = {
                str(s.id): s
                for s in TaskStatus.objects.filter(
                    id__in=status_ids, board=board
                ).select_for_update()
            }
            statuses_to_update = []
            for item in status_orders:
                status_obj = statuses_dict.get(str(item["id"]))
                if status_obj:
                    status_obj.order = item["order"]
                    statuses_to_update.append(status_obj)

            if statuses_to_update:
                TaskStatus.objects.bulk_update(statuses_to_update, ["order"])

        if actor:
            TaskActivityLog.objects.create(
                board=board,
                actor=actor,
                action=Truncator(
                    str(_("Reordered statuses on board '%(board)s'") % {"board": board.title})
                ).chars(255),
            )


class TaskService:
    """Service layer for Task creation, updates, movement, and activity logging."""

    UPDATABLE_FIELDS = {
        "project",
        "milestone",
        "title",
        "description",
        "status",
        "priority",
        "assignee",
        "due_date",
        "estimated_hours",
        "parent_task",
        "is_blocked",
    }

    @staticmethod
    @transaction.atomic
    def create_task(
        title,
        reporter,
        project=None,
        description=None,
        status=None,
        priority=Task.Priority.MEDIUM,
        assignee=None,
        due_date=None,
        estimated_hours=None,
        parent_task=None,
        milestone=None,
        spent_hours=0,
        order=0,
        is_blocked=False,
    ):
        # Validate that reporter is a project member (unless staff/superuser or org owner)
        if (
            project
            and reporter
            and not (
                getattr(reporter, "is_staff", False) or getattr(reporter, "is_superuser", False)
            )
        ):
            from organizations.models import OrganizationMembership
            from projects.models import ProjectMember

            is_org_owner = (
                project.organization.owner == reporter
                or OrganizationMembership.objects.filter(
                    organization=project.organization,
                    user=reporter,
                    role=OrganizationMembership.Role.OWNER,
                ).exists()
            )

            if not is_org_owner:
                is_member = ProjectMember.objects.filter(
                    project=project, user=reporter, is_active=True
                ).exists()
                if not is_member:
                    raise PermissionDenied(_("You are not a member of this project."))

        # Validate that assignee is a member of the organization
        if assignee and project:
            from organizations.models import OrganizationMembership

            is_assignee_org_member = OrganizationMembership.objects.filter(
                organization=project.organization, user=assignee
            ).exists()
            if not is_assignee_org_member:
                raise ValidationError(_("Assignee must be a member of the organization."))

        if not status:
            if project:
                status = TaskStatus.objects.filter(board__project=project, code="todo").first()
                if not status:
                    status = TaskStatus.objects.filter(board__project=project).first()
            if not status:
                raise ValidationError(_("No statuses found for this project."))

        if parent_task and project and parent_task.project != project:
            raise ValidationError(_("Parent task must belong to the same project."))

        # Calculate max order for the given status to append at the bottom
        if order == 0:
            from django.db.models import Max

            max_order_agg = Task.objects.filter(status=status).aggregate(Max("order"))
            max_order = max_order_agg["order__max"]
            if max_order is not None:
                order = max_order + 1

        task = Task.objects.create(
            project=project,
            milestone=milestone,
            title=title,
            description=description,
            status=status,
            priority=priority,
            assignee=assignee,
            reporter=reporter,
            due_date=due_date,
            estimated_hours=estimated_hours,
            parent_task=parent_task,
            spent_hours=spent_hours,
            order=order,
            is_blocked=is_blocked,
        )

        # Log activity
        TaskActivityLog.objects.create(
            task=task,
            actor=reporter,
            action=str(_("Task created: %(title)s") % {"title": task.title}),
        )

        return task

    @staticmethod
    @transaction.atomic
    def update_task(task, actor, **kwargs):
        # We rely on the serializer to validate that the assignee is a valid ProjectMember.
        # Human-readable field labels
        field_labels = {
            "assignee": _("Assignee"),
            "status": _("Status"),
            "priority": _("Priority"),
            "title": _("Title"),
            "description": _("Description"),
            "due_date": _("Due date"),
            "estimated_hours": _("Estimated hours"),
            "order": _("Order"),
            "parent_task": _("Parent task"),
            "is_finished": _("Finished"),
            "is_blocked": _("Blocked"),
            "milestone": _("Milestone"),
        }

        def _display(val, field_name):
            if val is None:
                return str(_("Unassigned")) if field_name == "assignee" else str(_("empty"))
            if isinstance(val, bool):
                return "✓" if val else "✗"
            if hasattr(val, "get_full_name"):
                return val.get_full_name() or getattr(val, "email", str(val))
            if hasattr(val, "name"):
                return val.name
            # Format dates nicely
            if hasattr(val, "strftime"):
                return val.strftime("%b %d, %Y")
            # Truncate long text (e.g. description)
            s = str(val)
            if len(s) > 50:
                return s[:47] + "..."
            return s

        # Fields to skip in activity log (noisy/internal)
        skip_log_fields = {"order"}

        changes = []
        for field, value in kwargs.items():
            if field not in TaskService.UPDATABLE_FIELDS:
                continue
            old_val = getattr(task, field)
            if old_val != value:
                setattr(task, field, value)
                if field not in skip_log_fields:
                    if field == "assignee":
                        if value:
                            changes.append(
                                str(_("Task assigned to %(user)s"))
                                % {"user": _display(value, field)}
                            )
                        else:
                            changes.append(str(_("Task unassigned")))
                    else:
                        label = field_labels.get(field, field)
                        changes.append(
                            f"{label}: {_display(old_val, field)} → {_display(value, field)}"
                        )

        if changes:
            task.save()
            action_desc = ", ".join(changes)
            TaskActivityLog.objects.create(
                task=task,
                actor=actor,
                action=Truncator(action_desc).chars(255),
            )

        return task

    @staticmethod
    @transaction.atomic
    def move_task(task, actor, new_status=None, new_order=None):
        """Handles Drag & Drop movement across Kanban statuses and reorders tasks."""
        from django.db.models import F

        # Permission check for moving tasks
        if not actor.is_staff and not actor.is_superuser:
            # admin, owner, team_lead can move any task
            pass

        old_status = task.status
        old_order = task.order

        pass

        action_parts = []

        changed = False
        if new_status and task.status != new_status:
            if task.project and new_status.board and new_status.board.project_id != task.project_id:
                raise ValidationError(_("Target status does not belong to the same project."))
            action_parts.append(str(_("Status changed to %(st)s") % {"st": new_status.name}))
            task.status = new_status
            changed = True

            # Handle timer auto-start/stop
            from attendance.services import TimeLogService

            code = new_status.code.lower() if new_status.code else ""
            if code == "doing":
                try:
                    TimeLogService.start_timer(actor, task)
                except Exception:
                    pass
            elif code in ["review", "done"]:
                # Stop timers for anyone working on this task
                from attendance.models import TimeLog

                active_timers = TimeLog.objects.filter(task=task, is_active=True)
                for timer in active_timers:
                    TimeLogService.stop_timer(timer.user, timer.id, auto_move=False)

                if code == "done":
                    task.is_finished = True

        # Order Shifting Logic
        if new_status and old_status != new_status:
            # Moving to a DIFFERENT status column
            if new_order is not None:
                # Shift tasks in the new column down to make room
                Task.objects.filter(status=new_status, order__gte=new_order).update(
                    order=F("order") + 1
                )
                task.order = new_order
            else:
                # Append to the end of the new column
                from django.db.models import Max

                max_order = Task.objects.filter(status=new_status).aggregate(Max("order"))[
                    "order__max"
                ]
                task.order = (max_order + 1) if max_order is not None else 0

            # Shift tasks in the old column up to fill the gap
            if old_status:
                Task.objects.filter(status=old_status, order__gt=old_order).update(
                    order=F("order") - 1
                )

            action_parts.append(str(_("Order changed")))
            changed = True
        else:
            # Moving within the SAME status column
            if new_order is not None and old_order != new_order:
                if new_order < old_order:
                    # Moving up: shift tasks down in the range
                    Task.objects.filter(
                        status=old_status, order__gte=new_order, order__lt=old_order
                    ).update(order=F("order") + 1)
                else:
                    # Moving down: shift tasks up in the range
                    Task.objects.filter(
                        status=old_status, order__gt=old_order, order__lte=new_order
                    ).update(order=F("order") - 1)

                task.order = new_order
                action_parts.append(str(_("Order changed")))
                changed = True

        if changed:
            task.save()

        if action_parts:
            TaskActivityLog.objects.create(
                task=task,
                actor=actor,
                action=Truncator(" | ".join(action_parts)).chars(255),
            )

        return task

    @staticmethod
    @transaction.atomic
    def delete_task(task, actor):
        """Soft deletes task and logs activity."""
        title = task.title
        board = task.status.board if task.status else None
        task.is_deleted = True
        task.save(update_fields=["is_deleted"])
        from .cascade_services import TaskCascadeService

        TaskCascadeService.soft_delete_task(task)

        TaskActivityLog.objects.create(
            task=task,
            board=board,
            actor=actor,
            action=Truncator(str(_("Deleted task: %(title)s") % {"title": title})).chars(255),
        )

    @staticmethod
    @transaction.atomic
    def reorder_tasks(orders, actor=None):
        """
        orders: list of dicts [{'id': uuid, 'order': int}, ...]
        """
        task_ids = [item.get("id") for item in orders if item.get("id")]
        if not task_ids:
            return

        tasks_dict = {
            str(t.id): t for t in Task.objects.filter(id__in=task_ids).select_for_update()
        }
        tasks_to_update = []
        for item in orders:
            task_obj = tasks_dict.get(str(item.get("id")))
            if task_obj and item.get("order") is not None:
                task_obj.order = item["order"]
                tasks_to_update.append(task_obj)

        if tasks_to_update:
            Task.objects.bulk_update(tasks_to_update, ["order"])


class ChecklistService:
    """Service layer for Task Checklist items."""

    @staticmethod
    @transaction.atomic
    def add_item(task, description, actor=None):
        item = TaskChecklistItem.objects.create(
            task=task,
            description=description,
            is_completed=False,
        )
        if actor:
            TaskActivityLog.objects.create(
                task=task,
                actor=actor,
                action=Truncator(
                    str(_("Added checklist item: %(desc)s") % {"desc": description})
                ).chars(255),
            )
        return item

    @staticmethod
    @transaction.atomic
    def toggle_item(item, actor=None):
        item.is_completed = not item.is_completed
        item.save()

        status_str = _("completed") if item.is_completed else _("uncompleted")
        if actor:
            TaskActivityLog.objects.create(
                task=item.task,
                actor=actor,
                action=Truncator(
                    str(
                        _("Marked checklist '%(desc)s' as %(status)s")
                        % {"desc": item.description, "status": status_str}
                    )
                ).chars(255),
            )
        return item

    @staticmethod
    @transaction.atomic
    def delete_item(item, actor=None):
        task = item.task
        desc = item.description
        item.is_deleted = True
        item.save(update_fields=["is_deleted"])

        if actor:
            TaskActivityLog.objects.create(
                task=task,
                actor=actor,
                action=Truncator(str(_("Deleted checklist item: %(desc)s") % {"desc": desc})).chars(
                    255
                ),
            )


class CommentService:
    """Service layer for Task Comments and file attachments."""

    @staticmethod
    @transaction.atomic
    def add_comment(task, author, content, attached_file=None):
        if not content and not attached_file:
            raise ValidationError(
                _("Comment must contain either text content or an attached file.")
            )

        comment = TaskComment.objects.create(
            task=task,
            author=author,
            content=content,
            attached_file=attached_file,
        )

        TaskActivityLog.objects.create(
            task=task,
            actor=author,
            action=Truncator(str(_("Added a comment."))).chars(255),
        )

        return comment


class StandupService:
    """Service layer for Async Standups."""

    @staticmethod
    @transaction.atomic
    def create_standup(user, organization, yesterday_work, today_work, blockers=None):
        if not yesterday_work or not today_work:
            raise ValidationError(_("Both yesterday's work and today's work fields are required."))
        from .models import AsyncStandup

        return AsyncStandup.objects.create(
            user=user,
            organization=organization,
            yesterday_work=yesterday_work,
            today_work=today_work,
            blockers=blockers,
        )

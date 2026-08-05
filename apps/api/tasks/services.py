from django.db import transaction
from django.utils import timezone
from django.utils.text import Truncator
from django.utils.translation import gettext_lazy as _
from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import (
    AsyncStandup,
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
    def create_board(
        title, project, created_by, description=None, background_color=None
    ):
        # Lock existing boards to prevent race condition
        existing_boards = list(
            Board.objects.filter(project=project).select_for_update()
        )
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
                for b in Board.objects.filter(
                    id__in=board_ids, project=project
                ).select_for_update()
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
                    str(
                        _("Reordered boards in project '%(project)s'")
                        % {"project": project.name}
                    )
                ).chars(255),
            )


class TaskStatusService:
    """Service layer for per-board TaskStatus (Kanban Columns) CRUD and reordering."""

    @staticmethod
    @transaction.atomic
    def create_status(board, code, name, order=None, actor=None):
        if order is None:
            existing_statuses = list(
                TaskStatus.objects.filter(board=board).select_for_update()
            )
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
                action=Truncator(
                    str(_("Added status '%(name)s' to board") % {"name": name})
                ).chars(255),
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
                    str(
                        _("Reordered statuses on board '%(board)s'")
                        % {"board": board.title}
                    )
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
    ):
        # Validate that reporter is a project member (unless staff/superuser)
        if (
            project
            and reporter
            and not (
                getattr(reporter, "is_staff", False)
                or getattr(reporter, "is_superuser", False)
            )
        ):
            from projects.models import ProjectMember

            is_member = ProjectMember.objects.filter(
                project=project, user=reporter, is_active=True
            ).exists()
            if not is_member:
                raise PermissionDenied(_("You are not a member of this project."))

        if not status:
            if project:
                status = TaskStatus.objects.filter(
                    board__project=project, code="todo"
                ).first()
                if not status:
                    status = TaskStatus.objects.filter(board__project=project).first()
            if not status:
                raise ValidationError(_("No statuses found for this project."))

        if parent_task and project and parent_task.project != project:
            raise ValidationError(_("Parent task must belong to the same project."))

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
        )

        # Log activity
        TaskActivityLog.objects.create(
            task=task,
            actor=reporter,
            action=str(_("Task created: %(title)s") % {"title": task.title}),
        )

        # Create initial timer for the task automatically
        from attendance.models import TimeLog

        timer_user = assignee if assignee else reporter
        if timer_user and project:
            TimeLog.objects.create(
                user=timer_user,
                task=task,
                project=project,
                date=timezone.now().date(),
                start_time=timezone.now(),
                is_active=True,
            )

        return task

    @staticmethod
    @transaction.atomic
    def update_task(task, actor, **kwargs):
        changes = []
        for field, value in kwargs.items():
            if field not in TaskService.UPDATABLE_FIELDS:
                continue
            old_val = getattr(task, field)
            if old_val != value:
                setattr(task, field, value)
                changes.append(f"{field}: {old_val} -> {value}")

        if changes:
            task.save()
            action_desc = str(_("Updated fields: ")) + ", ".join(changes)
            TaskActivityLog.objects.create(
                task=task,
                actor=actor,
                action=Truncator(action_desc).chars(255),
            )

        return task

    @staticmethod
    @transaction.atomic
    def move_task(task, actor, new_status=None, new_order=None):
        """Handles Drag & Drop movement across Kanban statuses."""
        if task.assignee != actor and not actor.is_staff and not actor.is_superuser:
            role = (
                actor.org_memberships.filter(
                    organization_id=task.project.organization_id
                )
                .values_list("role", flat=True)
                .first()
            )
            if role not in ["owner", "admin", "lead"]:
                from rest_framework.exceptions import PermissionDenied

                raise PermissionDenied(
                    _("Only the assignee or a project manager can move this task.")
                )

        task_code = task.status.code.lower() if task.status and task.status.code else ""
        if task_code == "done" and new_status and task.status != new_status:
            raise ValidationError(
                _(
                    "Task is completed (Done) and locked. It cannot be moved to another status."
                )
            )

        action_parts = []

        changed = False
        if new_status and task.status != new_status:
            if (
                task.project
                and new_status.board
                and new_status.board.project_id != task.project_id
            ):
                raise ValidationError(
                    _("Target status does not belong to the same project.")
                )
            action_parts.append(
                str(_("Status changed to %(st)s") % {"st": new_status.name})
            )
            task.status = new_status
            changed = True

            # Handle timer auto-start/stop
            from attendance.services import TimeLogService

            code = new_status.code.lower() if new_status.code else ""
            if code == "doing":
                # Only start if the actor is the assignee
                if task.assignee == actor:
                    TimeLogService.start_timer(actor, task)
            elif code in ["review", "done"]:
                # Stop timers for anyone working on this task
                from attendance.models import TimeLog

                active_timers = TimeLog.objects.filter(task=task, is_active=True)
                for timer in active_timers:
                    TimeLogService.stop_timer(timer.user, timer.id, auto_move=False)

                if code == "done":
                    # Check if any time was tracked (spent_hours > 0)
                    current_spent = (
                        Task.objects.filter(pk=task.pk)
                        .values_list("spent_hours", flat=True)
                        .first()
                    )
                    if not current_spent or current_spent <= 0:
                        raise ValidationError(
                            {
                                "detail": _(
                                    "Cannot move to Done: No time has been tracked for this task."
                                ),
                                "code": "NEEDS_MANUAL_TIME",
                            }
                        )
                    task.spent_hours = current_spent
                    task.is_finished = True

        if new_order is not None and task.order != new_order:
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
            action=Truncator(
                str(_("Deleted task: %(title)s") % {"title": title})
            ).chars(255),
        )


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
                action=Truncator(
                    str(_("Deleted checklist item: %(desc)s") % {"desc": desc})
                ).chars(255),
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
    def create_standup(user, yesterday_work, today_work, blockers=None):
        if not yesterday_work or not today_work:
            raise ValidationError(
                _("Both yesterday's work and today's work fields are required.")
            )

        return AsyncStandup.objects.create(
            user=user,
            yesterday_work=yesterday_work,
            today_work=today_work,
            blockers=blockers,
        )

from django.db import transaction
from django.utils.translation import gettext_lazy as _
from rest_framework.exceptions import ValidationError

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
        max_order = Board.objects.filter(project=project).count()
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
        for index, (code, name) in enumerate(default_statuses):
            TaskStatus.objects.create(
                board=board,
                code=code,
                name=str(name),
                order=index + 1,
            )

        return board

    @staticmethod
    @transaction.atomic
    def reorder_boards(project, board_orders):
        """
        board_orders: list of dicts [{'id': uuid, 'order': int}, ...]
        """
        for item in board_orders:
            Board.objects.filter(id=item["id"], project=project).update(
                order=item["order"]
            )


class TaskStatusService:
    """Service layer for per-board TaskStatus (Kanban Columns) CRUD and reordering."""

    @staticmethod
    @transaction.atomic
    def create_status(board, code, name, order=None, actor=None):
        if order is None:
            max_order = board.statuses.count()
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
                action=str(_("Added status '%(name)s' to board") % {"name": name}),
            )

        return status_obj

    @staticmethod
    @transaction.atomic
    def delete_status(status_obj, actor=None):
        if Task.objects.filter(status=status_obj).exists():
            raise ValidationError(
                _("Cannot delete status '%(name)s': tasks are still using it.")
                % {"name": status_obj.name}
            )

        board = status_obj.board
        name = status_obj.name
        status_obj.delete()

        if actor:
            TaskActivityLog.objects.create(
                board=board,
                actor=actor,
                action=str(_("Removed status '%(name)s' from board") % {"name": name}),
            )

    @staticmethod
    @transaction.atomic
    def reorder_statuses(board, status_orders, actor=None):
        """
        status_orders: list of dicts [{'id': uuid, 'order': int}, ...]
        """
        for item in status_orders:
            TaskStatus.objects.filter(id=item["id"], board=board).update(
                order=item["order"]
            )

        if actor:
            TaskActivityLog.objects.create(
                board=board,
                actor=actor,
                action=str(
                    _("Reordered statuses on board '%(board)s'")
                    % {"board": board.title}
                ),
            )


class TaskService:
    """Service layer for Task creation, updates, movement, and activity logging."""

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
        if not status:
            if project:
                status = TaskStatus.objects.filter(
                    board__project=project, code="todo"
                ).first()
            if not status:
                status = TaskStatus.objects.filter(code="todo").first()
            if not status:
                raise ValidationError(_("Default status 'todo' does not exist."))

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

        return task

    @staticmethod
    @transaction.atomic
    def update_task(task, actor, **kwargs):
        changes = []
        for field, value in kwargs.items():
            if hasattr(task, field):
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
                action=action_desc[:255],
            )

        return task

    @staticmethod
    @transaction.atomic
    def move_task(task, actor, new_status=None, new_order=None):
        """Handles Drag & Drop movement across Kanban statuses."""
        action_parts = []

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

        if new_order is not None:
            task.order = new_order

        task.save()

        if action_parts:
            TaskActivityLog.objects.create(
                task=task,
                actor=actor,
                action=" | ".join(action_parts)[:255],
            )

        return task

    @staticmethod
    @transaction.atomic
    def delete_task(task, actor):
        """Soft deletes task and logs activity."""
        title = task.title
        board = task.status.board if task.status else None
        task.delete()
        TaskActivityLog.objects.create(
            board=board,
            actor=actor,
            action=str(_("Deleted task: %(title)s") % {"title": title})[:255],
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
                action=str(_("Added checklist item: %(desc)s") % {"desc": description}),
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
                action=str(
                    _("Marked checklist '%(desc)s' as %(status)s")
                    % {"desc": item.description, "status": status_str}
                ),
            )
        return item

    @staticmethod
    @transaction.atomic
    def delete_item(item, actor=None):
        task = item.task
        desc = item.description
        item.delete()

        if actor:
            TaskActivityLog.objects.create(
                task=task,
                actor=actor,
                action=str(_("Deleted checklist item: %(desc)s") % {"desc": desc}),
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
            action=str(_("Added a comment.")),
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

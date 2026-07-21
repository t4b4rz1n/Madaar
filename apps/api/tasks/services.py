from django.db import transaction
from django.utils.translation import gettext_lazy as _
from rest_framework.exceptions import ValidationError

from .models import (
    AsyncStandup,
    Board,
    BoardColumn,
    Task,
    TaskActivityLog,
    TaskChecklistItem,
    TaskComment,
    TaskStatus,
)


class BoardService:
    """Service layer for Kanban Board & Column business logic."""

    @staticmethod
    @transaction.atomic
    def create_board(title, project, created_by):
        board = Board.objects.create(
            title=title,
            project=project,
            created_by=created_by,
        )

        # Create default Kanban columns for the board
        default_columns = [
            _("To Do"),
            _("Doing"),
            _("Review"),
            _("Done"),
        ]
        for index, col_title in enumerate(default_columns):
            BoardColumn.objects.create(
                board=board,
                title=str(col_title),
                order=index + 1,
            )

        return board

    @staticmethod
    @transaction.atomic
    def create_column(board, title, order=None):
        if order is None:
            max_order = board.columns.count()
            order = max_order + 1

        return BoardColumn.objects.create(
            board=board,
            title=title,
            order=order,
        )

    @staticmethod
    @transaction.atomic
    def reorder_columns(board, column_orders):
        """
        column_orders is a list of dicts: [{'id': column_uuid, 'order': 1}, ...]
        """
        for item in column_orders:
            col_id = item.get("id")
            new_order = item.get("order")
            BoardColumn.objects.filter(id=col_id, board=board).update(order=new_order)


class TaskService:
    """Service layer for Task creation, updates, movement, and activity logging."""

    @staticmethod
    @transaction.atomic
    def create_task(
        project,
        title,
        reporter,
        description=None,
        column=None,
        status=None,
        priority=Task.Priority.MEDIUM,
        assignee=None,
        due_date=None,
        estimated_hours=None,
        parent_task=None,
        milestone=None,
    ):
        if not status:
            status = TaskStatus.objects.filter(code="todo").first()
            if not status:
                raise ValidationError(_("Default status 'todo' does not exist."))

        if parent_task and parent_task.project != project:
            raise ValidationError(_("Parent task must belong to the same project."))

        task = Task.objects.create(
            project=project,
            milestone=milestone,
            title=title,
            description=description,
            column=column,
            status=status,
            priority=priority,
            assignee=assignee,
            reporter=reporter,
            due_date=due_date,
            estimated_hours=estimated_hours,
            parent_task=parent_task,
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
            action_desc = _("Updated fields: ") + ", ".join(changes)
            TaskActivityLog.objects.create(
                task=task,
                actor=actor,
                action=action_desc[:255],
            )

        return task

    @staticmethod
    @transaction.atomic
    def move_task(task, actor, new_column=None, new_status=None, new_order=None):
        """Handles Drag & Drop movement across Kanban columns and statuses."""
        action_parts = []

        if new_column and task.column != new_column:
            action_parts.append(str(_("Column changed to %(col)s") % {"col": new_column.title}))
            task.column = new_column

        if new_status and task.status != new_status:
            action_parts.append(str(_("Status changed to %(st)s") % {"st": new_status.name}))
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
            raise ValidationError(_("Both yesterday's work and today's work fields are required."))

        return AsyncStandup.objects.create(
            user=user,
            yesterday_work=yesterday_work,
            today_work=today_work,
            blockers=blockers,
        )

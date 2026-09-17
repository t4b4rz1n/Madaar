from django.db import transaction


class TaskCascadeService:
    @staticmethod
    @transaction.atomic
    def soft_delete_board(board):
        from .models import TaskStatus

        status_ids = list(
            TaskStatus.all_objects.filter(board=board, is_deleted=False).values_list(
                "id", flat=True
            )
        )
        if not status_ids:
            return
        TaskStatus.all_objects.filter(id__in=status_ids).update(is_deleted=True)
        TaskCascadeService._soft_delete_tasks_by_status(status_ids)

    @staticmethod
    @transaction.atomic
    def restore_board(board):
        from .models import TaskStatus

        status_ids = list(
            TaskStatus.all_objects.filter(board=board, is_deleted=True).values_list("id", flat=True)
        )
        if not status_ids:
            return
        TaskStatus.all_objects.filter(id__in=status_ids).update(is_deleted=False)
        TaskCascadeService._restore_tasks_by_status(status_ids)

    @staticmethod
    @transaction.atomic
    def soft_delete_status(status):
        TaskCascadeService._soft_delete_tasks_by_status([status.id])

    @staticmethod
    @transaction.atomic
    def restore_status(status):
        TaskCascadeService._restore_tasks_by_status([status.id])

    @staticmethod
    @transaction.atomic
    def _soft_delete_tasks_by_status(status_ids):
        from .models import Task

        task_ids = list(
            Task.all_objects.filter(status_id__in=status_ids, is_deleted=False).values_list(
                "id", flat=True
            )
        )
        if not task_ids:
            return
        Task.all_objects.filter(id__in=task_ids).update(is_deleted=True)
        TaskCascadeService._soft_delete_task_children(task_ids)

    @staticmethod
    @transaction.atomic
    def _restore_tasks_by_status(status_ids):
        from .models import Task

        task_ids = list(
            Task.all_objects.filter(status_id__in=status_ids, is_deleted=True).values_list(
                "id", flat=True
            )
        )
        if not task_ids:
            return
        Task.all_objects.filter(id__in=task_ids).update(is_deleted=False)
        TaskCascadeService._restore_task_children(task_ids)

    @staticmethod
    @transaction.atomic
    def soft_delete_task(task):
        TaskCascadeService._soft_delete_task_children([task.id])

    @staticmethod
    @transaction.atomic
    def restore_task(task):
        TaskCascadeService._restore_task_children([task.id])

    @staticmethod
    @transaction.atomic
    def _soft_delete_task_children(task_ids, depth=0):
        if depth > 10 or not task_ids:
            return
        from .models import Task, TaskChecklistItem, TaskComment

        subtask_ids = list(
            Task.all_objects.filter(parent_task_id__in=task_ids, is_deleted=False).values_list(
                "id", flat=True
            )
        )
        if subtask_ids:
            Task.all_objects.filter(id__in=subtask_ids).update(is_deleted=True)
            TaskCascadeService._soft_delete_task_children(subtask_ids, depth + 1)
        TaskChecklistItem.all_objects.filter(task_id__in=task_ids, is_deleted=False).update(
            is_deleted=True
        )
        TaskComment.all_objects.filter(task_id__in=task_ids, is_deleted=False).update(
            is_deleted=True
        )

    @staticmethod
    @transaction.atomic
    def _restore_task_children(task_ids, depth=0):
        if depth > 10 or not task_ids:
            return
        from .models import Task, TaskChecklistItem, TaskComment

        subtask_ids = list(
            Task.all_objects.filter(parent_task_id__in=task_ids, is_deleted=True).values_list(
                "id", flat=True
            )
        )
        if subtask_ids:
            Task.all_objects.filter(id__in=subtask_ids).update(is_deleted=False)
            TaskCascadeService._restore_task_children(subtask_ids, depth + 1)
        TaskChecklistItem.all_objects.filter(task_id__in=task_ids, is_deleted=True).update(
            is_deleted=False
        )
        TaskComment.all_objects.filter(task_id__in=task_ids, is_deleted=True).update(
            is_deleted=False
        )

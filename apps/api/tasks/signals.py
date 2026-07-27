from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import Task, TaskChecklistItem


@receiver(post_save, sender=TaskChecklistItem)
@receiver(post_delete, sender=TaskChecklistItem)
def update_task_progress_on_checklist_change(sender, instance, **kwargs):
    if instance.task_id:
        task = Task.all_objects.filter(id=instance.task_id).first()
        _update_task_progress_cache(task)


@receiver(post_save, sender=Task)
@receiver(post_delete, sender=Task)
def update_parent_task_progress(sender, instance, **kwargs):
    if instance.parent_task_id:
        parent_task = Task.all_objects.filter(id=instance.parent_task_id).first()
        _update_task_progress_cache(parent_task)


def _update_task_progress_cache(task, depth=0):
    if not task or depth > 10:
        return

    new_progress = task._progress_percent_internal()

    if float(task.progress_cache) != float(new_progress):
        task.progress_cache = new_progress
        Task.objects.filter(pk=task.pk).update(progress_cache=new_progress)

        if task.parent_task_id:
            parent = Task.all_objects.filter(id=task.parent_task_id).first()
            _update_task_progress_cache(parent, depth + 1)

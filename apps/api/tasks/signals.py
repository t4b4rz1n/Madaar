from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver
import re
from django.contrib.auth import get_user_model

from .models import Task, TaskChecklistItem, TaskComment, AsyncStandup
from automations.events import EventDispatcher

User = get_user_model()

@receiver(post_save, sender=TaskChecklistItem)
@receiver(post_delete, sender=TaskChecklistItem)
def update_task_progress_on_checklist_change(sender, instance, **kwargs):
    if instance.task_id:
        task = Task.all_objects.filter(id=instance.task_id).first()
        _update_task_progress_cache(task)


@receiver(pre_save, sender=Task)
def cache_previous_task_state(sender, instance, **kwargs):
    if instance.pk:
        try:
            old = Task.objects.get(pk=instance.pk)
            instance.__original_assignee_id = old.assignee_id
            instance.__original_status_code = old.status.code if old.status else None
            instance.__original_is_finished = old.is_finished
        except Task.DoesNotExist:
            pass

@receiver(post_save, sender=Task)
@receiver(post_delete, sender=Task)
def update_parent_task_progress(sender, instance, **kwargs):
    _update_task_progress_cache(instance)
    if instance.parent_task_id:
        parent_task = Task.all_objects.filter(id=instance.parent_task_id).first()
        _update_task_progress_cache(parent_task)


@receiver(post_save, sender=Task)
def handle_task_automations(sender, instance, created, **kwargs):
    old_assignee = getattr(instance, "__original_assignee_id", None)
    old_status = getattr(instance, "__original_status_code", None)
    old_finished = getattr(instance, "__original_is_finished", None)
    
    # 7. task_assigned
    # Trigger if created with an assignee, OR if assignee was changed
    if instance.assignee_id and (created or old_assignee != instance.assignee_id):
        assigner = "سیستم" # Can be extracted if we have request context, but hard to get in signals
        EventDispatcher.dispatch(
            event_type="task_assigned",
            payload={
                "target_user_id": str(instance.assignee_id),
                "task_title": instance.title,
                "assigner": assigner
            }
        )
        
    if not created:
            
        # 8. task_needs_review
        if instance.status and instance.status.code == 'review' and old_status != 'review':
            if instance.reporter_id:
                EventDispatcher.dispatch(
                    event_type="task_needs_review",
                    payload={
                        "target_user_id": str(instance.reporter_id),
                        "task_title": instance.title,
                        "assignee": instance.assignee.get_full_name() if instance.assignee else "کاربر"
                    }
                )
                
        # 9. task_completed
        if instance.is_finished and not old_finished:
            target_ids = []
            if instance.reporter_id:
                target_ids.append(str(instance.reporter_id))
            if instance.assignee_id:
                target_ids.append(str(instance.assignee_id))
                
            if target_ids:
                EventDispatcher.dispatch(
                    event_type="task_completed",
                    payload={
                        "target_user_ids": list(set(target_ids)),
                        "task_title": instance.title
                    }
                )

@receiver(post_save, sender=TaskComment)
def handle_task_comments(sender, instance, created, **kwargs):
    """
    11. user_mentioned
    12. task_commented
    """
    if created:
        task = instance.task
        author_name = instance.author.get_full_name() or instance.author.username if instance.author else "یک کاربر"
        content = instance.content
        
        # Parse mentions (@username)
        mentioned_usernames = re.findall(r'@([\w.-]+)', content)
        mentioned_users = []
        if mentioned_usernames:
            mentioned_users = list(User.objects.filter(username__in=mentioned_usernames).values_list('id', flat=True))
            
            for uid in mentioned_users:
                # Don't notify the author if they mention themselves
                if instance.author and str(uid) == str(instance.author.id):
                    continue
                EventDispatcher.dispatch(
                    event_type="user_mentioned",
                    payload={
                        "target_user_id": str(uid),
                        "task_title": task.title,
                        "author": author_name,
                        "comment_text": f"{author_name} شما را تگ کرد: {content[:50]}..."
                    }
                )
                
        # General comment notification (task_commented)
        target_ids = []
        if task.assignee_id:
            target_ids.append(task.assignee_id)
        if task.reporter_id:
            target_ids.append(task.reporter_id)
            
        # Exclude author and mentioned users from generic notification to avoid spam
        final_targets = [str(tid) for tid in set(target_ids) if tid not in mentioned_users and (not instance.author or tid != instance.author.id)]
        
        if final_targets:
            EventDispatcher.dispatch(
                event_type="task_commented",
                payload={
                    "target_user_ids": final_targets,
                    "task_title": task.title,
                    "author": author_name
                }
            )

@receiver(post_save, sender=AsyncStandup)
def handle_standup_submitted(sender, instance, created, **kwargs):
    """
    13. standup_submitted
    """
    if created:
        user_name = instance.user.get_full_name() or instance.user.username if instance.user else "یک همکار"
        # Notify admins or organization owner (simplified to just get org owner/admins if available)
        # For now, let's dispatch to a generic channel or org owner. 
        # If organization has no explicit owner field, we just skip targeting a specific user or use a general rule.
        # Let's find any user in the same org who is a superuser or manager.
        managers = User.objects.filter(is_superuser=True).values_list('id', flat=True)
        if managers:
            EventDispatcher.dispatch(
                event_type="standup_submitted",
                payload={
                    "target_user_ids": [str(m) for m in managers],
                    "user_name": user_name
                }
            )

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

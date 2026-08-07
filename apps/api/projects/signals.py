from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import ProjectMember
from automations.events import EventDispatcher

@receiver(post_save, sender=ProjectMember)
def notify_project_member_added(sender, instance, created, **kwargs):
    """
    When a user is added to a project (ProjectMember is created),
    dispatch a project_created event so they get notified.
    """
    if created:
        project = instance.project
        creator_name = project.owner.get_full_name() or project.owner.username if project.owner else "System"
        
        # We dispatch event with target_user_id specifically for this member
        EventDispatcher.dispatch(
            event_type="project_created",
            payload={
                "target_user_id": str(instance.user.id),
                "project_title": project.name,
                "creator_name": creator_name
            }
        )

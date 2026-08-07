from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import Milestone
from automations.events import EventDispatcher

@shared_task
def check_approaching_milestones():
    """
    Checks for milestones that are exactly 48 hours away from their target_date
    and dispatches the milestone_approaching event.
    Designed to be run daily via Celery Beat (e.g., at 08:00 AM).
    """
    now = timezone.now().date()
    target = now + timedelta(days=2)
    
    approaching_milestones = Milestone.objects.filter(
        target_date=target,
        status__in=[Milestone.Status.PENDING, Milestone.Status.IN_PROGRESS]
    )
    
    for milestone in approaching_milestones:
        project = milestone.project
        if project.owner_id:
            EventDispatcher.dispatch(
                event_type="milestone_approaching",
                payload={
                    "target_user_id": str(project.owner_id),
                    "project_name": project.name,
                    "milestone_title": milestone.title
                }
            )

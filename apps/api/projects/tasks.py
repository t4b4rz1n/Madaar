from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from automations.events import EventDispatcher

from .models import Milestone


@shared_task
def check_approaching_milestones():
    """
    Checks for milestones that are exactly 48 hours away from their target_date
    and dispatches the milestone_approaching event.
    Designed to be run daily via Celery Beat (e.g., at 08:00 AM).
    """
    now = timezone.now().date()
    target = now + timedelta(days=2)

    approaching_milestones = Milestone.objects.select_related("project").filter(
        target_date=target,
        status__in=[Milestone.Status.PENDING, Milestone.Status.IN_PROGRESS],
        is_deleted=False,
    )

    for milestone in approaching_milestones:
        project = milestone.project
        EventDispatcher.dispatch(
            event_type="milestone_approaching",
            payload={
                "project_id": str(project.id),
                "project_name": project.name,
                "milestone_title": milestone.title,
                "organization_id": str(project.organization_id),
            },
        )

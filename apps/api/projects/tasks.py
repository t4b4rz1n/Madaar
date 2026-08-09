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

    approaching_milestones = Milestone.objects.filter(
        target_date=target,
        status__in=[Milestone.Status.PENDING, Milestone.Status.IN_PROGRESS]
    )

    for milestone in approaching_milestones:
        project = milestone.project
        target_ids = []
        if project.owner_id:
            target_ids.append(str(project.owner_id))

        from organizations.models import OrganizationMembership
        team_leads = OrganizationMembership.objects.filter(
            organization_id=project.organization_id,
            role=OrganizationMembership.Role.TEAM_LEAD
        ).values_list('user_id', flat=True)
        target_ids.extend([str(tl) for tl in team_leads])

        if target_ids:
            EventDispatcher.dispatch(
                event_type="milestone_approaching",
                payload={
                    "target_user_ids": list(set(target_ids)),
                    "project_name": project.name,
                    "milestone_title": milestone.title
                }
            )

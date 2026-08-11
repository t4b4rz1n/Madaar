from django.contrib.auth import get_user_model
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from automations.events import EventDispatcher

from .models import Attendance, TimeLog, TimeOffRequest

User = get_user_model()


@receiver(pre_save, sender=TimeOffRequest)
def cache_previous_timeoff_state(sender, instance, **kwargs):
    if instance.pk:
        try:
            old = TimeOffRequest.objects.get(pk=instance.pk)
            instance.__original_status = old.status
        except TimeOffRequest.DoesNotExist:
            instance.__original_status = None
    else:
        instance.__original_status = None


@receiver(post_save, sender=TimeOffRequest)
def handle_approved_timeoff(sender, instance, created, **kwargs):
    # Original logic for updating Attendance on Approved
    if not hasattr(instance, "_signal_processed"):
        if instance.status == TimeOffRequest.Status.APPROVED:
            date = instance.start_datetime.date()
            duration = (instance.end_datetime - instance.start_datetime).total_seconds() / 60

            attendance, _ = Attendance.objects.get_or_create(
                user=instance.user,
                date=date,
                defaults={"organization": instance.organization},
            )

            if instance.request_type == TimeOffRequest.Type.OVERTIME:
                attendance.overtime_minutes = int(attendance.overtime_minutes) + int(duration)
            elif instance.request_type in [
                TimeOffRequest.Type.VACATION,
                TimeOffRequest.Type.SICK,
                TimeOffRequest.Type.HOURLY,
            ]:
                # Custom logic for leaves. Can be tracking absent minutes or leaving it as is.
                pass

            instance._signal_processed = True
            attendance.save(update_fields=["overtime_minutes"])

    # New Event Automations
    user_name = instance.user.get_full_name() or instance.user.username
    leave_type_label = instance.get_request_type_display()

    if created:
        # 14. leave_requested
        # Target: Organization Owners and Admins
        from organizations.models import OrganizationMembership

        managers = OrganizationMembership.objects.filter(
            organization=instance.organization,
            role__in=[OrganizationMembership.Role.OWNER, OrganizationMembership.Role.ADMIN],
        ).values_list("user_id", flat=True)

        if managers:
            EventDispatcher.dispatch(
                event_type="leave_requested",
                payload={
                    "target_user_ids": [str(m) for m in managers],
                    "organization_id": str(instance.organization_id),
                    "user_name": user_name,
                    "leave_type": leave_type_label,
                },
            )
    else:
        # 15. leave_resolved
        old_status = getattr(instance, "__original_status", None)
        if old_status == TimeOffRequest.Status.PENDING and instance.status in [
            TimeOffRequest.Status.APPROVED,
            TimeOffRequest.Status.REJECTED,
        ]:
            status_label = instance.get_status_display()
            EventDispatcher.dispatch(
                event_type="leave_resolved",
                payload={
                    "target_user_id": str(instance.user_id),
                    "requester_id": str(instance.user_id),
                    "status": status_label,
                },
            )


@receiver(post_save, sender=TimeLog)
def notify_timer_started(sender, instance, created, **kwargs):
    """
    16. timer_started
    """
    if created and instance.is_active:
        user_name = instance.user.get_full_name() or instance.user.username
        task_title = instance.task.title if instance.task else "کار عمومی"

        managers = []
        if instance.task and instance.task.project:
            org_id = instance.task.project.organization_id
            from organizations.models import OrganizationMembership

            managers = OrganizationMembership.objects.filter(
                organization_id=org_id,
                role__in=[
                    OrganizationMembership.Role.OWNER,
                    OrganizationMembership.Role.ADMIN,
                    OrganizationMembership.Role.TEAM_LEAD,
                ],
            ).values_list("user_id", flat=True)

        if managers:
            EventDispatcher.dispatch(
                event_type="timer_started",
                payload={
                    "target_user_ids": [str(m) for m in set(managers)],
                    "project_id": str(instance.task.project_id)
                    if instance.task and instance.task.project_id
                    else None,
                    "user_name": user_name,
                    "task_title": task_title,
                },
            )

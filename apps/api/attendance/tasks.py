from celery import shared_task
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from .models import AttendanceSetting


@shared_task
def process_midnight_attendance_rollover(attendance_id):
    """
    Called precisely at the user's local midnight.
    Closes the current session and instantly starts a new one for the next day.
    """
    from .models import Attendance
    from .services import AttendanceService

    with transaction.atomic():
        try:
            att = Attendance.objects.get(id=attendance_id, is_deleted=False)
        except Attendance.DoesNotExist:
            return "Attendance not found"

        active_session = att.sessions.filter(end_time__isnull=True, is_deleted=False).first()
        if not active_session:
            return "No active session to rollover"

        # Close the active session exactly at the moment it runs (which is midnight)
        now = timezone.now()
        active_session.end_time = now
        delta = active_session.end_time - active_session.start_time
        active_session.duration_seconds = int(delta.total_seconds())
        active_session.save(update_fields=["end_time", "duration_seconds"])

        att.check_out = now
        total_duration_seconds = att.sessions.aggregate(total=Sum("duration_seconds"))["total"] or 0

        setting = AttendanceSetting.objects.filter(organization=att.organization).first()
        expected_hours = float(setting.expected_daily_hours) if setting else 8.0
        expected_seconds = expected_hours * 3600.0

        if total_duration_seconds > expected_seconds:
            att.overtime_minutes = int((total_duration_seconds - expected_seconds) // 60)
        else:
            att.overtime_minutes = 0

        att.save(update_fields=["check_out", "overtime_minutes"])

    # Start a new attendance for the new day
    AttendanceService.check_in(att.user, att.organization, timezone_str=att.timezone)

    return f"Rollover completed for Attendance {attendance_id}"

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import TimeOffRequest, Attendance, AttendanceSetting

@receiver(post_save, sender=TimeOffRequest)
def handle_approved_timeoff(sender, instance, created, **kwargs):
    # Prevent recursive saves if any
    if not hasattr(instance, '_signal_processed'):
        if instance.status == TimeOffRequest.Status.APPROVED:
            date = instance.start_datetime.date()
            duration = (instance.end_datetime - instance.start_datetime).total_seconds() / 60
            
            attendance, _ = Attendance.objects.get_or_create(
                user=instance.user,
                date=date,
                defaults={'organization': instance.organization}
            )

            if instance.request_type == TimeOffRequest.Type.OVERTIME:
                attendance.overtime_minutes = int(attendance.overtime_minutes) + int(duration)
            elif instance.request_type in [TimeOffRequest.Type.VACATION, TimeOffRequest.Type.SICK, TimeOffRequest.Type.HOURLY]:
                # Custom logic for leaves. Can be tracking absent minutes or leaving it as is.
                pass
                
            instance._signal_processed = True
            attendance.save(update_fields=['overtime_minutes'])


@receiver(post_save, sender=Attendance)
def calculate_auto_overtime(sender, instance, created, **kwargs):
    if not hasattr(instance, '_overtime_calculated'):
        if instance.check_out and instance.check_in:
            setting = AttendanceSetting.objects.filter(organization=instance.organization).first()
            if setting:
                duration = (instance.check_out - instance.check_in).total_seconds() / 3600.0
                expected = float(setting.expected_daily_hours)
                
                # Check if it exceeds expected hours
                if duration > expected:
                    auto_overtime = int((duration - expected) * 60)
                    if instance.overtime_minutes < auto_overtime:
                        instance.overtime_minutes = auto_overtime
                        instance._overtime_calculated = True
                        instance.save(update_fields=['overtime_minutes'])

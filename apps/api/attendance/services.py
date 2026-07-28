import datetime
from django.db import transaction
from django.utils import timezone
from django.db.models import Sum, F, Q
from django.db.models.functions import TruncDate
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.utils.translation import gettext_lazy as _

from .models import Attendance, TimeLog, TimeOffRequest, Holiday, AttendanceSetting
from tasks.models import Task, TaskStatus

class AttendanceService:
    @staticmethod
    @transaction.atomic
    def check_in(user, organization):
        today = timezone.localdate()
        attendance, created = Attendance.objects.get_or_create(
            user=user, date=today,
            defaults={'organization': organization, 'check_in': timezone.now()}
        )
        if not created and not attendance.check_in:
            attendance.check_in = timezone.now()
            attendance.save(update_fields=['check_in'])
        return attendance, created

    @staticmethod
    @transaction.atomic
    def check_out(user):
        today = timezone.localdate()
        attendance = Attendance.objects.filter(user=user, date=today).first()
        if not attendance:
            raise ValidationError(_("No check-in record found for today."))
        if attendance.check_out:
            raise ValidationError(_("Already checked out today."))

        attendance.check_out = timezone.now()
        
        # Stop any active timers
        active_timer = TimeLogService.get_active_timer(user)
        if active_timer and active_timer.id:
            TimeLogService.stop_timer(user, active_timer.id)

        # Auto calculate overtime if setting exists
        setting = AttendanceSetting.objects.filter(organization=attendance.organization).first()
        if setting and attendance.check_in:
            duration = (attendance.check_out - attendance.check_in).total_seconds() / 3600.0
            expected = float(setting.expected_daily_hours)
            if duration > expected:
                attendance.overtime_minutes = int((duration - expected) * 60)

        attendance.save(update_fields=['check_out', 'overtime_minutes'])
        return attendance

    @staticmethod
    def get_today_attendance(user):
        return Attendance.objects.filter(user=user, date=timezone.localdate()).first()

    @staticmethod
    def get_user_attendance(user, start_date, end_date):
        return Attendance.objects.select_related("user", "organization").filter(user=user, date__range=(start_date, end_date))

    @staticmethod
    @transaction.atomic
    def save_manual_attendance(user, data, instance=None):
        if instance:
            for attr, value in data.items():
                setattr(instance, attr, value)
        else:
            instance = Attendance(user=user, **data)
        
        # Recalculate overtime
        if instance.check_in and instance.check_out:
            setting = AttendanceSetting.objects.filter(organization=instance.organization).first()
            if setting:
                duration = (instance.check_out - instance.check_in).total_seconds() / 3600.0
                expected = float(setting.expected_daily_hours)
                if duration > expected:
                    instance.overtime_minutes = int((duration - expected) * 60)
                else:
                    instance.overtime_minutes = 0
                    
        instance.save()
        return instance


class TimeLogService:
    @staticmethod
    @transaction.atomic
    def start_timer(user, task):
        # Anti-fraud check: only assignee can start timer
        if task.assignee != user:
            raise PermissionDenied(_("You can only start a timer for tasks assigned to you."))
        
        # Stop existing active timer
        active = TimeLogService.get_active_timer(user)
        if active and active.id:
            TimeLogService.stop_timer(user, active.id)

        now = timezone.now()
        timer = TimeLog.objects.create(
            user=user,
            task=task,
            project=task.project,
            date=now.date(),
            start_time=now,
            is_active=True
        )

        # Auto-move task to Doing if it's not already in Doing
        if task.status and task.status.code.lower() != 'doing':
            doing_status = TaskStatus.objects.filter(board=task.status.board, code__iexact='doing').first()
            if doing_status:
                from tasks.services import TaskService
                TaskService.move_task(task, user, new_status=doing_status)
                
        # Log activity
        from tasks.models import TaskActivityLog
        TaskActivityLog.objects.create(
            task=task, board=task.status.board if task.status else None, 
            actor=user, action="Started time tracking timer"
        )
                
        return timer

    @staticmethod
    @transaction.atomic
    def stop_timer(user, log_id):
        timer = TimeLog.objects.filter(id=log_id, user=user, is_active=True).first()
        if not timer:
            raise ValidationError(_("Timer not found or already stopped."))

        timer.end_time = timezone.now()
        timer.duration_seconds = int((timer.end_time - timer.start_time).total_seconds())
        timer.is_active = False
        timer.save(update_fields=['end_time', 'duration_seconds', 'is_active'])

        timer.task.spent_hours = float(timer.task.spent_hours) + (timer.duration_seconds / 3600.0)
        timer.task.save(update_fields=['spent_hours'])

        # Log activity
        from tasks.models import TaskActivityLog
        TaskActivityLog.objects.create(
            task=timer.task, board=timer.task.status.board if timer.task.status else None, 
            actor=user, action=f"Stopped timer after {timer.duration_seconds} seconds"
        )
        return timer

    @staticmethod
    @transaction.atomic
    def create_manual_log(user, task, start_time, end_time, description=""):
        duration_seconds = int((end_time - start_time).total_seconds())
        if duration_seconds < 0:
            raise ValidationError(_("End time must be after start time."))

        log = TimeLog.objects.create(
            user=user,
            task=task,
            project=task.project,
            date=start_time.date(),
            start_time=start_time,
            end_time=end_time,
            duration_seconds=duration_seconds,
            is_active=False,
            description=description
        )
        task.spent_hours = float(task.spent_hours) + (duration_seconds / 3600.0)
        task.save(update_fields=['spent_hours'])
        return log

    @staticmethod
    def get_active_timer(user):
        return TimeLog.objects.filter(user=user, is_active=True).first()

    @staticmethod
    @transaction.atomic
    def cancel_timer(user, log_id):
        timer = TimeLog.objects.filter(id=log_id, user=user).first()
        if not timer:
            raise ValidationError(_("Time log not found."))
        
        # Revert task spent hours if it was finished
        if not timer.is_active:
            timer.task.spent_hours = max(0, float(timer.task.spent_hours) - (timer.duration_seconds / 3600.0))
            timer.task.save(update_fields=['spent_hours'])
        
        
        timer.is_deleted = True
        timer.is_active = False
        timer.duration_seconds = 0
        timer.save(update_fields=['is_deleted', 'is_active', 'duration_seconds'])
        return timer


class TimeOffRequestService:
    @staticmethod
    @transaction.atomic
    def create_request(user, organization, request_type, start_dt, end_dt, reason=""):
        return TimeOffRequest.objects.create(
            user=user,
            organization=organization,
            request_type=request_type,
            start_datetime=start_dt,
            end_datetime=end_dt,
            reason=reason
        )

    @staticmethod
    @transaction.atomic
    def approve(request_id, manager):
        req = TimeOffRequest.objects.get(id=request_id)
        
        # Check permissions explicitly in service
        if not manager.is_staff and not manager.is_superuser:
            role = manager.org_memberships.filter(organization_id=req.organization_id).values_list("role", flat=True).first()
            if role not in ["owner", "admin", "lead"]:
                raise PermissionDenied(_("You do not have permission to approve requests in this organization."))
            
        if req.status != TimeOffRequest.Status.PENDING:
            raise ValidationError(_("Only pending requests can be approved."))
        req.status = TimeOffRequest.Status.APPROVED
        req.approved_by = manager
        req.save(update_fields=['status', 'approved_by'])
        return req

    @staticmethod
    @transaction.atomic
    def reject(request_id, manager, note=""):
        req = TimeOffRequest.objects.get(id=request_id)
        
        # Check permissions explicitly in service
        if not manager.is_staff and not manager.is_superuser:
            role = manager.org_memberships.filter(organization_id=req.organization_id).values_list("role", flat=True).first()
            if role not in ["owner", "admin", "lead"]:
                raise PermissionDenied(_("You do not have permission to reject requests in this organization."))
            
        if req.status != TimeOffRequest.Status.PENDING:
            raise ValidationError(_("Only pending requests can be rejected."))
        req.status = TimeOffRequest.Status.REJECTED
        req.manager_note = note
        req.save(update_fields=['status', 'manager_note'])
        return req

    @staticmethod
    @transaction.atomic
    def cancel(user, request_id):
        req = TimeOffRequest.objects.get(id=request_id, user=user)
        if req.status != TimeOffRequest.Status.PENDING:
            raise ValidationError(_("Only pending requests can be cancelled."))
        req.is_deleted = True
        req.save(update_fields=['is_deleted'])
        return req

    @staticmethod
    def get_pending_requests(organization):
        return TimeOffRequest.objects.filter(
            organization=organization, status=TimeOffRequest.Status.PENDING
        )


class HolidayService:
    @staticmethod
    def create(name, date, is_official=True):
        return Holiday.objects.create(name=name, date=date, is_official=is_official)

    @staticmethod
    def get_year_holidays(year):
        return Holiday.objects.filter(date__year=year)

    @staticmethod
    @transaction.atomic
    def delete(holiday_id):
        holiday = Holiday.objects.filter(id=holiday_id).first()
        if holiday:
            holiday.delete()


class TimesheetService:
    @staticmethod
    def _aggregate(qs):
        return qs.values('date').annotate(total_seconds=Sum('duration_seconds')).order_by('date')

    @staticmethod
    def get_daily(user, date):
        return TimeLog.objects.filter(user=user, date=date).aggregate(total_seconds=Sum('duration_seconds'))

    @staticmethod
    def get_weekly(user, week_start_date):
        week_end_date = week_start_date + datetime.timedelta(days=6)
        qs = TimeLog.objects.filter(user=user, date__range=(week_start_date, week_end_date))
        return TimesheetService._aggregate(qs)

    @staticmethod
    def get_monthly(user, year, month):
        qs = TimeLog.objects.filter(user=user, date__year=year, date__month=month)
        return TimesheetService._aggregate(qs)

    @staticmethod
    def get_team_timesheet(manager, organization, start_date, end_date):
        managed_teams = list(manager.team_memberships.filter(
            role="lead", team__organization=organization
        ).values_list("team_id", flat=True))

        qs = TimeLog.objects.filter(
            user__team_memberships__team_id__in=managed_teams,
            task__project__organization=organization,
            date__range=(start_date, end_date)
        )
        return qs.values('user__username', 'date').annotate(total_seconds=Sum('duration_seconds')).order_by('user__username', 'date')

    @staticmethod
    def get_project_timesheet(project, start_date, end_date):
        qs = TimeLog.objects.filter(project=project, date__range=(start_date, end_date))
        return qs.values('user__username', 'date').annotate(total_seconds=Sum('duration_seconds')).order_by('user__username', 'date')

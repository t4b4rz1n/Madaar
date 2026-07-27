from django.db import transaction
from django.utils import timezone
from .models import TimeLog, Attendance, TimeOffRequest
from tasks.models import TaskStatus

class TimeLogService:
    """Service for handling live timers and manual time entries."""
    
    @staticmethod
    @transaction.atomic
    def start_timer(user, task):
        # Stop any active timer for this user
        active_timer = TimeLog.objects.filter(user=user, is_active=True).first()
        if active_timer:
            TimeLogService.stop_timer(user, active_timer.task)
        
        # Create new timer
        timer = TimeLog.objects.create(
            user=user,
            task=task,
            start_time=timezone.now(),
            is_active=True
        )

        # If task is in 'todo', move to 'doing'
        if task.status and task.status.code.lower() == 'todo':
            doing_status = TaskStatus.objects.filter(board=task.status.board, code__iexact='doing').first()
            if doing_status:
                from tasks.services import TaskService
                TaskService.move_task(task, user, new_status=doing_status)
                
        return timer

    @staticmethod
    @transaction.atomic
    def stop_timer(user, task):
        timer = TimeLog.objects.filter(user=user, task=task, is_active=True).first()
        if timer:
            timer.end_time = timezone.now()
            timer.duration_seconds = int((timer.end_time - timer.start_time).total_seconds())
            timer.is_active = False
            timer.save(update_fields=['end_time', 'duration_seconds', 'is_active'])
            
            # Add to spent_hours on task
            task.spent_hours = float(task.spent_hours) + (timer.duration_seconds / 3600.0)
            task.save(update_fields=['spent_hours'])
        return timer


class AttendanceService:
    """Service for handling check-in, check-out and attendance logic."""
    @staticmethod
    @transaction.atomic
    def check_in(user):
        today = timezone.localdate()
        attendance, created = Attendance.objects.get_or_create(
            user=user, date=today,
            defaults={'check_in': timezone.now()}
        )
        if not created and not attendance.check_in:
            attendance.check_in = timezone.now()
            attendance.save(update_fields=['check_in'])
        return attendance

    @staticmethod
    @transaction.atomic
    def check_out(user):
        today = timezone.localdate()
        attendance = Attendance.objects.filter(user=user, date=today).first()
        if attendance and not attendance.check_out:
            attendance.check_out = timezone.now()
            attendance.save(update_fields=['check_out'])
            
            # Stop any active timer
            active_timer = TimeLog.objects.filter(user=user, is_active=True).first()
            if active_timer:
                TimeLogService.stop_timer(user, active_timer.task)
                
        return attendance


class TimeOffService:
    """Service for handling leave requests and remote work requests."""
    pass

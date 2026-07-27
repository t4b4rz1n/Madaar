from django.db import models
from django.utils.translation import gettext_lazy as _
from django.conf import settings
from django.db.models import Q
from common.models import BaseModel


class TimeLog(BaseModel):
    """
    ثبت زمانِ کار روی تسک‌ها (تایمر زنده یا ثبت دستی)
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="time_logs"
    )
    task = models.ForeignKey(
        "tasks.Task", on_delete=models.CASCADE, related_name="time_logs"
    )
    start_time = models.DateTimeField(_("Start Time"), db_index=True)
    end_time = models.DateTimeField(_("End Time"), null=True, blank=True)
    duration_seconds = models.PositiveIntegerField(_("Duration in Seconds"), default=0)
    is_active = models.BooleanField(_("Is Active Timer"), default=True, db_index=True)
    description = models.TextField(_("Description"), blank=True)

    class Meta:
        verbose_name = _("Time Log")
        verbose_name_plural = _("Time Logs")
        indexes = [
            models.Index(fields=["user", "is_active"]),
            models.Index(fields=["task", "is_active"]),
        ]
        constraints = [
            # جلوگیری از داشتن بیش از یک تایمر فعال برای یک کاربر در یک لحظه
            models.UniqueConstraint(
                fields=["user"],
                condition=Q(is_active=True, is_deleted=False),
                name="unique_active_timer_per_user"
            )
        ]

    def __str__(self):
        return f"{self.user} - Task: {self.task_id} ({'Active' if self.is_active else 'Stopped'})"


class Attendance(BaseModel):
    """
    ثبت ورود و خروج روزانه (حضور و غیاب)
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="attendances"
    )
    date = models.DateField(_("Date"), db_index=True)
    check_in = models.DateTimeField(_("Check-in Time"), null=True, blank=True)
    check_out = models.DateTimeField(_("Check-out Time"), null=True, blank=True)
    is_remote = models.BooleanField(_("Is Remote Work"), default=False)

    class Meta:
        verbose_name = _("Attendance")
        verbose_name_plural = _("Attendances")
        constraints = [
            models.UniqueConstraint(
                fields=["user", "date"], 
                condition=Q(is_deleted=False),
                name="unique_daily_attendance"
            )
        ]

    def __str__(self):
        return f"{self.user} - {self.date}"


class TimeOffRequest(BaseModel):
    """
    مدیریت جامع درخواست‌های مرخصی و دورکاری
    """
    class Type(models.TextChoices):
        VACATION = "vacation", _("Vacation (Daily)")
        SICK = "sick", _("Sick Leave")
        HOURLY = "hourly", _("Hourly Leave")
        REMOTE = "remote", _("Remote Work Request")

    class Status(models.TextChoices):
        PENDING = "pending", _("Pending")
        APPROVED = "approved", _("Approved")
        REJECTED = "rejected", _("Rejected")

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="timeoff_requests"
    )
    request_type = models.CharField(_("Request Type"), max_length=20, choices=Type.choices)
    start_datetime = models.DateTimeField(_("Start Date/Time"))
    end_datetime = models.DateTimeField(_("End Date/Time"))
    reason = models.TextField(_("Reason"), blank=True)
    status = models.CharField(
        _("Status"), max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_timeoffs"
    )

    class Meta:
        verbose_name = _("Time Off Request")
        verbose_name_plural = _("Time Off Requests")
        indexes = [
            models.Index(fields=["user", "status"]),
        ]

    def __str__(self):
        return f"{self.user} - {self.request_type} ({self.status})"


class Holiday(BaseModel):
    """
    تقویم تعطیلات رسمی جهت تاثیر در محاسبات ددلاین و حقوق
    """
    name = models.CharField(_("Holiday Name"), max_length=255)
    date = models.DateField(_("Date"), unique=True, db_index=True)
    is_official = models.BooleanField(_("Is Official Holiday"), default=True)

    class Meta:
        verbose_name = _("Holiday")
        verbose_name_plural = _("Holidays")
        ordering = ["-date"]

    def __str__(self):
        return f"{self.name} ({self.date})"

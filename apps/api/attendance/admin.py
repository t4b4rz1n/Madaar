from django.contrib import admin
from .models import Attendance, TimeLog, TimeOffRequest, Holiday


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ("user", "date", "check_in", "check_out", "is_remote", "created_at")
    list_filter = ("date", "is_remote", "is_deleted")
    search_fields = ("user__username", "user__email")
    raw_id_fields = ("user",)

    def get_queryset(self, request):
        return self.model.all_objects.all()


@admin.register(TimeLog)
class TimeLogAdmin(admin.ModelAdmin):
    list_display = ("user", "task", "start_time", "end_time", "is_active", "duration_seconds")
    list_filter = ("is_active", "start_time", "is_deleted")
    search_fields = ("user__username", "task__title")
    raw_id_fields = ("user", "task")

    def get_queryset(self, request):
        return self.model.all_objects.all()


@admin.register(TimeOffRequest)
class TimeOffRequestAdmin(admin.ModelAdmin):
    list_display = ("user", "request_type", "status", "start_datetime", "end_datetime")
    list_filter = ("status", "request_type", "is_deleted")
    search_fields = ("user__username", "reason")
    raw_id_fields = ("user", "approved_by")

    def get_queryset(self, request):
        return self.model.all_objects.all()


@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = ("name", "date", "is_official")
    list_filter = ("is_official", "date", "is_deleted")
    search_fields = ("name",)

    def get_queryset(self, request):
        return self.model.all_objects.all()

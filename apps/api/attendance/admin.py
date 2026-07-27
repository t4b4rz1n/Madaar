from django.contrib import admin
from .models import Attendance, TimeLog, TimeOffRequest, Holiday, AttendanceSetting


@admin.register(AttendanceSetting)
class AttendanceSettingAdmin(admin.ModelAdmin):
    list_display = ("organization", "expected_daily_hours", "created_at")
    list_filter = ("is_deleted",)
    search_fields = ("organization__name",)
    raw_id_fields = ("organization",)

    def get_queryset(self, request):
        return self.model.all_objects.all()

    def delete_queryset(self, request, queryset):
        for obj in queryset:
            obj.is_deleted = True
            obj.save(update_fields=["is_deleted"])


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ("user", "organization", "date", "check_in", "check_out", "overtime_minutes", "is_remote")
    list_filter = ("date", "is_remote", "is_deleted", "organization")
    search_fields = ("user__username", "user__email")
    raw_id_fields = ("user", "organization")

    def get_queryset(self, request):
        return self.model.all_objects.all()

    def delete_queryset(self, request, queryset):
        for obj in queryset:
            obj.is_deleted = True
            obj.save(update_fields=["is_deleted"])


@admin.register(TimeLog)
class TimeLogAdmin(admin.ModelAdmin):
    list_display = ("user", "task", "project", "date", "start_time", "end_time", "is_active", "duration_seconds")
    list_filter = ("is_active", "date", "is_deleted")
    search_fields = ("user__username", "task__title", "project__name")
    raw_id_fields = ("user", "task", "project")

    def get_queryset(self, request):
        return self.model.all_objects.all()

    def delete_queryset(self, request, queryset):
        for obj in queryset:
            obj.is_deleted = True
            obj.save(update_fields=["is_deleted"])


@admin.register(TimeOffRequest)
class TimeOffRequestAdmin(admin.ModelAdmin):
    list_display = ("user", "organization", "request_type", "status", "start_datetime", "end_datetime")
    list_filter = ("status", "request_type", "is_deleted", "organization")
    search_fields = ("user__username", "reason")
    raw_id_fields = ("user", "organization", "approved_by")

    def get_queryset(self, request):
        return self.model.all_objects.all()

    def delete_queryset(self, request, queryset):
        for obj in queryset:
            obj.is_deleted = True
            obj.save(update_fields=["is_deleted"])


@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = ("name", "date", "is_official")
    list_filter = ("is_official", "date", "is_deleted")
    search_fields = ("name",)

    def get_queryset(self, request):
        return self.model.all_objects.all()

    def delete_queryset(self, request, queryset):
        for obj in queryset:
            obj.is_deleted = True
            obj.save(update_fields=["is_deleted"])

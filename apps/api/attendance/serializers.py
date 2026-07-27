from rest_framework import serializers
from .models import Attendance, TimeLog, TimeOffRequest, Holiday
from accounts.models import User

class TimeLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeLog
        fields = (
            "id",
            "user",
            "task",
            "start_time",
            "end_time",
            "duration_seconds",
            "is_active",
            "description",
            "created_at",
        )
        read_only_fields = ("id", "user", "start_time", "end_time", "duration_seconds", "is_active", "created_at")


class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = (
            "id",
            "user",
            "date",
            "check_in",
            "check_out",
            "is_remote",
            "created_at",
        )
        read_only_fields = ("id", "user", "created_at")


class TimeOffRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeOffRequest
        fields = (
            "id",
            "user",
            "request_type",
            "start_datetime",
            "end_datetime",
            "reason",
            "status",
            "approved_by",
            "created_at",
        )
        read_only_fields = ("id", "user", "status", "approved_by", "created_at")


class HolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = Holiday
        fields = ("id", "name", "date", "is_official", "created_at")
        read_only_fields = ("id", "created_at")

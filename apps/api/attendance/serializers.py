from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from .models import Attendance, TimeLog, TimeOffRequest, Holiday
from accounts.models import User
from tasks.models import Task

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

    def validate(self, attrs):
        # Additional custom validations can be added here
        return attrs


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

    def validate(self, attrs):
        if attrs.get("check_in") and attrs.get("check_out"):
            if attrs["check_in"] > attrs["check_out"]:
                raise serializers.ValidationError({"check_out": _("Check-out cannot be before Check-in.")})
        return attrs


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

    def validate(self, attrs):
        start = attrs.get("start_datetime")
        end = attrs.get("end_datetime")
        
        if start and end and start >= end:
            raise serializers.ValidationError({"end_datetime": _("End time must be after start time.")})
            
        return attrs


class HolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = Holiday
        fields = ("id", "name", "date", "is_official", "created_at")
        read_only_fields = ("id", "created_at")

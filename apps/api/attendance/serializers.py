from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from .models import Attendance, TimeLog, TimeOffRequest, Holiday
from accounts.models import User

# (Assuming we have basic serializers for User and Org, we use PrimaryKeyRelatedField for writes, 
# and a simple representation for reads)

class MinimalUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "first_name", "last_name", "email", "avatar")
        
    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get('request')
        if instance.avatar and request:
            ret['avatar'] = request.build_absolute_uri(instance.avatar.url)
        return ret


class AttendanceSerializer(serializers.ModelSerializer):
    user = MinimalUserSerializer(read_only=True)
    
    class Meta:
        model = Attendance
        fields = (
            "id", "user", "organization", "date", "check_in", "check_out", 
            "is_remote", "overtime_minutes", "created_at"
        )
        read_only_fields = ("id", "overtime_minutes", "created_at")


class AttendanceWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = ("id", "organization", "date", "check_in", "check_out", "is_remote")

    def validate(self, attrs):
        check_in = attrs.get('check_in')
        check_out = attrs.get('check_out')
        date = attrs.get('date')

        if date and date > timezone.localdate():
            raise serializers.ValidationError({"date": _("Date cannot be in the future.")})
            
        if check_in and check_out:
            if check_out <= check_in:
                raise serializers.ValidationError({"check_out": _("Check-out time must be after check-in time.")})
                
        return attrs


class TimeLogSerializer(serializers.ModelSerializer):
    user = MinimalUserSerializer(read_only=True)
    
    class Meta:
        model = TimeLog
        fields = (
            "id", "user", "task", "project", "date", "start_time", 
            "end_time", "duration_seconds", "is_active", "description", "created_at"
        )


class TimeLogWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeLog
        fields = ("id", "task", "start_time", "end_time", "description")
        
    def validate(self, attrs):
        if 'start_time' in attrs and 'end_time' in attrs:
            if attrs['end_time'] <= attrs['start_time']:
                raise serializers.ValidationError({"end_time": _("End time must be after start time.")})
        return attrs


class TimeOffRequestSerializer(serializers.ModelSerializer):
    user = MinimalUserSerializer(read_only=True)
    approved_by = MinimalUserSerializer(read_only=True)

    class Meta:
        model = TimeOffRequest
        fields = (
            "id", "user", "organization", "request_type", "start_datetime", 
            "end_datetime", "reason", "status", "approved_by", "created_at"
        )


class TimeOffRequestWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeOffRequest
        fields = ("id", "organization", "request_type", "start_datetime", "end_datetime", "reason", "manager_note")

    def validate(self, attrs):
        start = attrs.get("start_datetime")
        end = attrs.get("end_datetime")
        
        if start and end and start >= end:
            raise serializers.ValidationError({"end_datetime": _("End time must be after start time.")})
            
        return attrs


class HolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = Holiday
        fields = ("id", "name", "organization", "description", "date", "is_official", "created_at")
        read_only_fields = ("id", "created_at")


class TimesheetDailySerializer(serializers.Serializer):
    date = serializers.DateField()
    total_seconds = serializers.IntegerField()


class TimesheetTeamSerializer(serializers.Serializer):
    user__username = serializers.CharField()
    date = serializers.DateField()
    total_seconds = serializers.IntegerField()

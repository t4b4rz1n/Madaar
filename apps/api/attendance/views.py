import datetime
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from tasks.models import Task
from organizations.models import Organization

from .models import Attendance, TimeLog, TimeOffRequest, Holiday
from .serializers import (
    AttendanceSerializer, AttendanceWriteSerializer,
    TimeLogSerializer, TimeLogWriteSerializer,
    TimeOffRequestSerializer, TimeOffRequestWriteSerializer,
    HolidaySerializer, TimesheetDailySerializer, TimesheetTeamSerializer
)
from .services import TimeLogService, AttendanceService, TimeOffRequestService, HolidayService, TimesheetService
from .permissions import (
    IsAttendanceOwnerOrAdmin, IsTimeLogOwnerOrAdmin,
    IsTimeOffRequestPermission, IsHolidayPermission, IsTimesheetPermission
)


class AttendanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAttendanceOwnerOrAdmin]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update", "check_in"]:
            return AttendanceWriteSerializer
        return AttendanceSerializer

    def get_queryset(self):
        qs = Attendance.objects.select_related("user").filter(is_deleted=False)
        if getattr(self.request.user, "is_superuser", False) or getattr(self.request.user, "is_staff", False):
            return qs.all()
        return qs.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["post"], url_path="check-in")
    def check_in(self, request):
        org_id = request.data.get("organization")
        if not org_id:
            return Response({"error": "Organization ID is required"}, status=status.HTTP_400_BAD_REQUEST)
        org = get_object_or_404(Organization, id=org_id)
        attendance = AttendanceService.check_in(request.user, org)
        return Response(AttendanceSerializer(attendance).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="check-out")
    def check_out(self, request):
        attendance = AttendanceService.check_out(request.user)
        return Response(AttendanceSerializer(attendance).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="my-today")
    def my_today(self, request):
        attendance = AttendanceService.get_today_attendance(request.user)
        if not attendance:
            return Response({"detail": "Not checked in today."}, status=status.HTTP_404_NOT_FOUND)
        return Response(AttendanceSerializer(attendance).data)


class TimeLogViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsTimeLogOwnerOrAdmin]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return TimeLogWriteSerializer
        return TimeLogSerializer

    def get_queryset(self):
        qs = TimeLog.objects.select_related("user", "task", "project").filter(is_deleted=False)
        if getattr(self.request.user, "is_superuser", False) or getattr(self.request.user, "is_staff", False):
            return qs.all()
        return qs.filter(user=self.request.user)

    def perform_create(self, serializer):
        task = serializer.validated_data.get("task")
        serializer.save(user=self.request.user, project=task.project)

    @action(detail=False, methods=["post"], url_path="start-timer")
    def start_timer(self, request):
        task_id = request.data.get("task")
        if not task_id:
            return Response({"error": "task ID is required"}, status=status.HTTP_400_BAD_REQUEST)
        task = get_object_or_404(Task, id=task_id)
        timer = TimeLogService.start_timer(request.user, task)
        return Response(TimeLogSerializer(timer).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="stop-timer")
    def stop_timer(self, request, pk=None):
        timer = TimeLogService.stop_timer(request.user, pk)
        return Response(TimeLogSerializer(timer).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="active-timer")
    def active_timer(self, request):
        timer = TimeLogService.get_active_timer(request.user)
        if not timer:
            return Response({"detail": "No active timer."}, status=status.HTTP_404_NOT_FOUND)
        return Response(TimeLogSerializer(timer).data)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel_timer(self, request, pk=None):
        timer = TimeLogService.cancel_timer(request.user, pk)
        return Response(TimeLogSerializer(timer).data, status=status.HTTP_200_OK)


class TimeOffRequestViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsTimeOffRequestPermission]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return TimeOffRequestWriteSerializer
        return TimeOffRequestSerializer

    def get_queryset(self):
        qs = TimeOffRequest.objects.select_related("user", "approved_by").filter(is_deleted=False)
        if getattr(self.request.user, "is_superuser", False) or getattr(self.request.user, "is_staff", False):
            return qs.all()
        return qs.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        req = TimeOffRequestService.approve(pk, request.user)
        return Response(TimeOffRequestSerializer(req).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        req = TimeOffRequestService.reject(pk, request.user)
        return Response(TimeOffRequestSerializer(req).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel_request(self, request, pk=None):
        req = TimeOffRequestService.cancel(request.user, pk)
        return Response(TimeOffRequestSerializer(req).data, status=status.HTTP_200_OK)


class HolidayViewSet(viewsets.ModelViewSet):
    serializer_class = HolidaySerializer
    permission_classes = [IsAuthenticated, IsHolidayPermission]

    def get_queryset(self):
        return Holiday.objects.filter(is_deleted=False)


class TimesheetViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated, IsTimesheetPermission]
    
    def paginate_and_respond(self, data, serializer_class):
        page = self.paginate_queryset(data)
        if page is not None:
            return self.get_paginated_response(serializer_class(page, many=True).data)
        return Response(serializer_class(data, many=True).data)

    @action(detail=False, methods=["get"], url_path="daily")
    def daily(self, request):
        date_str = request.query_params.get("date")
        if not date_str:
            date_str = timezone.localdate().isoformat()
        try:
            date = datetime.date.fromisoformat(date_str)
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)
            
        data = TimesheetService.get_daily(request.user, date)
        # aggregate returns {'total_seconds': value}
        total = data.get("total_seconds") or 0
        return Response({"date": date_str, "total_seconds": total})

    @action(detail=False, methods=["get"], url_path="weekly")
    def weekly(self, request):
        date_str = request.query_params.get("week_start")
        if not date_str:
            return Response({"error": "week_start is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            date = datetime.date.fromisoformat(date_str)
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)
            
        data = TimesheetService.get_weekly(request.user, date)
        return self.paginate_and_respond(data, TimesheetDailySerializer)

    @action(detail=False, methods=["get"], url_path="monthly")
    def monthly(self, request):
        year = request.query_params.get("year")
        month = request.query_params.get("month")
        if not year or not month:
            return Response({"error": "year and month are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        data = TimesheetService.get_monthly(request.user, int(year), int(month))
        return self.paginate_and_respond(data, TimesheetDailySerializer)

    @action(detail=False, methods=["get"], url_path="team")
    def team(self, request):
        org_id = request.query_params.get("organization")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        if not org_id or not start_date or not end_date:
            return Response({"error": "organization, start_date, end_date are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        data = TimesheetService.get_team_timesheet(request.user, org_id, start_date, end_date)
        return self.paginate_and_respond(data, TimesheetTeamSerializer)

    @action(detail=False, methods=["get"], url_path="project")
    def project(self, request):
        project_id = request.query_params.get("project")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        if not project_id or not start_date or not end_date:
            return Response({"error": "project, start_date, end_date are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        data = TimesheetService.get_project_timesheet(project_id, start_date, end_date)
        return self.paginate_and_respond(data, TimesheetTeamSerializer)

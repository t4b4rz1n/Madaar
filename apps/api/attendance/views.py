from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Attendance, TimeLog, TimeOffRequest, Holiday
from .serializers import (
    AttendanceSerializer,
    TimeLogSerializer,
    TimeOffRequestSerializer,
    HolidaySerializer,
)
from .services import TimeLogService, AttendanceService, TimeOffService


class TimeLogViewSet(viewsets.ModelViewSet):
    serializer_class = TimeLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TimeLog.objects.filter(user=self.request.user)

    @action(detail=False, methods=["post"], url_path="start")
    def start_timer(self, request):
        task_id = request.data.get("task")
        # TODO: call TimeLogService.start_timer
        return Response({"status": "started"}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="stop")
    def stop_timer(self, request):
        # TODO: call TimeLogService.stop_timer
        return Response({"status": "stopped"}, status=status.HTTP_200_OK)


class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Attendance.objects.filter(user=self.request.user)


class TimeOffRequestViewSet(viewsets.ModelViewSet):
    serializer_class = TimeOffRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TimeOffRequest.objects.filter(user=self.request.user)


class HolidayViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = HolidaySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Holiday.objects.all()

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from tasks.models import Task

from .models import Attendance, TimeLog, TimeOffRequest, Holiday
from .serializers import (
    AttendanceSerializer,
    TimeLogSerializer,
    TimeOffRequestSerializer,
    HolidaySerializer,
)
from .services import TimeLogService, AttendanceService
from .permissions import IsOwnerOrAdmin, IsAdminOrReadOnly


class TimeLogViewSet(viewsets.ModelViewSet):
    serializer_class = TimeLogSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        qs = TimeLog.objects.select_related("task", "user")
        if getattr(self.request.user, "is_superuser", False) or getattr(self.request.user, "is_staff", False):
            return qs.all()
        return qs.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["post"], url_path="start")
    def start_timer(self, request):
        task_id = request.data.get("task")
        if not task_id:
            return Response({"error": "task ID is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        task = get_object_or_404(Task, id=task_id)
        timer = TimeLogService.start_timer(request.user, task)
        return Response(TimeLogSerializer(timer).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="stop")
    def stop_timer(self, request):
        task_id = request.data.get("task")
        if not task_id:
            return Response({"error": "task ID is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        task = get_object_or_404(Task, id=task_id)
        timer = TimeLogService.stop_timer(request.user, task)
        if not timer:
            return Response({"error": "No active timer found for this task"}, status=status.HTTP_404_NOT_FOUND)
        return Response(TimeLogSerializer(timer).data, status=status.HTTP_200_OK)


class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        qs = Attendance.objects.select_related("user")
        if getattr(self.request.user, "is_superuser", False) or getattr(self.request.user, "is_staff", False):
            return qs.all()
        return qs.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["post"], url_path="check-in")
    def check_in(self, request):
        attendance = AttendanceService.check_in(request.user)
        return Response(AttendanceSerializer(attendance).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="check-out")
    def check_out(self, request):
        attendance = AttendanceService.check_out(request.user)
        if not attendance:
            return Response({"error": "No attendance record found for today"}, status=status.HTTP_404_NOT_FOUND)
        return Response(AttendanceSerializer(attendance).data, status=status.HTTP_200_OK)


class TimeOffRequestViewSet(viewsets.ModelViewSet):
    serializer_class = TimeOffRequestSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        qs = TimeOffRequest.objects.select_related("user", "approved_by")
        if getattr(self.request.user, "is_superuser", False) or getattr(self.request.user, "is_staff", False):
            return qs.all()
        return qs.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"], url_path="approve", permission_classes=[IsAdminOrReadOnly])
    def approve(self, request, pk=None):
        req = self.get_object()
        req.status = TimeOffRequest.Status.APPROVED
        req.approved_by = request.user
        req.save(update_fields=['status', 'approved_by'])
        return Response(TimeOffRequestSerializer(req).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="reject", permission_classes=[IsAdminOrReadOnly])
    def reject(self, request, pk=None):
        req = self.get_object()
        req.status = TimeOffRequest.Status.REJECTED
        req.save(update_fields=['status'])
        return Response(TimeOffRequestSerializer(req).data, status=status.HTTP_200_OK)


class HolidayViewSet(viewsets.ModelViewSet):
    serializer_class = HolidaySerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        return Holiday.objects.all()

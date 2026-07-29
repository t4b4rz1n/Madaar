from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TimeLogViewSet,
    AttendanceViewSet,
    TimeOffRequestViewSet,
    HolidayViewSet,
    TimesheetViewSet,
)

router = DefaultRouter()
router.register(r"time-logs", TimeLogViewSet, basename="time-logs")
router.register(r"attendances", AttendanceViewSet, basename="attendances")
router.register(r"timeoff-requests", TimeOffRequestViewSet, basename="timeoff-requests")
router.register(r"holidays", HolidayViewSet, basename="holidays")
router.register(r"timesheets", TimesheetViewSet, basename="timesheets")

urlpatterns = [
    path("", include(router.urls)),
]

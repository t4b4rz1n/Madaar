from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AttendanceViewSet,
    HolidayViewSet,
    LiveActivityView,
    TimeLogViewSet,
    TimeOffRequestViewSet,
    TimesheetViewSet,
)

router = DefaultRouter()
router.register(r"time-logs", TimeLogViewSet, basename="time-logs")
router.register(r"attendances", AttendanceViewSet, basename="attendances")
router.register(r"timeoff-requests", TimeOffRequestViewSet, basename="timeoff-requests")
router.register(r"holidays", HolidayViewSet, basename="holidays")
router.register(r"timesheets", TimesheetViewSet, basename="timesheets")

urlpatterns = [
    path(
        "projects/<uuid:project_id>/live-activity/",
        LiveActivityView.as_view({"get": "list"}),
        name="project-live-activity",
    ),
    path("", include(router.urls)),
]

"""
reports/urls.py
---------------
URL configuration for the reports & analytics API endpoints.

All endpoints are read-only (GET) and are prefixed with
``api/v1/reports/`` (configured in ``config/urls.py``).
"""

from django.urls import path

from .views import (
    EmployeeDashboardView,
    ExecutiveDashboardView,
    ManagerDashboardView,
    ManagerMembersView,
)

app_name = "reports"

urlpatterns = [
    path(
        "employee/dashboard/",
        EmployeeDashboardView.as_view(),
        name="employee-dashboard",
    ),
    path(
        "manager/dashboard/",
        ManagerDashboardView.as_view(),
        name="manager-dashboard",
    ),
    path(
        "manager/members/",
        ManagerMembersView.as_view(),
        name="manager-members",
    ),
    path(
        "executive/dashboard/",
        ExecutiveDashboardView.as_view(),
        name="executive-dashboard",
    ),
]

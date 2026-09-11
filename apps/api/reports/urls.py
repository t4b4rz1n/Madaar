"""
reports/urls.py
---------------
URL configuration for the reports & analytics API endpoints.

All endpoints are read-only (GET) and are prefixed with
``api/v1/reports/`` (configured in ``config/urls.py``).
"""

from django.urls import path

from .views import (
    CumulativeFlowView,
    CycleLeadTimeView,
    EmployeeDashboardView,
    ExecutiveDashboardView,
    ManagerDashboardView,
    ManagerMembersView,
    MilestoneBurndownView,
)

app_name = "reports"

urlpatterns = [
    # ── Dashboards ──────────────────────────────────────────────────────────
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

    # ── Project Analytics ───────────────────────────────────────────────────
    path(
        "projects/<uuid:project_id>/cfd/",
        CumulativeFlowView.as_view(),
        name="project-cfd",
    ),
    path(
        "projects/<uuid:project_id>/cycle-time/",
        CycleLeadTimeView.as_view(),
        name="project-cycle-time",
    ),

    # ── Milestone Analytics ─────────────────────────────────────────────────
    path(
        "milestones/<uuid:milestone_id>/burndown/",
        MilestoneBurndownView.as_view(),
        name="milestone-burndown",
    ),
]

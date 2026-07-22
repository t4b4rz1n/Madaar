"""
projects/urls.py
----------------
URL configuration for the projects app.
Uses drf-nested-routers for clean nested resource URLs:

    GET/POST     /api/v1/projects/
    GET/PUT/PATCH/DELETE  /api/v1/projects/<pk>/
    POST         /api/v1/projects/<pk>/archive/
    POST         /api/v1/projects/<pk>/complete/

    GET/POST     /api/v1/projects/<project_pk>/members/
    GET/PUT/PATCH/DELETE  /api/v1/projects/<project_pk>/members/<pk>/

    GET/POST     /api/v1/projects/<project_pk>/milestones/
    GET/PUT/PATCH/DELETE  /api/v1/projects/<project_pk>/milestones/<pk>/

    GET          /api/v1/projects/<project_pk>/activities/
    GET          /api/v1/projects/<project_pk>/activities/<pk>/
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    MilestoneViewSet,
    ProjectActivityViewSet,
    ProjectMemberViewSet,
    ProjectViewSet,
)

# Main router for top-level /projects/ resource
router = DefaultRouter()
router.register(r"", ProjectViewSet, basename="project")

# Nested routes manually wired (avoids drf-nested-routers dependency)
member_list = ProjectMemberViewSet.as_view(
    {"get": "list", "post": "create"}
)
member_detail = ProjectMemberViewSet.as_view(
    {"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}
)

milestone_list = MilestoneViewSet.as_view(
    {"get": "list", "post": "create"}
)
milestone_detail = MilestoneViewSet.as_view(
    {"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}
)

activity_list = ProjectActivityViewSet.as_view({"get": "list"})
activity_detail = ProjectActivityViewSet.as_view({"get": "retrieve"})

urlpatterns = [
    # Project CRUD + custom actions
    path("", include(router.urls)),
    # Members (nested)
    path(
        "<uuid:project_pk>/members/",
        member_list,
        name="project-member-list",
    ),
    path(
        "<uuid:project_pk>/members/<uuid:pk>/",
        member_detail,
        name="project-member-detail",
    ),
    # Milestones (nested)
    path(
        "<uuid:project_pk>/milestones/",
        milestone_list,
        name="project-milestone-list",
    ),
    path(
        "<uuid:project_pk>/milestones/<uuid:pk>/",
        milestone_detail,
        name="project-milestone-detail",
    ),
    # Activity feed (nested, read-only)
    path(
        "<uuid:project_pk>/activities/",
        activity_list,
        name="project-activity-list",
    ),
    path(
        "<uuid:project_pk>/activities/<uuid:pk>/",
        activity_detail,
        name="project-activity-detail",
    ),
]

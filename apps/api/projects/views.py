"""
projects/views.py
-----------------
DRF ViewSets for the projects app.

Responsibilities:
    - Parse requests, enforce authentication & permissions.
    - Annotate querysets for performance (no N+1).
    - Delegate all business logic to services.py.
    - Return serialized responses.

URL structure (registered in urls.py with a nested router):
    /api/v1/projects/                           → ProjectViewSet
    /api/v1/projects/<pk>/members/              → ProjectMemberViewSet
    /api/v1/projects/<pk>/milestones/           → MilestoneViewSet
    /api/v1/projects/<pk>/activities/           → ProjectActivityViewSet
"""

from django.db.models import Count, Prefetch, Q
from django.utils.translation import gettext_lazy as _
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from organizations.models import OrganizationMembership

from . import services
from .filters import MilestoneFilter, ProjectFilter, ProjectMemberFilter
from .models import Milestone, Project, ProjectActivity, ProjectMember
from .permissions import (
    CanCreateProject,
    CanManageMilestone,
    CanManageProjectMember,
    CanViewProjectActivity,
    IsProjectOwnerOrOrgAdmin,
)
from .serializers import (
    MilestoneSerializer,
    ProjectActivitySerializer,
    ProjectDetailSerializer,
    ProjectListSerializer,
    ProjectMemberReadSerializer,
    ProjectMemberWriteSerializer,
    ProjectWriteSerializer,
)


# ---------------------------------------------------------------------------
# Project ViewSet
# ---------------------------------------------------------------------------


@extend_schema_view(
    list=extend_schema(
        summary="List projects",
        description="Returns all non-deleted projects accessible to the authenticated user.",
        tags=["projects"],
    ),
    create=extend_schema(
        summary="Create a project",
        description="Create a new project. Requires org-admin or staff role.",
        tags=["projects"],
    ),
    retrieve=extend_schema(
        summary="Retrieve a project",
        description="Full project detail including members and milestones.",
        tags=["projects"],
    ),
    update=extend_schema(
        summary="Update a project (full)",
        tags=["projects"],
    ),
    partial_update=extend_schema(
        summary="Update a project (partial)",
        tags=["projects"],
    ),
    destroy=extend_schema(
        summary="Soft-delete a project",
        tags=["projects"],
    ),
)
class ProjectViewSet(viewsets.ModelViewSet):
    """
    CRUD for Projects.
    Business logic is delegated to services.py.
    """

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
        DjangoFilterBackend,
    ]
    search_fields = ["name", "description", "owner__email", "owner__username"]
    ordering_fields = ["name", "status", "deadline", "created_at", "updated_at"]
    ordering = ["-updated_at"]
    filterset_class = ProjectFilter

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), CanCreateProject()]
        if self.action in ("update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsProjectOwnerOrOrgAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Project.objects.none()

        user = self.request.user
        qs = (
            Project.objects.filter(is_deleted=False)
            .select_related("organization", "owner", "team")
            .annotate(
                member_count=Count("members", filter=Q(members__is_deleted=False)),
                task_count=Count("tasks", filter=Q(tasks__is_deleted=False)),
                milestone_count=Count("milestones", filter=Q(milestones__is_deleted=False)),
            )
        )

        if not user.is_staff:
            org_ids = OrganizationMembership.objects.filter(
                user=user, is_deleted=False
            ).values_list("organization_id", flat=True)
            qs = qs.filter(
                Q(organization_id__in=org_ids)
                | Q(members__user=user, members__is_deleted=False)
                | Q(owner=user)
            ).distinct()

        return qs

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ProjectWriteSerializer
        if self.action == "retrieve":
            return ProjectDetailSerializer
        return ProjectListSerializer

    def create(self, request, *args, **kwargs):
        serializer = ProjectWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = services.create_project(
            actor=request.user,
            validated_data=serializer.validated_data,
        )
        return Response(
            ProjectDetailSerializer(project).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        project = self.get_object()
        serializer = ProjectWriteSerializer(project, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        updated = services.update_project(
            project=project,
            actor=request.user,
            validated_data=serializer.validated_data,
        )
        return Response(ProjectDetailSerializer(updated).data)

    def destroy(self, request, *args, **kwargs):
        project = self.get_object()
        services.delete_project(project=project, actor=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ------------------------------------------------------------------
    # Extra actions
    # ------------------------------------------------------------------

    @extend_schema(
        summary="Archive a project",
        description="Convenience endpoint to move a project to ARCHIVED status.",
        tags=["projects"],
    )
    @action(detail=True, methods=["post"], url_path="archive")
    def archive(self, request, pk=None):
        project = self.get_object()
        self.check_object_permissions(request, project)
        updated = services.update_project(
            project=project,
            actor=request.user,
            validated_data={"status": Project.Status.ARCHIVED},
        )
        return Response(ProjectDetailSerializer(updated).data)

    @extend_schema(
        summary="Complete a project",
        description="Convenience endpoint to move a project to COMPLETED status.",
        tags=["projects"],
    )
    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        project = self.get_object()
        self.check_object_permissions(request, project)
        updated = services.update_project(
            project=project,
            actor=request.user,
            validated_data={"status": Project.Status.COMPLETED},
        )
        return Response(ProjectDetailSerializer(updated).data)


# ---------------------------------------------------------------------------
# ProjectMember ViewSet (nested under /projects/<project_pk>/members/)
# ---------------------------------------------------------------------------


@extend_schema_view(
    list=extend_schema(summary="List project members", tags=["projects"]),
    create=extend_schema(summary="Add a project member", tags=["projects"]),
    retrieve=extend_schema(summary="Retrieve a project member", tags=["projects"]),
    update=extend_schema(summary="Update a project member (full)", tags=["projects"]),
    partial_update=extend_schema(summary="Update a project member (partial)", tags=["projects"]),
    destroy=extend_schema(summary="Remove a project member (soft-delete)", tags=["projects"]),
)
class ProjectMemberViewSet(viewsets.ModelViewSet):
    """
    CRUD for ProjectMembers, nested under a Project.
    """

    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["specialty", "allocation_percentage", "created_at"]
    ordering = ["created_at"]
    filterset_class = ProjectMemberFilter

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), CanManageProjectMember()]

    def _get_project(self):
        if getattr(self, "_project_cache", None) is None:
            self._project_cache = Project.objects.get(
                pk=self.kwargs["project_pk"], is_deleted=False
            )
        return self._project_cache

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return ProjectMember.objects.none()
        return (
            ProjectMember.objects.filter(
                project_id=self.kwargs["project_pk"], is_deleted=False
            )
            .select_related("user", "team")
        )

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ProjectMemberWriteSerializer
        return ProjectMemberReadSerializer

    def create(self, request, *args, **kwargs):
        project = self._get_project()
        serializer = ProjectMemberWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        member = services.add_project_member(
            project=project,
            actor=request.user,
            validated_data=serializer.validated_data,
        )
        return Response(
            ProjectMemberReadSerializer(member).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        member = self.get_object()
        serializer = ProjectMemberWriteSerializer(member, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        updated = services.update_project_member(
            member=member,
            actor=request.user,
            validated_data=serializer.validated_data,
        )
        return Response(ProjectMemberReadSerializer(updated).data)

    def destroy(self, request, *args, **kwargs):
        member = self.get_object()
        services.remove_project_member(member=member, actor=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Milestone ViewSet (nested under /projects/<project_pk>/milestones/)
# ---------------------------------------------------------------------------


@extend_schema_view(
    list=extend_schema(summary="List milestones", tags=["projects"]),
    create=extend_schema(summary="Create a milestone", tags=["projects"]),
    retrieve=extend_schema(summary="Retrieve a milestone", tags=["projects"]),
    update=extend_schema(summary="Update a milestone (full)", tags=["projects"]),
    partial_update=extend_schema(summary="Update a milestone (partial)", tags=["projects"]),
    destroy=extend_schema(summary="Soft-delete a milestone", tags=["projects"]),
)
class MilestoneViewSet(viewsets.ModelViewSet):
    """
    CRUD for Milestones, nested under a Project.
    """

    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["target_date", "sequence", "status", "created_at"]
    ordering = ["target_date", "sequence"]
    filterset_class = MilestoneFilter
    serializer_class = MilestoneSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), CanManageMilestone()]

    def _get_project(self):
        if getattr(self, "_project_cache", None) is None:
            self._project_cache = Project.objects.get(
                pk=self.kwargs["project_pk"], is_deleted=False
            )
        return self._project_cache

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Milestone.objects.none()
        return (
            Milestone.objects.filter(
                project_id=self.kwargs["project_pk"], is_deleted=False
            )
            .annotate(task_count=Count("tasks"))
        )

    def get_serializer_class(self):
        return MilestoneSerializer

    def create(self, request, *args, **kwargs):
        project = self._get_project()
        serializer = MilestoneSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        milestone = services.create_milestone(
            project=project,
            actor=request.user,
            validated_data=serializer.validated_data,
        )
        return Response(
            MilestoneSerializer(milestone).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        milestone = self.get_object()
        serializer = MilestoneSerializer(milestone, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        updated = services.update_milestone(
            milestone=milestone,
            actor=request.user,
            validated_data=serializer.validated_data,
        )
        return Response(MilestoneSerializer(updated).data)

    def destroy(self, request, *args, **kwargs):
        milestone = self.get_object()
        services.delete_milestone(milestone=milestone, actor=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# ProjectActivity ViewSet (read-only, nested)
# ---------------------------------------------------------------------------


@extend_schema_view(
    list=extend_schema(
        summary="List project activity feed",
        description="Returns the live activity timeline for a project (read-only).",
        tags=["projects"],
    ),
    retrieve=extend_schema(
        summary="Retrieve a project activity entry",
        tags=["projects"],
    ),
)
class ProjectActivityViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only activity feed for a Project.
    """

    serializer_class = ProjectActivitySerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at", "event_type"]
    ordering = ["-created_at"]

    def get_permissions(self):
        return [IsAuthenticated(), CanViewProjectActivity()]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return ProjectActivity.objects.none()
        return (
            ProjectActivity.objects.filter(
                project_id=self.kwargs["project_pk"], is_deleted=False
            )
            .select_related("actor")
        )

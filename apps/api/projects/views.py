"""
projects/views.py
-----------------
DRF ViewSets for the projects application.

Responsibilities
~~~~~~~~~~~~~~~~
* Parse incoming requests.
* Enforce authentication and permissions.
* Build annotated, optimised querysets (no N+1).
* Delegate **all** business logic to the service classes in
  ``projects.services``.
* Return serialised responses.

URL structure (registered via ``projects/urls.py``)::

    /api/v1/projects/                                → ProjectViewSet
    /api/v1/projects/<pk>/archive/                   → ProjectViewSet.archive
    /api/v1/projects/<pk>/complete/                   → ProjectViewSet.complete
    /api/v1/projects/<project_pk>/members/            → ProjectMemberViewSet
    /api/v1/projects/<project_pk>/milestones/         → MilestoneViewSet
    /api/v1/projects/<project_pk>/activities/         → ProjectActivityViewSet
"""

from django.shortcuts import get_object_or_404
from django.utils.translation import gettext_lazy as _
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .filters import (
    MilestoneFilter,
    ProjectActivityFilter,
    ProjectFilter,
    ProjectMemberFilter,
)
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
    TeamMinimalSerializer,
)
from .services import (
    MilestoneService,
    ProjectActivityService,
    ProjectMemberService,
    ProjectService,
)

# ---------------------------------------------------------------------------
# Mixins
# ---------------------------------------------------------------------------


class NestedProjectMixin:
    """Provides a shared _get_project helper for nested viewsets."""

    def _get_project(self) -> Project:
        """Return the parent project; raises 404 if it does not exist."""
        if not hasattr(self, "_project_cache"):
            self._project_cache = get_object_or_404(
                Project.objects.filter(is_deleted=False),
                pk=self.kwargs["project_pk"],
            )
        return self._project_cache


# ---------------------------------------------------------------------------
# Project ViewSet
# ---------------------------------------------------------------------------


@extend_schema_view(
    list=extend_schema(
        summary=_("List projects"),
        description=_(
            "Return all non-deleted projects accessible to the authenticated user."
        ),
        tags=["projects"],
    ),
    create=extend_schema(
        summary=_("Create a project"),
        description=_("Create a new project. Requires org-admin or staff role."),
        tags=["projects"],
    ),
    retrieve=extend_schema(
        summary=_("Retrieve a project"),
        description=_("Full project detail including members and milestones."),
        tags=["projects"],
    ),
    update=extend_schema(summary=_("Update a project"), tags=["projects"]),
    partial_update=extend_schema(
        summary=_("Partially update a project"), tags=["projects"]
    ),
    destroy=extend_schema(summary=_("Soft-delete a project"), tags=["projects"]),
)
class ProjectViewSet(viewsets.ModelViewSet):
    """CRUD for Projects with search, filtering and ordering."""

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = ProjectFilter
    search_fields = ["name", "description", "owner__email", "owner__username"]
    ordering_fields = ["name", "status", "deadline", "created_at", "updated_at"]
    ordering = ["-updated_at"]

    # -- Permissions -------------------------------------------------------

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), CanCreateProject()]
        if self.action in (
            "update",
            "partial_update",
            "destroy",
            "archive",
            "complete",
        ):
            return [IsAuthenticated(), IsProjectOwnerOrOrgAdmin()]
        return [IsAuthenticated()]

    # -- Queryset ----------------------------------------------------------

    def get_queryset(self):
        """
        Return the queryset of projects the current user can access.

        Staff users can see all projects. Regular users can only see projects
        where they are the owner, a project member, or a member of the project's
        organization.
        """
        if getattr(self, "swagger_fake_view", False):
            return Project.objects.none()

        return ProjectService.get_accessible_queryset(self.request.user)

    # -- Serializer --------------------------------------------------------

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ProjectWriteSerializer
        if self.action == "retrieve":
            return ProjectDetailSerializer
        return ProjectListSerializer

    # -- CRUD overrides ----------------------------------------------------

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = ProjectService.create(
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
        serializer = self.get_serializer(project, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        updated = ProjectService.update(
            project=project,
            actor=request.user,
            validated_data=serializer.validated_data,
        )
        return Response(ProjectDetailSerializer(updated).data)

    def destroy(self, request, *args, **kwargs):
        project = self.get_object()
        ProjectService.delete(project=project, actor=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    # -- Custom actions ----------------------------------------------------

    @extend_schema(
        summary=_("List project teams"),
        tags=["projects"],
        responses={200: TeamMinimalSerializer(many=True)},
    )
    @action(detail=True, methods=["get"], url_path="teams")
    def teams(self, request, pk=None):
        """
        Return a list of all teams involved in this project.

        Includes both the main team assigned to the project and any teams
        that are part of the project memberships.
        """
        project = self.get_object()
        teams_qs = ProjectService.get_project_teams(project)
        serializer = TeamMinimalSerializer(teams_qs, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary=_("Archive a project"),
        tags=["projects"],
        request=None,
        responses={200: ProjectDetailSerializer},
    )
    @action(detail=True, methods=["post"], url_path="archive")
    def archive(self, request, pk=None):
        """Move a project to ARCHIVED status."""
        project = self.get_object()
        updated = ProjectService.archive(project=project, actor=request.user)
        return Response(
            ProjectDetailSerializer(updated).data, status=status.HTTP_200_OK
        )

    @extend_schema(
        summary=_("Complete a project"),
        tags=["projects"],
        request=None,
        responses={200: ProjectDetailSerializer},
    )
    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        """Move a project to COMPLETED status."""
        project = self.get_object()
        updated = ProjectService.complete(project=project, actor=request.user)
        return Response(
            ProjectDetailSerializer(updated).data, status=status.HTTP_200_OK
        )


# ---------------------------------------------------------------------------
# ProjectMember ViewSet (nested: /projects/<project_pk>/members/)
# ---------------------------------------------------------------------------


@extend_schema_view(
    list=extend_schema(summary=_("List project members"), tags=["projects"]),
    create=extend_schema(summary=_("Add a project member"), tags=["projects"]),
    retrieve=extend_schema(summary=_("Retrieve a project member"), tags=["projects"]),
    update=extend_schema(summary=_("Update a project member"), tags=["projects"]),
    partial_update=extend_schema(
        summary=_("Partially update a project member"), tags=["projects"]
    ),
    destroy=extend_schema(summary=_("Remove a project member"), tags=["projects"]),
)
class ProjectMemberViewSet(NestedProjectMixin, viewsets.ModelViewSet):
    """CRUD for ProjectMembers, nested under a Project."""

    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = ProjectMemberFilter
    ordering_fields = ["specialty", "allocation_percentage", "created_at"]
    ordering = ["created_at"]

    # -- Permissions -------------------------------------------------------

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), CanManageProjectMember()]

    # -- Queryset & serializer ---------------------------------------------

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return ProjectMember.objects.none()
        return ProjectMemberService.get_base_queryset(
            project_id=self.kwargs["project_pk"]
        )

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ProjectMemberWriteSerializer
        return ProjectMemberReadSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["project_pk"] = self.kwargs.get("project_pk")
        return ctx

    # -- CRUD overrides ----------------------------------------------------

    def create(self, request, *args, **kwargs):
        project = self._get_project()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        member = ProjectMemberService.add(
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
        serializer = self.get_serializer(member, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        updated = ProjectMemberService.update(
            member=member,
            actor=request.user,
            validated_data=serializer.validated_data,
        )
        return Response(ProjectMemberReadSerializer(updated).data)

    def destroy(self, request, *args, **kwargs):
        member = self.get_object()
        ProjectMemberService.remove(member=member, actor=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Milestone ViewSet (nested: /projects/<project_pk>/milestones/)
# ---------------------------------------------------------------------------


@extend_schema_view(
    list=extend_schema(summary=_("List milestones"), tags=["projects"]),
    create=extend_schema(summary=_("Create a milestone"), tags=["projects"]),
    retrieve=extend_schema(summary=_("Retrieve a milestone"), tags=["projects"]),
    update=extend_schema(summary=_("Update a milestone"), tags=["projects"]),
    partial_update=extend_schema(
        summary=_("Partially update a milestone"), tags=["projects"]
    ),
    destroy=extend_schema(summary=_("Soft-delete a milestone"), tags=["projects"]),
)
class MilestoneViewSet(NestedProjectMixin, viewsets.ModelViewSet):
    """CRUD for Milestones, nested under a Project."""

    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = MilestoneFilter
    ordering_fields = ["target_date", "sequence", "status", "created_at"]
    ordering = ["target_date", "sequence"]

    # -- Permissions -------------------------------------------------------

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), CanManageMilestone()]

    # -- Queryset & serializer ---------------------------------------------

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Milestone.objects.none()
        return MilestoneService.get_base_queryset(project_id=self.kwargs["project_pk"])

    def get_serializer_class(self):
        return MilestoneSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["project_pk"] = self.kwargs.get("project_pk")
        return ctx

    # -- CRUD overrides ----------------------------------------------------

    def create(self, request, *args, **kwargs):
        project = self._get_project()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        milestone = MilestoneService.create(
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
        serializer = self.get_serializer(milestone, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        updated = MilestoneService.update(
            milestone=milestone,
            actor=request.user,
            validated_data=serializer.validated_data,
        )
        return Response(MilestoneSerializer(updated).data)

    def destroy(self, request, *args, **kwargs):
        milestone = self.get_object()
        MilestoneService.delete(milestone=milestone, actor=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# ProjectActivity ViewSet (read-only, nested)
# ---------------------------------------------------------------------------


@extend_schema_view(
    list=extend_schema(
        summary=_("List project activities"),
        description=_("Return the live activity timeline for a project."),
        tags=["projects"],
    ),
    retrieve=extend_schema(
        summary=_("Retrieve a project activity entry"),
        tags=["projects"],
    ),
)
class ProjectActivityViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only activity feed for a Project."""

    serializer_class = ProjectActivitySerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = ProjectActivityFilter
    ordering_fields = ["created_at", "event_type"]
    ordering = ["-created_at"]

    def get_permissions(self):
        return [IsAuthenticated(), CanViewProjectActivity()]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return ProjectActivity.objects.none()
        return ProjectActivityService.get_base_queryset(
            project_id=self.kwargs["project_pk"]
        )

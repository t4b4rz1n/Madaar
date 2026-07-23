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

from organizations.models import OrganizationMembership

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
    TeamMinimalSerializer,
)
from .services import MilestoneService, ProjectMemberService, ProjectService

# ---------------------------------------------------------------------------
# Project ViewSet
# ---------------------------------------------------------------------------


@extend_schema_view(
    list=extend_schema(
        summary=_("List projects"),
        description=_(
            "Returns all non-deleted projects accessible to the authenticated user."
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
        if getattr(self, "swagger_fake_view", False):
            return Project.objects.none()

        user = self.request.user
        qs = ProjectService.get_base_queryset()

        if not user.is_staff:
            from django.db.models import Q

            org_ids = OrganizationMembership.objects.filter(
                user=user,
                is_deleted=False,
            ).values_list("organization_id", flat=True)

            qs = qs.filter(
                Q(organization_id__in=org_ids)
                | Q(members__user=user, members__is_deleted=False)
                | Q(owner=user)
            ).distinct()

        return qs

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
        description=_(
            "Returns a list of all teams involved in this project (both the main team and member teams)."
        ),
        tags=["projects"],
        responses={200: TeamMinimalSerializer(many=True)},
    )
    @action(detail=True, methods=["get"], url_path="teams")
    def teams(self, request, pk=None):
        project = self.get_object()
        from django.db.models import Q
        from organizations.models import Team

        teams = Team.objects.filter(
            Q(id=project.team_id) | Q(project_memberships__project=project, project_memberships__is_deleted=False)
        ).distinct()

        serializer = TeamMinimalSerializer(teams, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary=_("Archive a project"),
        description=_("Convenience endpoint to move a project to ARCHIVED status."),
        tags=["projects"],
        request=None,
    )
    @action(detail=True, methods=["post"], url_path="archive")
    def archive(self, request, pk=None):
        project = self.get_object()
        updated = ProjectService.update(
            project=project,
            actor=request.user,
            validated_data={"status": Project.Status.ARCHIVED},
        )
        return Response(ProjectDetailSerializer(updated).data)

    @extend_schema(
        summary=_("Complete a project"),
        description=_("Convenience endpoint to move a project to COMPLETED status."),
        tags=["projects"],
        request=None,
    )
    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        project = self.get_object()
        updated = ProjectService.update(
            project=project,
            actor=request.user,
            validated_data={"status": Project.Status.COMPLETED},
        )
        return Response(ProjectDetailSerializer(updated).data)


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
class ProjectMemberViewSet(viewsets.ModelViewSet):
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

    # -- Helpers -----------------------------------------------------------

    def _get_project(self) -> Project:
        """Return the parent project; raises 404 if it does not exist."""
        if not hasattr(self, "_project_cache"):
            self._project_cache = get_object_or_404(
                Project.objects.filter(is_deleted=False),
                pk=self.kwargs["project_pk"],
            )
        return self._project_cache

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
class MilestoneViewSet(viewsets.ModelViewSet):
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

    # -- Helpers -----------------------------------------------------------

    def _get_project(self) -> Project:
        if not hasattr(self, "_project_cache"):
            self._project_cache = get_object_or_404(
                Project.objects.filter(is_deleted=False),
                pk=self.kwargs["project_pk"],
            )
        return self._project_cache

    # -- Queryset & serializer ---------------------------------------------

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Milestone.objects.none()
        return MilestoneService.get_base_queryset(project_id=self.kwargs["project_pk"])

    def get_serializer_class(self):
        return MilestoneSerializer

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
        description=_("Returns the live activity timeline for a project."),
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
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at", "event_type"]
    ordering = ["-created_at"]

    def get_permissions(self):
        return [IsAuthenticated(), CanViewProjectActivity()]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return ProjectActivity.objects.none()
        return ProjectActivity.objects.filter(
            project_id=self.kwargs["project_pk"], is_deleted=False
        ).select_related("actor")

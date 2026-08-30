from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, viewsets
from rest_framework.filters import OrderingFilter, SearchFilter

from common.utils.mixins import FieldFilterOverviewMixin
from organizations.models import Team
from organizations.services import PermissionService
from organizations.models import OrganizationMembership

from organizations.models import TeamMembership

from .serializers import SquadSerializer, TeamMembershipSerializer, TeamSerializer


class CanManageTeams(permissions.BasePermission):
    """
    Permission class guarding Team & Squad endpoints:
    - Read: requires 'user.view', 'org.manage_members', or 'org.manage_settings'.
    - Write: requires 'org.manage_members' or 'org.manage_settings'.
    """

    def _extract_org_id(self, request, obj=None):
        if obj and hasattr(obj, "organization_id"):
            return obj.organization_id
        if hasattr(request, "data") and isinstance(request.data, dict):
            org_id = request.data.get("organization_id") or request.data.get("organization")
            if org_id:
                return org_id
        if hasattr(request, "query_params"):
            org_id = request.query_params.get("organization_id") or request.query_params.get(
                "organization"
            )
            if org_id:
                return org_id
        if request.user and request.user.is_authenticated:
            mem = request.user.org_memberships.filter(is_deleted=False).first()
            if mem:
                return mem.organization_id
        return None

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_staff or user.is_superuser:
            return True

        org_id = self._extract_org_id(request)
        if not org_id:
            return False

        if request.method in permissions.SAFE_METHODS:
            return (
                PermissionService.has_permission(user, "user.view", org_id)
                or PermissionService.has_permission(user, "org.manage_members", org_id)
                or PermissionService.has_permission(user, "org.manage_settings", org_id)
            )

        return PermissionService.has_permission(
            user, "org.manage_members", org_id
        ) or PermissionService.has_permission(user, "org.manage_settings", org_id)

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_staff or user.is_superuser:
            return True

        org_id = getattr(obj, "organization_id", None) or self._extract_org_id(request, obj)
        if not org_id:
            return False

        if request.method in permissions.SAFE_METHODS:
            return (
                PermissionService.has_permission(user, "user.view", org_id)
                or PermissionService.has_permission(user, "org.manage_members", org_id)
                or PermissionService.has_permission(user, "org.manage_settings", org_id)
            )

        return PermissionService.has_permission(
            user, "org.manage_members", org_id
        ) or PermissionService.has_permission(user, "org.manage_settings", org_id)


class StaffTeamViewSet(FieldFilterOverviewMixin, viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, CanManageTeams]
    serializer_class = TeamSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]

    def get_queryset(self):
        user = self.request.user
        qs = Team.objects.filter(is_deleted=False, parent_team__isnull=True).select_related(
            "organization"
        )
        if not (user.is_staff or user.is_superuser):
            org_ids = user.org_memberships.filter(is_deleted=False).values_list(
                "organization_id", flat=True
            )
            qs = qs.filter(organization_id__in=org_ids)
        return qs.order_by("-created_at")


class StaffSquadViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, CanManageTeams]
    serializer_class = SquadSerializer

    filter_backends = [DjangoFilterBackend, SearchFilter]
    search_fields = ["name", "description"]

    def get_queryset(self):
        user = self.request.user
        qs = Team.objects.filter(is_deleted=False, parent_team__isnull=False).select_related(
            "parent_team"
        )
        if not (user.is_staff or user.is_superuser):
            org_ids = user.org_memberships.filter(is_deleted=False).values_list(
                "organization_id", flat=True
            )
            qs = qs.filter(organization_id__in=org_ids)

        team_id = self.request.query_params.get("team_id")
        if team_id:
            qs = qs.filter(parent_team_id=team_id)

        return qs.order_by("-created_at")


class StaffTeamMembershipViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TeamMembershipSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    search_fields = ["user__email", "user__first_name", "user__last_name"]

    def get_queryset(self):
        user = self.request.user
        qs = TeamMembership.objects.filter(is_deleted=False).select_related("user")
        if not (user.is_staff or user.is_superuser):
            org_ids = user.org_memberships.filter(is_deleted=False).values_list(
                "organization_id", flat=True
            )
            qs = qs.filter(team__organization_id__in=org_ids)

        team_id = self.request.query_params.get("team_id")
        if team_id:
            qs = qs.filter(team_id=team_id)

        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        team = serializer.validated_data.get("team")
        user = serializer.validated_data.get("user")
        if team and user:
            if not OrganizationMembership.objects.filter(
                organization=team.organization,
                user=user,
                is_deleted=False,
            ).exists():
                from rest_framework import serializers
                raise serializers.ValidationError(
                    {"user_id": "User must be an active member of this organization."}
                )
        serializer.save()

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted"])

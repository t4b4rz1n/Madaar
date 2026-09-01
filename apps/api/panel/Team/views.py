from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter

from common.utils.mixins import FieldFilterOverviewMixin
from organizations.models import OrganizationMembership, Team, TeamMembership

from .serializers import TeamMembershipSerializer, TeamSerializer


class StaffTeamViewSet(FieldFilterOverviewMixin, viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
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
        team_id = self.request.data.get("team")
        team = Team.objects.filter(id=team_id, is_deleted=False).select_related("organization").first()
        if not team:
            raise ValidationError({"team": "Team not found."})
        user_id = self.request.data.get("user_id") or self.request.data.get("user")
        if not OrganizationMembership.objects.filter(
            user_id=user_id, organization=team.organization, is_deleted=False
        ).exists():
            raise ValidationError({"user_id": "User is not an active member of this organization."})
        instance, _ = TeamMembership.objects.update_or_create(
            user_id=user_id,
            team=team,
            defaults={
                "role": serializer.validated_data.get("role", TeamMembership.Role.MEMBER),
                "is_deleted": False,
            },
        )
        serializer.instance = instance

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted"])

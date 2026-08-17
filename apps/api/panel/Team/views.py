from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, viewsets
from rest_framework.filters import OrderingFilter, SearchFilter

from common.utils.mixins import FieldFilterOverviewMixin
from organizations.models import Team

from .serializers import SquadSerializer, TeamSerializer


class StaffTeamViewSet(FieldFilterOverviewMixin, viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TeamSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]

    def get_queryset(self):
        user = self.request.user
        qs = Team.objects.filter(is_deleted=False, parent_team__isnull=True).select_related("organization")
        if not (user.is_staff or user.is_superuser):
            org_ids = user.org_memberships.filter(is_deleted=False).values_list(
                "organization_id", flat=True
            )
            qs = qs.filter(organization_id__in=org_ids)
        return qs.order_by("-created_at")


class StaffSquadViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SquadSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    search_fields = ["name", "description"]

    def get_queryset(self):
        user = self.request.user
        qs = Team.objects.filter(is_deleted=False, parent_team__isnull=False).select_related("parent_team")
        if not (user.is_staff or user.is_superuser):
            org_ids = user.org_memberships.filter(is_deleted=False).values_list(
                "organization_id", flat=True
            )
            qs = qs.filter(organization_id__in=org_ids)

        team_id = self.request.query_params.get("team_id")
        if team_id:
            qs = qs.filter(parent_team_id=team_id)

        return qs.order_by("-created_at")

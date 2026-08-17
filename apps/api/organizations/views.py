from django.db.models import Count, Q
from django.db import transaction
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Organization
from .permissions import CanManageOrganization
from .serializers import OrganizationSerializer


class OrganizationViewSet(viewsets.ModelViewSet):
    """
    Provides organization discovery and lifecycle management.

    Every authenticated member can see organizations they belong to. Only
    the organization owner, an organization admin, or staff can update or
    delete an existing organization. A new organization is owned by the
    authenticated user and its owner membership is created by the model
    signal.
    """

    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        queryset = Organization.objects.annotate(
            member_count=Count(
                "memberships",
                filter=Q(memberships__is_deleted=False),
                distinct=True,
            ),
            team_count=Count("teams", distinct=True),
            project_count=Count(
                "projects",
                filter=Q(projects__is_deleted=False),
                distinct=True,
            ),
        ).select_related("owner")

        if user.is_staff or user.is_superuser:
            return queryset

        return queryset.filter(
            Q(owner=user)
            | Q(memberships__user=user, memberships__is_deleted=False)
        ).distinct()

    def get_permissions(self):
        if self.action in ("update", "partial_update", "destroy"):
            return [IsAuthenticated(), CanManageOrganization()]
        return [IsAuthenticated()]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        organization = serializer.save(owner=request.user)
        response_serializer = self.get_serializer(self.get_queryset().get(pk=organization.pk))
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

from django.db import transaction
from django.db.models import Count, Q
from rest_framework import permissions, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Organization
from .permissions import CanManageOrganization
from .serializers import OrganizationSerializer


class CanCreateOrganization(permissions.BasePermission):
    """
    Determines who can create a new organization (tenant).

    Allowed:
    - Staff and superusers (always).
    - Users who hold the `org.manage_settings` permission in ANY existing org.
    - Authenticated users who are not yet a member of any organization
      (first-time setup flow — they need to create their first workspace).
    """

    message = "You do not have permission to create an organization."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        # Staff / superusers always allowed
        if user.is_staff or user.is_superuser:
            return True

        # Allow users who have org.manage_settings in ANY organization they belong to
        from organizations.models import OrganizationMembership
        from organizations.services import PermissionService

        memberships = OrganizationMembership.objects.filter(
            user=user, is_deleted=False
        ).values_list("organization_id", flat=True)

        # First-time user: not a member of any org yet — allow them to create their first org
        if not memberships.exists():
            return True

        # Check if they have org.manage_settings in any of their orgs
        for org_id in memberships:
            if PermissionService.has_permission(user, "org.manage_settings", org_id):
                return True

        return False


class OrganizationViewSet(viewsets.ModelViewSet):
    """
    Provides organization discovery and lifecycle management.

    Every authenticated member can see organizations they belong to. Only
    the organization owner, an organization admin, or staff can update or
    delete an existing organization. A new organization can be created by
    staff, superusers, users with org.manage_settings permission, or
    first-time users who do not yet belong to any organization.
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
            Q(owner=user) | Q(memberships__user=user, memberships__is_deleted=False)
        ).distinct()

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), CanCreateOrganization()]
        if self.action in ("update", "partial_update", "destroy"):
            return [IsAuthenticated(), CanManageOrganization()]
        return [IsAuthenticated()]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        user = request.user
        has_permission = False

        if user.is_staff or user.is_superuser:
            has_permission = True
        elif not user.org_memberships.filter(is_deleted=False).exists():
            has_permission = True
        else:
            from organizations.services import PermissionService

            for mem in user.org_memberships.filter(is_deleted=False):
                if PermissionService.has_permission(
                    user, "org.manage_settings", mem.organization_id
                ):
                    has_permission = True
                    break

        if not has_permission:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied(
                "Only administrators or users without an organization can create new organizations."
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        organization = serializer.save(owner=request.user)
        response_serializer = self.get_serializer(self.get_queryset().get(pk=organization.pk))
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

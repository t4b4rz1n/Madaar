from django.db import IntegrityError, transaction
from django.db.models import Count, Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Organization, OrganizationMembership, Role, Team, TeamMembership
from .permissions import CanManageOrganization
from .serializers import (
    AddOrgMemberSerializer,
    OrganizationMemberSerializer,
    OrganizationSerializer,
)


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
        queryset = (
            Organization.objects.filter(is_deleted=False)
            .annotate(
                member_count=Count(
                    "memberships",
                    filter=Q(memberships__is_deleted=False),
                    distinct=True,
                ),
                team_count=Count(
                    "teams",
                    filter=Q(teams__parent_team__isnull=True, teams__is_deleted=False),
                    distinct=True,
                ),
                project_count=Count(
                    "projects",
                    filter=Q(projects__is_deleted=False),
                    distinct=True,
                ),
            )
            .select_related("owner")
        )

        if user.is_staff or user.is_superuser:
            return queryset

        return queryset.filter(
            Q(owner=user) | Q(memberships__user=user, memberships__is_deleted=False)
        ).distinct()

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), CanCreateOrganization()]
        if self.action in ("update", "partial_update", "destroy", "members", "remove_member"):
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

        has_active_org = OrganizationMembership.objects.filter(
            user=request.user,
            is_deleted=False,
            organization__is_deleted=False,
        ).exists()
        if has_active_org and not getattr(request.user, "is_superuser", False):
            return Response(
                {"detail": "User already belongs to an active organization."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        OrganizationMembership.all_objects.filter(
            user=request.user,
            is_deleted=False,
            organization__is_deleted=True,
        ).update(is_deleted=True)

        organization = serializer.save(owner=request.user)
        response_serializer = self.get_serializer(self.get_queryset().get(pk=organization.pk))
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        organization = self.get_object()

        with transaction.atomic():
            OrganizationMembership.objects.filter(organization=organization).update(is_deleted=True)
            TeamMembership.objects.filter(team__organization=organization).update(is_deleted=True)
            Team.objects.filter(organization=organization).update(is_deleted=True)

            # Cascade soft-delete projects safely
            try:
                from projects.models import Project

                Project.objects.filter(organization=organization).update(is_deleted=True)
            except (ImportError, AttributeError):
                pass

            Organization.objects.filter(pk=organization.pk).update(is_deleted=True)

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get", "post"], url_path="members")
    def members(self, request, pk=None):
        organization = self.get_object()

        if request.method == "GET":
            memberships = (
                OrganizationMembership.objects.filter(
                    organization=organization,
                    is_deleted=False,
                )
                .select_related("user")
                .order_by("-created_at")
            )
            serializer = OrganizationMemberSerializer(memberships, many=True)
            return Response(serializer.data)

        elif request.method == "POST":
            serializer = AddOrgMemberSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            user_id = serializer.validated_data["user_id"]
            raw_role = serializer.validated_data.get("role_id")

            # Resolve Role object and map to valid OrganizationMembership.Role choice
            role_obj = None
            legacy_role = OrganizationMembership.Role.EMPLOYEE
            if raw_role:
                role_obj = (
                    Role.objects.filter(
                        id=raw_role, organization=organization, is_deleted=False
                    ).first()
                    or Role.objects.filter(
                        name__iexact=str(raw_role), organization=organization, is_deleted=False
                    ).first()
                    or Role.objects.filter(id=raw_role, is_deleted=False).first()
                )
                if role_obj:
                    name_lower = role_obj.name.lower().replace(" ", "_")
                    if name_lower in [c[0] for c in OrganizationMembership.Role.choices]:
                        legacy_role = name_lower
                    elif "admin" in name_lower:
                        legacy_role = OrganizationMembership.Role.ADMIN
                    else:
                        legacy_role = OrganizationMembership.Role.EMPLOYEE
                elif raw_role in [c[0] for c in OrganizationMembership.Role.choices]:
                    legacy_role = raw_role

            try:
                with transaction.atomic():
                    if (
                        OrganizationMembership.objects.filter(
                            user_id=user_id,
                            is_deleted=False,
                            organization__is_deleted=False,
                        )
                        .exclude(organization=organization)
                        .exists()
                    ):
                        return Response(
                            {"detail": "User already belongs to another active organization."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    # Look up existing membership including soft-deleted records
                    membership = OrganizationMembership.all_objects.filter(
                        organization=organization, user_id=user_id
                    ).first()

                    if membership:
                        # Restore soft-deleted membership
                        membership.is_deleted = False
                        membership.role = legacy_role
                        membership.invited_by = (
                            request.user if request.user.is_authenticated else None
                        )
                        membership.save()
                        if role_obj:
                            membership.dynamic_roles.set([role_obj])
                        created = False
                    else:
                        membership = OrganizationMembership.objects.create(
                            user_id=user_id,
                            organization=organization,
                            role=legacy_role,
                            invited_by=request.user if request.user.is_authenticated else None,
                        )
                        if role_obj:
                            membership.dynamic_roles.set([role_obj])
                        created = True
            except IntegrityError:
                return Response(
                    {"detail": "User already belongs to another active organization."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            response_serializer = OrganizationMemberSerializer(membership)
            status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
            return Response(response_serializer.data, status=status_code)

    @action(detail=True, methods=["delete"], url_path="members/(?P<user_id>[^/.]+)")
    def remove_member(self, request, pk=None, user_id=None):
        organization = self.get_object()

        if str(organization.owner_id) == user_id:
            return Response(
                {"detail": "Cannot remove the organization owner."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        membership = (
            OrganizationMembership.all_objects.filter(
                organization=organization,
            )
            .filter(Q(user_id=user_id) | Q(id=user_id))
            .first()
        )

        if membership:
            membership.is_deleted = True
            membership.save(update_fields=["is_deleted"])

        return Response({"detail": "Member removed."}, status=status.HTTP_200_OK)

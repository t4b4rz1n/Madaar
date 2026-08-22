from django.db.models import Count, Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from access_control.permissions import HasPermission

from .models import Organization, OrganizationMembership, Team, TeamMembership
from .serializers import (
    OrganizationMembershipSerializer,
    OrganizationSerializer,
    TeamMembershipSerializer,
    TeamSerializer,
)
from .services import (
    add_team_member,
    archive_organization,
    change_member_role,
    change_team_member_role,
    create_organization,
    get_team,
    list_team_memberships,
    remove_member,
    remove_team_member,
    restore_organization,
    transfer_ownership,
)


class PermissionedViewSetMixin:
    permission_map = {}

    def get_permissions(self):
        permission = self.permission_map.get(self.action)

        if permission is not None:
            self.required_permission = permission

        return super().get_permissions()


class OrganizationViewSet(PermissionedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated, HasPermission]

    permission_map = {
        "list": "organizations.view",
        "retrieve": "organizations.view",
        "create": "organizations.create",
        "update": "organizations.update",
        "partial_update": "organizations.update",
        "destroy": "organizations.delete",
        "archive": "organizations.archive",
        "restore": "organizations.restore",
    }

    def get_queryset(self):
        if self.action == "restore":
            return Organization.objects.filter(
                status=Organization.Status.ARCHIVED,
                is_deleted=False,
            )

        return (
            Organization.objects.annotate(
                member_count=Count(
                    "memberships",
                    filter=Q(memberships__is_deleted=False),
                    distinct=True,
                ),
                team_count=Count("teams", filter=Q(teams__is_deleted=False), distinct=True),
                project_count=Count(
                    "projects",
                    filter=Q(projects__is_deleted=False),
                    distinct=True,
                ),
            )
            .select_related("owner")
            .filter(is_deleted=False)
        )

    def get_permission_context(self, request):
        return {
            "organization_id": self.kwargs.get("pk"),
        }

    def list(self, request, *args, **kwargs):
        queryset = (
            self.get_queryset()
            .filter(
                memberships__user=request.user,
                memberships__is_deleted=False,
                is_deleted=False,
                status=Organization.Status.ACTIVE,
            )
            .distinct()
        )

        serializer = self.get_serializer(queryset, many=True)

        return Response(serializer.data)

    def perform_create(self, serializer):
        organization = create_organization(self.request.user, serializer.validated_data)

        serializer.instance = organization

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted"])

    @action(detail=True, methods=["post"])
    def archive(self, request, *args, **kwargs):
        organization = self.get_object()

        archive_organization(organization, request.user)

        organization.refresh_from_db()

        return Response(
            self.get_serializer(organization).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def restore(self, request, *args, **kwargs):
        organization = self.get_object()

        restore_organization(organization, request.user)

        organization.refresh_from_db()

        return Response(
            self.get_serializer(organization).data,
            status=status.HTTP_200_OK,
        )


class OrganizationMembershipViewSet(PermissionedViewSetMixin, viewsets.GenericViewSet):
    serializer_class = OrganizationMembershipSerializer
    permission_classes = [IsAuthenticated, HasPermission]
    queryset = OrganizationMembership.objects.all()
    lookup_field = "id"

    permission_map = {
        "destroy": "members.remove",
        "change_role": "members.change_role",
        "transfer_ownership": "members.transfer_ownership",
    }

    def get_permission_context(self, request):
        membership = self.get_object()

        return {"organization_id": membership.organization_id}

    def destroy(self, request, *args, **kwargs):
        membership = self.get_object()

        remove_member(membership, request.user)

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["patch"])
    def change_role(self, request, *args, **kwargs):
        membership = self.get_object()

        serializer = self.get_serializer(
            membership,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)

        new_role_code = serializer.validated_data.get("role_code")

        if not new_role_code:
            raise ValidationError({"role_code": "This field is required."})

        change_member_role(membership, new_role_code, request.user)

        membership.refresh_from_db()

        return Response(self.get_serializer(membership).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def transfer_ownership(self, request, *args, **kwargs):
        membership = self.get_object()

        new_owner_id = request.data.get("new_owner_id")

        if not new_owner_id:
            raise ValidationError({"new_owner_id": "This field is required."})

        transfer_ownership(membership, new_owner_id, request.user)

        membership.refresh_from_db()

        return Response(self.get_serializer(membership).data, status=status.HTTP_200_OK)


class TeamViewSet(PermissionedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = TeamSerializer
    permission_classes = [IsAuthenticated, HasPermission]

    permission_map = {
        "list": "teams.view",
        "retrieve": "teams.view",
        "create": "teams.create",
        "update": "teams.update",
        "partial_update": "teams.update",
        "destroy": "teams.delete",
    }

    def get_queryset(self):
        return Team.objects.filter(
            organization_id=self.kwargs["organization_pk"],
            is_deleted=False,
        )

    def get_permission_context(self, request):
        if self.action in ("list", "create"):
            return {
                "organization_id": self.kwargs["organization_pk"],
            }

        team = self.get_object()

        return {"organization_id": team.organization_id, "team_id": team.id}

    def perform_create(self, serializer):
        serializer.save(organization_id=self.kwargs["organization_pk"])

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted"])


class TeamMembershipViewSet(PermissionedViewSetMixin, viewsets.GenericViewSet):
    serializer_class = TeamMembershipSerializer
    permission_classes = [IsAuthenticated, HasPermission]
    lookup_field = "id"

    permission_map = {
        "list": "team_members.view",
        "create": "team_members.add",
        "destroy": "team_members.remove",
        "change_role": "team_members.change_role",
    }

    def get_team(self):
        return get_team(
            organization_id=self.kwargs["organization_pk"],
            team_id=self.kwargs["team_pk"],
        )

    def get_permission_context(self, request):
        return {
            "organization_id": self.kwargs["organization_pk"],
            "team_id": self.kwargs["team_pk"],
        }

    def get_queryset(self):
        return TeamMembership.objects.filter(
            team_id=self.kwargs["team_pk"],
            team__organization_id=self.kwargs["organization_pk"],
            is_deleted=False,
        ).select_related("team", "role")

    def list(self, request, *args, **kwargs):
        team = self.get_team()

        memberships = list_team_memberships(team)

        serializer = self.get_serializer(memberships, many=True)

        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        membership = add_team_member(
            team=self.get_team(),
            user=serializer.validated_data["user"],
            role_code=serializer.validated_data.get("role_code", "member"),
        )

        membership.refresh_from_db()

        return Response(self.get_serializer(membership).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        membership = self.get_object()

        remove_team_member(membership, request.user)

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["patch"])
    def change_role(self, request, *args, **kwargs):
        membership = self.get_object()

        serializer = self.get_serializer(membership, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        new_role_code = serializer.validated_data.get("role_code")

        if not new_role_code:
            raise ValidationError({"role_code": "This field is required."})

        change_team_member_role(membership, new_role_code, request.user)

        membership.refresh_from_db()

        return Response(self.get_serializer(membership).data, status=status.HTTP_200_OK)

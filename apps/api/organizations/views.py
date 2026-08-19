from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from access_control.permissions import HasPermission

from .models import Organization, OrganizationMembership, Team, TeamMembership
from .permissions import (
    MemberPermissions,
    OrganizationPermissions,
    TeamMemberPermissions,
    TeamPermissions,
)
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


class OrganizationListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = OrganizationSerializer

    def get_queryset(self):
        # Only show organizations where user has an active, non-deleted membership
        return Organization.objects.filter(
            memberships__user=self.request.user,
            memberships__is_deleted=False,
            is_deleted=False,
            status=Organization.Status.ACTIVE,
        ).distinct()

    def perform_create(self, serializer):
        organization = create_organization(self.request.user, serializer.validated_data)
        serializer.instance = organization


class OrganizationRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, HasPermission]
    serializer_class = OrganizationSerializer
    lookup_field = "pk"

    def get_queryset(self):
        return Organization.objects.filter(is_deleted=False)

    def get_permission_context(self, request):
        return {"organization_id": self.kwargs.get("pk")}

    def get_permissions(self):
        if self.request.method == "GET":
            self.required_permission = OrganizationPermissions.VIEW
        elif self.request.method in ("PUT", "PATCH"):
            self.required_permission = OrganizationPermissions.UPDATE
        elif self.request.method == "DELETE":
            self.required_permission = OrganizationPermissions.DELETE
        return super().get_permissions()

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted"])


class OrganizationArchiveView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = OrganizationPermissions.ARCHIVE
    serializer_class = OrganizationSerializer
    lookup_field = "pk"

    def get_queryset(self):
        return Organization.objects.filter(is_deleted=False)

    def get_permission_context(self, request):
        return {"organization_id": self.kwargs.get("pk")}

    def perform_update(self, serializer):
        archive_organization(serializer.instance, self.request.user)


class OrganizationRestoreView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = OrganizationPermissions.RESTORE
    queryset = Organization.objects.filter(status=Organization.Status.ARCHIVED)
    serializer_class = OrganizationSerializer

    def perform_update(self, serializer):
        restore_organization(serializer.instance, self.request.user)

    def get_permission_context(self, request):
        return {"organization_id": self.kwargs.get("pk")}


class TeamListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, HasPermission]
    serializer_class = TeamSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            self.required_permission = TeamPermissions.VIEW
        else:
            self.required_permission = TeamPermissions.CREATE
        return super().get_permissions()

    def get_queryset(self):
        org_id = self.kwargs.get("organization_id")
        return Team.objects.filter(organization_id=org_id, is_deleted=False)

    def perform_create(self, serializer):
        org_id = self.kwargs.get("organization_id")
        serializer.save(organization_id=org_id)


class TeamRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, HasPermission]
    queryset = Team.objects.filter(is_deleted=False)
    serializer_class = TeamSerializer

    def get_permission_context(self, request):
        team = self.get_object()
        return {"organization_id": team.organization_id, "team_id": team.id}

    def get_permissions(self):
        if self.request.method == "GET":
            self.required_permission = TeamPermissions.VIEW
        elif self.request.method == "PUT" or self.request.method == "PATCH":
            self.required_permission = TeamPermissions.UPDATE
        elif self.request.method == "DELETE":
            self.required_permission = TeamPermissions.DELETE
        return super().get_permissions()


class MembershipRemoveView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = MemberPermissions.REMOVE
    queryset = OrganizationMembership.objects.all()
    lookup_field = "id"

    def get_permission_context(self, request):
        membership = self.get_object()
        return {"organization_id": membership.organization_id}

    def destroy(self, request, *args, **kwargs):
        membership = self.get_object()
        remove_member(membership, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MembershipChangeRoleView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = MemberPermissions.CHANGE_ROLE
    queryset = OrganizationMembership.objects.all()
    lookup_field = "id"
    serializer_class = OrganizationMembershipSerializer

    def get_permission_context(self, request):
        membership = self.get_object()
        return {"organization_id": membership.organization_id}

    def perform_update(self, serializer):
        new_role_code = serializer.validated_data.get("role_code")
        if not new_role_code:
            raise ValidationError({"role_code": "This field is required."})
        obj = self.get_object()
        change_member_role(obj, new_role_code, self.request.user)
        serializer.instance = obj


class MembershipTransferOwnershipView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = MemberPermissions.TRANSFER_OWNERSHIP
    queryset = OrganizationMembership.objects.filter(role__code="owner")
    lookup_field = "id"
    serializer_class = OrganizationMembershipSerializer

    def get_permission_context(self, request):
        membership = self.get_object()
        return {"organization_id": membership.organization_id}

    def perform_update(self, serializer):
        new_owner_id = self.request.data.get("new_owner_id")
        if not new_owner_id:
            raise ValidationError({"new_owner_id": "This field is required."})
        current_membership = self.get_object()
        transfer_ownership(current_membership, new_owner_id, self.request.user)
        serializer.instance = current_membership


class TeamMembershipListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, HasPermission]
    serializer_class = TeamMembershipSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            self.required_permission = TeamMemberPermissions.VIEW
        else:
            self.required_permission = TeamMemberPermissions.ADD
        return super().get_permissions()

    def get_team(self):
        return get_team(self.kwargs.get("organization_id"), self.kwargs.get("team_id"))

    def get_permission_context(self, request):
        return {
            "organization_id": self.kwargs.get("organization_id"),
            "team_id": self.kwargs.get("team_id"),
        }

    def get_queryset(self):
        return list_team_memberships(self.get_team())

    def perform_create(self, serializer):
        team = self.get_team()
        membership = add_team_member(
            team=team,
            user=serializer.validated_data["user"],
            role_code=serializer.validated_data.get("role_code", "member"),
        )
        serializer.instance = membership


class TeamMembershipRemoveView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = TeamMemberPermissions.REMOVE
    lookup_field = "id"

    def get_permission_context(self, request):
        membership = self.get_object()
        return {"organization_id": membership.team.organization_id, "team_id": membership.team_id}

    def get_queryset(self):
        return TeamMembership.objects.filter(
            team_id=self.kwargs.get("team_id"),
            team__organization_id=self.kwargs.get("organization_id"),
            is_deleted=False,
        ).select_related("team", "role")

    def destroy(self, request, *args, **kwargs):
        membership = self.get_object()
        remove_team_member(membership, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class TeamMembershipChangeRoleView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = TeamMemberPermissions.CHANGE_ROLE
    lookup_field = "id"
    serializer_class = TeamMembershipSerializer

    def get_permission_context(self, request):
        membership = self.get_object()
        return {"organization_id": membership.team.organization_id, "team_id": membership.team_id}

    def get_queryset(self):
        return TeamMembership.objects.filter(
            team_id=self.kwargs.get("team_id"),
            team__organization_id=self.kwargs.get("organization_id"),
            is_deleted=False,
        ).select_related("team", "role")

    def perform_update(self, serializer):
        new_role_code = serializer.validated_data.get("role_code")
        if not new_role_code:
            raise ValidationError({"role_code": "This field is required."})
        membership = self.get_object()
        change_team_member_role(membership, new_role_code, self.request.user)
        serializer.instance = membership

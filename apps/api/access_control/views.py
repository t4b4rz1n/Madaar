from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.exceptions import MethodNotAllowed
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from access_control.permissions import HasPermission
from organizations.models import Organization

from .models import Permission, Role
from .serializers import (
    PermissionSerializer,
    RoleCreateUpdateSerializer,
    RoleSerializer,
    UserEffectivePermissionsSerializer,
)
from .services import create_role, get_user_permission_breakdown, update_role

User = get_user_model()


class PermissionListView(generics.ListAPIView):
    """List the permission registry for one organization administrator."""

    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = "access_control.view_permission"
    serializer_class = PermissionSerializer
    queryset = Permission.objects.filter(is_deleted=False)
    filterset_fields = ["module", "group"]
    search_fields = ["code", "name", "description"]


class RoleListCreateView(generics.ListCreateAPIView):
    """Manage organization-local role presets."""

    permission_classes = [IsAuthenticated, HasPermission]

    def get_queryset(self):
        return Role.objects.filter(organization_id=self.kwargs["organization_id"])

    def get_serializer_class(self):
        return RoleCreateUpdateSerializer if self.request.method == "POST" else RoleSerializer

    def get_required_permission(self, request):
        return (
            "access_control.create_role" if request.method == "POST" else "access_control.view_role"
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        organization = get_object_or_404(
            Organization,
            pk=self.kwargs["organization_id"],
            is_deleted=False,
        )
        permission_codes = serializer.validated_data.pop("permission_codes", None)
        role = create_role(
            organization=organization,
            name=serializer.validated_data["name"],
            code=serializer.validated_data["code"],
            description=serializer.validated_data.get("description", ""),
            is_active=serializer.validated_data.get("is_active", True),
            permission_codes=permission_codes,
        )
        return Response(RoleSerializer(role).data, status=status.HTTP_201_CREATED)


class RoleDetailUpdateView(generics.RetrieveUpdateAPIView):
    """Retrieve or edit one role preset in its owning organization."""

    permission_classes = [IsAuthenticated, HasPermission]
    lookup_field = "pk"

    def get_queryset(self):
        return Role.objects.filter(organization_id=self.kwargs["organization_id"])

    def get_serializer_class(self):
        return (
            RoleCreateUpdateSerializer
            if self.request.method in ("PUT", "PATCH")
            else RoleSerializer
        )

    def get_required_permission(self, request):
        return (
            "access_control.update_role"
            if request.method in ("PUT", "PATCH")
            else "access_control.view_role"
        )

    def update(self, request, *args, **kwargs):
        role = self.get_object()
        serializer = self.get_serializer(role, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        permission_codes = serializer.validated_data.pop("permission_codes", None)
        role = update_role(
            role=role,
            name=serializer.validated_data.get("name"),
            description=serializer.validated_data.get("description"),
            is_active=serializer.validated_data.get("is_active"),
            permission_codes=permission_codes,
        )
        return Response(RoleSerializer(role).data)

    def delete(self, request, *args, **kwargs):
        raise MethodNotAllowed(
            "DELETE", detail="Role deletion is forbidden. Deactivate it instead."
        )


class MembershipEffectivePermissionsView(APIView):
    """Show the permissions inherited from a user's role in one organization."""

    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = "users.view_user"

    def get(self, request, organization_id, user_id):
        user = get_object_or_404(User, pk=user_id, is_deleted=False)
        breakdown = get_user_permission_breakdown(
            user,
            organization_id,
            team_id=request.query_params.get("team_id"),
        )
        return Response(UserEffectivePermissionsSerializer(breakdown).data)

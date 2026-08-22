from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from access_control.permissions import HasPermission
from organizations.models import Organization, OrganizationMembership

from .serializers import UserSerializer, UserUpdateSerializer
from .services import create_organization_user, soft_delete_user

User = get_user_model()


class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserUpdateSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        return self.request.user


class UserListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, HasPermission]
    serializer_class = UserSerializer
    search_fields = ["email", "username", "first_name", "last_name"]
    filterset_fields = ["is_active", "is_staff"]

    def get_required_permission(self, request):
        if request.method == "POST":
            return "users.create_user"
        return "users.view_user"

    def get_queryset(self):
        return User.objects.filter(
            org_memberships__organization_id=self.kwargs["organization_id"],
            org_memberships__is_deleted=False,
            is_deleted=False,
        ).distinct()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        organization = get_object_or_404(
            Organization,
            pk=self.kwargs["organization_id"],
            is_deleted=False,
        )
        user = create_organization_user(
            organization=organization,
            user_data=serializer.validated_data,
            role_code=request.data.get("role_code", "employee"),
        )
        return_response = self.get_serializer(user)
        return Response(return_response.data, status=status.HTTP_201_CREATED)


class UserRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, HasPermission]
    serializer_class = UserSerializer
    lookup_field = "pk"

    def get_required_permission(self, request):
        if request.method == "GET":
            return "users.view_user"
        elif request.method in ("PUT", "PATCH"):
            return "users.update_user"
        elif request.method == "DELETE":
            return "users.delete_user"
        return "users.view_user"

    def get_queryset(self):
        return User.objects.filter(
            org_memberships__organization_id=self.kwargs["organization_id"],
            org_memberships__is_deleted=False,
            is_deleted=False,
        ).distinct()

    def perform_destroy(self, instance):
        soft_delete_user(instance)

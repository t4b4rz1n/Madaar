from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from organizations.models import OrganizationMembership
from rest_framework import viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from accounts.models import User
from common.utils.mixins import FieldFilterOverviewMixin

from .filters import UserFilter
from .serializers import UserCreateSerializer, UserListSerializer, UserUpdateSerializer


class UserViewSet(FieldFilterOverviewMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = User.objects.all().order_by("-date_joined")
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = UserFilter
    search_fields = ["username", "email", "first_name", "last_name"]
    ordering_fields = ["date_joined", "username", "email"]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        queryset = User.objects.all().order_by("-date_joined")
        unassigned = self.request.query_params.get("unassigned")
        if unassigned and unassigned.lower() in ("true", "1"):
            queryset = queryset.exclude(
                org_memberships__is_deleted=False
            )
        return queryset

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        if self.action in ["update", "partial_update"]:
            return UserUpdateSerializer
        if self.action == "list":
            return UserListSerializer
        return UserUpdateSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user_id = instance.pk
        with transaction.atomic():
            if hasattr(instance, "org_memberships"):
                instance.org_memberships.all().delete()
            if hasattr(instance, "memberships"):
                instance.memberships.all().delete()
            # Direct database hard delete to ensure DB record removal
            User.objects.filter(pk=user_id).delete()
        return Response({"status": True, "message": "User deleted successfully", "data": None}, status=status.HTTP_200_OK)

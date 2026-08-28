from django.db import transaction
from django.db.models import Count, Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Organization
from .models import OrganizationMembership
from .permissions import CanManageOrganization
from .serializers import AddOrgMemberSerializer
from .serializers import OrganizationMemberSerializer
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
            Q(owner=user) | Q(memberships__user=user, memberships__is_deleted=False)
        ).distinct()

    def get_permissions(self):
        if self.action in ("update", "partial_update", "destroy", "members", "remove_member"):
            return [IsAuthenticated(), CanManageOrganization()]
        return [IsAuthenticated()]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        organization = serializer.save(owner=request.user)
        response_serializer = self.get_serializer(self.get_queryset().get(pk=organization.pk))
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"], url_path="members")
    def members(self, request, pk=None):
        organization = self.get_object()

        if request.method == "GET":
            memberships = OrganizationMembership.objects.filter(
                organization=organization,
                is_deleted=False,
            ).select_related("user").order_by("-created_at")
            serializer = OrganizationMemberSerializer(memberships, many=True)
            return Response(serializer.data)

        elif request.method == "POST":
            serializer = AddOrgMemberSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            user_id = serializer.validated_data["user_id"]
            role_id = serializer.validated_data.get("role_id") or OrganizationMembership.Role.EMPLOYEE

            with transaction.atomic():
                # Look up existing membership including soft-deleted records
                membership = OrganizationMembership.all_objects.filter(
                    organization=organization, user_id=user_id
                ).first()

                if membership:
                    # Restore soft-deleted membership
                    membership.is_deleted = False
                    membership.role = role_id
                    membership.invited_by = request.user if request.user.is_authenticated else None
                    membership.save()
                    created = False
                else:
                    membership = OrganizationMembership.objects.create(
                        user_id=user_id,
                        organization=organization,
                        role=role_id,
                        invited_by=request.user if request.user.is_authenticated else None,
                    )
                    created = True

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

        membership = OrganizationMembership.objects.filter(
            organization=organization,
        ).filter(Q(user_id=user_id) | Q(id=user_id)).first()

        if membership:
            membership.is_deleted = True
            membership.save(update_fields=["is_deleted", "updated_at"])

        return Response(status=status.HTTP_204_NO_CONTENT)

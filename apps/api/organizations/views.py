from django.db import IntegrityError, transaction
from django.db.models import Count, Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Organization, OrganizationMembership, Team, TeamMembership
from .permissions import CanManageOrganization
from .serializers import (
    AddOrgMemberSerializer,
    OrganizationMemberSerializer,
    OrganizationSerializer,
)


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
        queryset = Organization.objects.filter(is_deleted=False).annotate(
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

        has_active_org = OrganizationMembership.objects.filter(
            user=request.user,
            is_deleted=False,
            organization__is_deleted=False,
        ).exists()
        if has_active_org:
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

            try:
                with transaction.atomic():
                    if OrganizationMembership.objects.filter(
                        user_id=user_id,
                        is_deleted=False,
                        organization__is_deleted=False,
                    ).exclude(organization=organization).exists():
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

        membership = OrganizationMembership.all_objects.filter(
            organization=organization,
        ).filter(Q(user_id=user_id) | Q(id=user_id)).first()

        if membership:
            membership.is_deleted = True
            membership.save(update_fields=["is_deleted"])

        return Response({"detail": "Member removed."}, status=status.HTTP_200_OK)

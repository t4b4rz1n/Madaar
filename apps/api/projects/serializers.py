"""
projects/serializers.py
-----------------------
DRF serializers for the projects application.

Design:
    * **Read serializers** (``…ListSerializer``, ``…DetailSerializer``,
      ``…ReadSerializer``) embed nested objects for rich responses.
    * **Write serializers** (``…WriteSerializer``) accept flat ``_id``
      fields and perform cross-field validation.
    * Annotated fields (``member_count``, ``task_count``, etc.) declare
      ``default=0`` so the serialiser works correctly on freshly-created
      model instances that have not yet been annotated by the queryset.
"""

from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from accounts.models import User
from organizations.models import Organization, Team

from .models import Milestone, Project, ProjectActivity, ProjectMember


# ---------------------------------------------------------------------------
# Nested / lightweight read serializers
# ---------------------------------------------------------------------------


class UserMinimalSerializer(serializers.ModelSerializer):
    """Compact user representation for nested embedding."""

    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "email", "full_name", "avatar")
        read_only_fields = fields

    @staticmethod
    def get_full_name(obj) -> str:
        return obj.get_full_name()


class OrganizationMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ("id", "name", "slug")
        read_only_fields = fields


class TeamMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ("id", "name")
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Project serializers
# ---------------------------------------------------------------------------


class ProjectListSerializer(serializers.ModelSerializer):
    """Lightweight serialiser used for list endpoints."""

    owner = UserMinimalSerializer(read_only=True)
    organization = OrganizationMinimalSerializer(read_only=True)
    team = TeamMinimalSerializer(read_only=True)

    # Annotated counts — default=0 prevents crashes on non-annotated objects
    member_count = serializers.IntegerField(read_only=True, default=0)
    task_count = serializers.IntegerField(read_only=True, default=0)
    milestone_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Project
        fields = (
            "id",
            "name",
            "description",
            "organization",
            "owner",
            "team",
            "status",
            "budget",
            "budget_currency",
            "start_date",
            "deadline",
            "completed_at",
            "archived_at",
            "member_count",
            "task_count",
            "milestone_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class ProjectDetailSerializer(ProjectListSerializer):
    """Full-detail serialiser — includes nested members and milestones."""

    members = serializers.SerializerMethodField()
    milestones = serializers.SerializerMethodField()

    class Meta(ProjectListSerializer.Meta):
        fields = ProjectListSerializer.Meta.fields + ("members", "milestones")

    @staticmethod
    def get_members(obj):
        qs = obj.members.filter(is_deleted=False).select_related("user", "team")
        return ProjectMemberReadSerializer(qs, many=True).data

    @staticmethod
    def get_milestones(obj):
        qs = obj.milestones.filter(is_deleted=False)
        return MilestoneSerializer(qs, many=True).data


class ProjectWriteSerializer(serializers.ModelSerializer):
    """Flat write serialiser for create / update operations."""

    owner_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="owner",
        required=False,
        allow_null=True,
    )
    organization_id = serializers.PrimaryKeyRelatedField(
        queryset=Organization.objects.all(),
        source="organization",
        required=False,
        allow_null=True,
    )
    team_id = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.all(),
        source="team",
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Project
        fields = (
            "name",
            "description",
            "organization_id",
            "owner_id",
            "team_id",
            "status",
            "budget",
            "budget_currency",
            "start_date",
            "deadline",
        )

    def validate(self, attrs: dict) -> dict:
        start = attrs.get("start_date", getattr(self.instance, "start_date", None))
        deadline = attrs.get("deadline", getattr(self.instance, "deadline", None))
        if start and deadline and deadline < start:
            raise serializers.ValidationError(
                {"deadline": _("Deadline must be on or after the start date.")}
            )

        # Ensure team belongs to the selected organisation
        team = attrs.get("team", getattr(self.instance, "team", None))
        org = attrs.get("organization", getattr(self.instance, "organization", None))
        if team and org and team.organization_id != org.pk:
            raise serializers.ValidationError(
                {"team_id": _("The selected team does not belong to this organisation.")}
            )

        return attrs


# ---------------------------------------------------------------------------
# ProjectMember serializers
# ---------------------------------------------------------------------------


class ProjectMemberReadSerializer(serializers.ModelSerializer):
    """Rich read serialiser for project members."""

    user = UserMinimalSerializer(read_only=True)
    team = TeamMinimalSerializer(read_only=True)

    class Meta:
        model = ProjectMember
        fields = (
            "id",
            "user",
            "team",
            "specialty",
            "allocation_percentage",
            "allocation_start_date",
            "allocation_end_date",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class ProjectMemberWriteSerializer(serializers.ModelSerializer):
    """Flat write serialiser for adding / updating project members."""

    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="user",
        required=False,
        allow_null=True,
    )
    team_id = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.all(),
        source="team",
        required=False,
        allow_null=True,
    )

    class Meta:
        model = ProjectMember
        fields = (
            "user_id",
            "team_id",
            "specialty",
            "allocation_percentage",
            "allocation_start_date",
            "allocation_end_date",
            "is_active",
        )

    def validate(self, attrs: dict) -> dict:
        user = attrs.get("user", getattr(self.instance, "user", None))
        team = attrs.get("team", getattr(self.instance, "team", None))

        # At least one of user / team is required
        if not user and not team:
            raise serializers.ValidationError(
                _("A project member must have either a user or a team assigned.")
            )

        # Duplicate membership check (only on create)
        if user and not self.instance:
            project_pk = self.context.get("project_pk")
            if project_pk and ProjectMember.objects.filter(
                project_id=project_pk, user=user, is_deleted=False
            ).exists():
                raise serializers.ValidationError(
                    {"user_id": _("This user is already a member of this project.")}
                )

        # Date range validation
        start = attrs.get(
            "allocation_start_date",
            getattr(self.instance, "allocation_start_date", None),
        )
        end = attrs.get(
            "allocation_end_date",
            getattr(self.instance, "allocation_end_date", None),
        )
        if start and end and end < start:
            raise serializers.ValidationError(
                {
                    "allocation_end_date": _(
                        "Allocation end date must be on or after the allocation start date."
                    )
                }
            )

        return attrs


# ---------------------------------------------------------------------------
# Milestone serializers
# ---------------------------------------------------------------------------


class MilestoneSerializer(serializers.ModelSerializer):
    """Read/write serialiser for milestones.

    ``completed_at`` is managed by the service layer and is therefore
    read-only via the API.
    """

    # default=0 prevents errors when object is not annotated
    task_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Milestone
        fields = (
            "id",
            "project",
            "title",
            "description",
            "status",
            "start_date",
            "target_date",
            "completed_at",
            "sequence",
            "task_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "project", "completed_at", "created_at", "updated_at")

    def validate(self, attrs: dict) -> dict:
        start = attrs.get("start_date", getattr(self.instance, "start_date", None))
        target = attrs.get("target_date", getattr(self.instance, "target_date", None))
        if start and target and target < start:
            raise serializers.ValidationError(
                {"target_date": _("Target date must be on or after the start date.")}
            )
        return attrs


# ---------------------------------------------------------------------------
# ProjectActivity serializer
# ---------------------------------------------------------------------------


class ProjectActivitySerializer(serializers.ModelSerializer):
    """Read-only serialiser for the project activity feed."""

    actor = UserMinimalSerializer(read_only=True)
    event_type_display = serializers.CharField(
        source="get_event_type_display", read_only=True
    )

    class Meta:
        model = ProjectActivity
        fields = (
            "id",
            "project",
            "actor",
            "event_type",
            "event_type_display",
            "entity_type",
            "entity_id",
            "metadata",
            "created_at",
        )
        read_only_fields = fields

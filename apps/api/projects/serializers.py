from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from accounts.models import User
from organizations.models import Organization, Team

from .models import Milestone, Project, ProjectActivity, ProjectMember


# ---------------------------------------------------------------------------
# Nested / Lightweight read serializers
# ---------------------------------------------------------------------------


class UserMinimalSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "email", "full_name", "avatar")

    def get_full_name(self, obj):
        return obj.get_full_name()


class OrganizationMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ("id", "name", "slug")


class TeamMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ("id", "name")


# ---------------------------------------------------------------------------
# Project
# ---------------------------------------------------------------------------


class ProjectListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""

    owner = UserMinimalSerializer(read_only=True)
    organization = OrganizationMinimalSerializer(read_only=True)
    team = TeamMinimalSerializer(read_only=True)
    member_count = serializers.IntegerField(read_only=True)
    task_count = serializers.IntegerField(read_only=True)
    milestone_count = serializers.IntegerField(read_only=True)

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


class ProjectDetailSerializer(ProjectListSerializer):
    """Full detail serializer including members & milestones."""

    members = serializers.SerializerMethodField()
    milestones = serializers.SerializerMethodField()

    class Meta(ProjectListSerializer.Meta):
        fields = ProjectListSerializer.Meta.fields + ("members", "milestones")

    def get_members(self, obj):
        qs = obj.members.filter(is_deleted=False).select_related("user", "team")
        return ProjectMemberReadSerializer(qs, many=True).data

    def get_milestones(self, obj):
        qs = obj.milestones.filter(is_deleted=False)
        return MilestoneSerializer(qs, many=True).data


class ProjectWriteSerializer(serializers.ModelSerializer):
    """Used for create / update operations."""

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

    def validate(self, attrs):
        start = attrs.get("start_date", getattr(self.instance, "start_date", None))
        deadline = attrs.get("deadline", getattr(self.instance, "deadline", None))
        if start and deadline and deadline < start:
            raise serializers.ValidationError(
                {"deadline": _("Deadline must be on or after the start date.")}
            )
        return attrs


# ---------------------------------------------------------------------------
# ProjectMember
# ---------------------------------------------------------------------------


class ProjectMemberReadSerializer(serializers.ModelSerializer):
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
        )


class ProjectMemberWriteSerializer(serializers.ModelSerializer):
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

    def validate(self, attrs):
        user = attrs.get("user", getattr(self.instance, "user", None))
        team = attrs.get("team", getattr(self.instance, "team", None))
        if not user and not team:
            raise serializers.ValidationError(
                _("A project member must have either a user or a team assigned.")
            )
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
# Milestone
# ---------------------------------------------------------------------------


class MilestoneSerializer(serializers.ModelSerializer):
    task_count = serializers.IntegerField(read_only=True)

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
        read_only_fields = ("project", "created_at", "updated_at")

    def validate(self, attrs):
        start = attrs.get("start_date", getattr(self.instance, "start_date", None))
        target = attrs.get("target_date", getattr(self.instance, "target_date", None))
        if start and target and target < start:
            raise serializers.ValidationError(
                {"target_date": _("Target date must be on or after the start date.")}
            )
        return attrs


# ---------------------------------------------------------------------------
# ProjectActivity
# ---------------------------------------------------------------------------


class ProjectActivitySerializer(serializers.ModelSerializer):
    actor = UserMinimalSerializer(read_only=True)

    class Meta:
        model = ProjectActivity
        fields = (
            "id",
            "project",
            "actor",
            "event_type",
            "entity_type",
            "entity_id",
            "metadata",
            "created_at",
        )
        read_only_fields = fields

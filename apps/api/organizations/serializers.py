from django.utils.text import slugify
from rest_framework import serializers

from accounts.models import User

from .models import Organization, OrganizationMembership, Team, TeamMembership


class OrganizationOwnerSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "email", "full_name", "avatar")
        read_only_fields = fields

    def get_full_name(self, obj):
        return obj.get_full_name()


class OrganizationSerializer(serializers.ModelSerializer):
    owner = OrganizationOwnerSerializer(read_only=True)
    member_count = serializers.IntegerField(read_only=True, default=0)
    team_count = serializers.IntegerField(read_only=True, default=0)
    project_count = serializers.IntegerField(read_only=True, default=0)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    slug = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Organization
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "status",
            "owner",
            "status_display",
            "member_count",
            "team_count",
            "project_count",
            "is_deleted",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "owner",
            "status_display",
            "member_count",
            "team_count",
            "project_count",
            "is_deleted",
            "created_at",
            "updated_at",
        )


class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = (
            "id",
            "name",
            "organization",
            "parent_team",
            "description",
            "is_deleted",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "organization", "is_deleted", "created_at", "updated_at")


class OrganizationMembershipSerializer(serializers.ModelSerializer):
    role_code = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = OrganizationMembership
        fields = (
            "id",
            "user",
            "organization",
            "role",
            "role_code",
            "is_deleted",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "organization",
            "role",
            "is_deleted",
            "created_at",
            "updated_at",
        )


class TeamMembershipSerializer(serializers.ModelSerializer):
    role_code = serializers.CharField(write_only=True, required=False, default="member")
    role_id = serializers.UUIDField(source="role.id", read_only=True)
    role_name = serializers.CharField(source="role.name", read_only=True)
    role_code_display = serializers.CharField(source="role.code", read_only=True)

    class Meta:
        model = TeamMembership
        fields = (
            "id",
            "user",
            "team",
            "role",
            "role_id",
            "role_name",
            "role_code",
            "role_code_display",
            "is_deleted",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "team",
            "role",
            "role_id",
            "role_name",
            "role_code_display",
            "is_deleted",
            "created_at",
            "updated_at",
        )

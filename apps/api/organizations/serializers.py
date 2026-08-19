from rest_framework import serializers

from .models import Organization, OrganizationMembership, Team, TeamMembership


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "status",
            "owner",
            "is_deleted",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "owner", "is_deleted", "created_at", "updated_at")


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

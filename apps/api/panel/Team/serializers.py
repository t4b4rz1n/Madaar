from rest_framework import serializers

from accounts.models import User
from organizations.models import Organization, Team, TeamMembership


class LeaderDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "first_name", "last_name", "email", "avatar")


class TeamSerializer(serializers.ModelSerializer):
    is_active = serializers.SerializerMethodField()
    lead_id = serializers.SerializerMethodField()
    leader_details = serializers.SerializerMethodField()
    squads_count = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = (
            "id",
            "name",
            "description",
            "organization",
            "parent_team",
            "is_active",
            "lead_id",
            "leader_details",
            "squads_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
            "squads_count",
            "lead_id",
            "leader_details",
        )

    def get_is_active(self, obj):
        return not obj.is_deleted

    def get_lead_id(self, obj):
        membership = TeamMembership.objects.filter(
            team=obj, role=TeamMembership.Role.LEAD, is_deleted=False
        ).first()
        return str(membership.user_id) if membership else None

    def get_leader_details(self, obj):
        membership = (
            TeamMembership.objects.filter(
                team=obj, role=TeamMembership.Role.LEAD, is_deleted=False
            )
            .select_related("user")
            .first()
        )
        if membership and membership.user:
            return LeaderDetailsSerializer(membership.user).data
        return None

    def get_squads_count(self, obj):
        return Team.objects.filter(parent_team=obj, is_deleted=False).count()

    def create(self, validated_data):
        request = self.context.get("request")
        lead_id = request.data.get("lead_id") if request else None
        validated_data.pop("is_active", None)

        if "organization" not in validated_data:
            if request and request.user.is_authenticated:
                user_org = request.user.org_memberships.filter(is_deleted=False).first()
                if user_org:
                    validated_data["organization"] = user_org.organization
                else:
                    first_org = Organization.objects.filter(is_deleted=False).first()
                    if first_org:
                        validated_data["organization"] = first_org
                    else:
                        raise serializers.ValidationError({"organization": "No organization found."})

        team = super().create(validated_data)

        if lead_id:
            user = User.objects.filter(id=lead_id).first()
            if user:
                TeamMembership.objects.update_or_create(
                    team=team,
                    user=user,
                    defaults={"role": TeamMembership.Role.LEAD, "is_deleted": False},
                )

        return team

    def update(self, instance, validated_data):
        request = self.context.get("request")
        lead_id = request.data.get("lead_id") if request else None
        validated_data.pop("is_active", None)

        team = super().update(instance, validated_data)

        if lead_id is not None:
            TeamMembership.objects.filter(team=team, role=TeamMembership.Role.LEAD).update(
                role=TeamMembership.Role.MEMBER
            )
            if lead_id:
                user = User.objects.filter(id=lead_id).first()
                if user:
                    TeamMembership.objects.update_or_create(
                        team=team,
                        user=user,
                        defaults={"role": TeamMembership.Role.LEAD, "is_deleted": False},
                    )

        return team


class SquadSerializer(serializers.ModelSerializer):
    team_id = serializers.UUIDField(source="parent_team_id", required=False)
    is_active = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = (
            "id",
            "team_id",
            "name",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def get_is_active(self, obj):
        return not obj.is_deleted

    def create(self, validated_data):
        request = self.context.get("request")
        team_id = request.data.get("team_id") if request else None
        validated_data.pop("is_active", None)

        if team_id:
            parent_team = Team.objects.filter(id=team_id).first()
            if parent_team:
                validated_data["parent_team"] = parent_team
                validated_data["organization"] = parent_team.organization

        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("is_active", None)
        return super().update(instance, validated_data)

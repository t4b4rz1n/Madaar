from django.utils.text import slugify
from rest_framework import serializers

from accounts.models import User

from .models import Organization
from .models import OrganizationMembership


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
            "status_display",
            "owner",
            "member_count",
            "team_count",
            "project_count",
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
            "created_at",
            "updated_at",
        )

    def validate_name(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError("Organization name must be at least 2 characters.")
        return value

    def validate(self, attrs):
        name = attrs.get("name", getattr(self.instance, "name", ""))
        supplied_slug = attrs.get("slug")
        base_slug = slugify(supplied_slug or name)
        if not base_slug:
            raise serializers.ValidationError(
                {"slug": "Provide a name that can be used as a URL slug."}
            )

        candidate = base_slug
        suffix = 2
        queryset = Organization.all_objects.filter(slug=candidate)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        while queryset.exists():
            candidate = f"{base_slug}-{suffix}"
            suffix += 1
            queryset = Organization.all_objects.filter(slug=candidate)
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)

        attrs["slug"] = candidate
        return attrs


class OrganizationMemberSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source="user.id", read_only=True)
    full_name = serializers.SerializerMethodField()
    email = serializers.EmailField(source="user.email", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    avatar = serializers.ImageField(source="user.avatar", read_only=True)
    role_name = serializers.CharField(source="role", read_only=True)
    role_display = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = OrganizationMembership
        fields = (
            "id",
            "user_id",
            "full_name",
            "email",
            "username",
            "avatar",
            "role",
            "role_name",
            "role_display",
            "created_at",
        )
        read_only_fields = fields

    def get_full_name(self, obj):
        return obj.user.get_full_name()


class AddOrgMemberSerializer(serializers.Serializer):
    user_id = serializers.UUIDField(required=True)
    role_id = serializers.CharField(
        required=False,
        allow_null=True,
        allow_blank=True,
        default=OrganizationMembership.Role.EMPLOYEE,
    )

    class Meta:
        validators = []

    def validate_user_id(self, value):
        try:
            user = User.objects.get(pk=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found.")

        if not user.is_active:
            raise serializers.ValidationError("User is not active.")

        return value

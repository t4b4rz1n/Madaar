from django.db import transaction
from django.utils.translation import gettext_lazy as _
from organizations.models import Organization, OrganizationMembership
from rest_framework import serializers

from accounts.models import User


class UserListSerializer(serializers.ModelSerializer):
    organization = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_active",
            "is_staff",
            "avatar",
            "organization",
        ]
        ref_name = "users_panel"

    def get_organization(self, obj):
        membership = obj.org_memberships.filter(is_deleted=False).first()
        if membership:
            return {
                "id": str(membership.organization.id),
                "name": membership.organization.name,
            }
        return None


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=True, style={"input_type": "password"}
    )
    email = serializers.EmailField(required=True)
    organization_id = serializers.UUIDField(
        required=False, write_only=True, allow_null=True
    )
    role_id = serializers.ChoiceField(choices=OrganizationMembership.Role.choices, required=False, write_only=True, allow_null=True)

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "first_name",
            "last_name",
            "is_active",
            "is_staff",
            "avatar",
            "organization_id",
            "role_id",
        ]
        extra_kwargs = {
            "avatar": {"validators": []},
        }
        ref_name = "user_panel"

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(_("A user with this email already exists."))
        return value

    def validate_organization_id(self, value):
        if value is None:
            return value

        try:
            org = Organization.objects.get(pk=value)
        except Organization.DoesNotExist:
            raise serializers.ValidationError(_("Organization not found.")) from None

        request_user = getattr(self.context.get("request"), "user", None)

        if request_user and request_user.is_authenticated:
            if request_user.is_superuser:
                return value
            if org.owner == request_user:
                return value
            if OrganizationMembership.objects.filter(
                user=request_user,
                organization=org,
                role__in=[
                    OrganizationMembership.Role.OWNER,
                    OrganizationMembership.Role.ADMIN,
                ],
                is_deleted=False,
            ).exists():
                return value

        raise serializers.ValidationError(
            _("You do not have permission to create members for this organization.")
        )

    def create(self, validated_data):
        organization_id = validated_data.pop("organization_id", None)
        role_id = validated_data.pop("role_id", None) or validated_data.pop("role", None)

        with transaction.atomic():
            user = User.objects.create_user(
                username=validated_data["username"],
                email=validated_data["email"],
                password=validated_data["password"],
                first_name=validated_data.get("first_name", ""),
                last_name=validated_data.get("last_name", ""),
                is_active=validated_data.get("is_active", True),
                is_staff=validated_data.get("is_staff", False),
                avatar=validated_data.get("avatar"),
            )

            if organization_id:
                request_user = getattr(self.context.get("request"), "user", None)
                invited_by = (
                    request_user
                    if request_user and request_user.is_authenticated
                    else None
                )
                OrganizationMembership.objects.create(
                    user=user,
                    organization_id=organization_id,
                    role=role_id or OrganizationMembership.Role.EMPLOYEE,
                    invited_by=invited_by,
                )

        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=False)

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "first_name",
            "last_name",
            "is_active",
            "is_staff",
            "avatar",
        ]
        extra_kwargs = {
            "avatar": {"validators": []},
        }
        ref_name = "user_panel__update"

    def validate_email(self, value):
        if (
            self.instance
            and User.objects.filter(email__iexact=value).exclude(pk=self.instance.pk).exists()
        ):
            raise serializers.ValidationError(_("A user with this email already exists."))
        return value

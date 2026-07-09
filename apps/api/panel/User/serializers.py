from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from accounts.models import User


class UserListSerializer(serializers.ModelSerializer):
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
            "profile_image",
        ]
        ref_name = "users_panel"


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=True, style={"input_type": "password"}
    )
    email = serializers.EmailField(required=True)

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
            "profile_image",
        ]
        extra_kwargs = {
            "profile_image": {"validators": []},
        }
        ref_name = "user_panel"

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(_("A user with this email already exists."))
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            is_active=validated_data.get("is_active", True),
            is_staff=validated_data.get("is_staff", False),
            profile_image=validated_data.get("profile_image"),
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
            "profile_image",
        ]
        extra_kwargs = {
            "profile_image": {"validators": []},
        }
        ref_name = "user_panel__update"

    def validate_email(self, value):
        if (
            self.instance
            and User.objects.filter(email__iexact=value).exclude(pk=self.instance.pk).exists()
        ):
            raise serializers.ValidationError(_("A user with this email already exists."))
        return value

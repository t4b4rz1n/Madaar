from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import UserProfile

User = get_user_model()


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = (
            "id",
            "job_title",
            "department",
            "employee_id",
            "employment_type",
            "hire_date",
            "bio",
            "skills",
            "experience_history",
            "github_url",
            "linkedin_url",
        )


class UserSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()
    profile = UserProfileSerializer(required=False)
    password = serializers.CharField(
        write_only=True, required=False, validators=[validate_password]
    )

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "avatar",
            "avatar_url",
            "is_active",
            "is_staff",
            "password",
            "profile",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def get_avatar_url(self, obj):
        if not obj.avatar:
            return None
        request = self.context.get("request")
        image_url = obj.avatar.url
        return request.build_absolute_uri(image_url) if request else image_url

    def create(self, validated_data):
        profile_data = validated_data.pop("profile", None)
        password = validated_data.pop("password", None)
        user = User.objects.create_user(**validated_data)
        if password:
            user.set_password(password)
            user.save()

        if profile_data:
            UserProfile.objects.create(user=user, **profile_data)
        else:
            UserProfile.objects.create(user=user)

        return user

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", None)
        password = validated_data.pop("password", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)
        instance.save()

        if profile_data:
            profile, _created = UserProfile.objects.get_or_create(user=instance)
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()

        return instance


class UserUpdateSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()
    telegram_connected = serializers.SerializerMethodField()
    notify_via_email = serializers.BooleanField(required=False)
    notify_via_telegram = serializers.BooleanField(required=False)
    password = serializers.CharField(
        write_only=True, required=False, validators=[validate_password]
    )
    password_confirm = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = (
            "username",
            "email",
            "first_name",
            "last_name",
            "avatar",
            "avatar_url",
            "password",
            "password_confirm",
            "telegram_connected",
            "notify_via_email",
            "notify_via_telegram",
        )
        read_only_fields = ("username", "email", "telegram_connected")

    def get_avatar_url(self, obj):
        if not obj.avatar:
            return None

        request = self.context.get("request")
        image_url = obj.avatar.url
        return request.build_absolute_uri(image_url) if request else image_url

    def get_telegram_connected(self, obj):
        try:
            wsp = obj.work_style_profile
            if wsp and not wsp.is_deleted and wsp.telegram_chat_id:
                return True
        except Exception:
            pass
        return False

    def validate(self, attrs):
        if "password" in attrs:
            if attrs["password"] != attrs.get("password_confirm"):
                raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        try:
            wsp = instance.work_style_profile
            ret["notify_via_email"] = wsp.notify_via_email if not wsp.is_deleted else True
            ret["notify_via_telegram"] = wsp.notify_via_telegram if not wsp.is_deleted else False
        except Exception:
            ret["notify_via_email"] = True
            ret["notify_via_telegram"] = False
        return ret

    def update(self, instance, validated_data):
        notify_via_email = validated_data.pop("notify_via_email", None)
        notify_via_telegram = validated_data.pop("notify_via_telegram", None)

        validated_data.pop("password_confirm", None)
        if "password" in validated_data:
            instance.set_password(validated_data.pop("password"))

        user = super().update(instance, validated_data)

        if notify_via_email is not None or notify_via_telegram is not None:
            try:
                wsp = user.work_style_profile
                if not wsp.is_deleted:
                    if notify_via_email is not None:
                        wsp.notify_via_email = notify_via_email
                    if notify_via_telegram is not None:
                        wsp.notify_via_telegram = notify_via_telegram
                    wsp.save()
            except Exception:
                pass

        return user

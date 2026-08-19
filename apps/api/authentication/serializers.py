from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={"input_type": "password"},
        validators=[validate_password],
    )
    password_confirm = serializers.CharField(
        write_only=True, required=True, style={"input_type": "password"}
    )

    avatar = serializers.ImageField(required=False, allow_null=True)
    access = serializers.SerializerMethodField(read_only=True)
    refresh = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "avatar",
            "password",
            "password_confirm",
            "access",
            "refresh",
        )

    def get_access(self, obj):
        if not hasattr(obj, "_tokens"):
            refresh = RefreshToken.for_user(obj)
            obj._tokens = (str(refresh.access_token), str(refresh))
        return obj._tokens[0]

    def get_refresh(self, obj):
        if not hasattr(obj, "_tokens"):
            refresh = RefreshToken.for_user(obj)
            obj._tokens = (str(refresh.access_token), str(refresh))
        return obj._tokens[1]

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        user = User.objects.create_user(**validated_data)
        return user


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["username"] = serializers.CharField(required=False, write_only=True)
        self.fields[self.username_field] = serializers.CharField(required=False, write_only=True)

    def validate(self, attrs):
        username = attrs.get("username")
        email = attrs.get(self.username_field)

        if not email and not username:
            raise serializers.ValidationError(
                {"detail": "Must include 'email' or 'username' and 'password'."}
            )

        if not email and username:
            if "@" in username:
                attrs[self.username_field] = username
            else:
                user = User.objects.filter(username=username).first()
                if user:
                    attrs[self.username_field] = user.email
                else:
                    attrs[self.username_field] = username

        data = super().validate(attrs)

        telegram_connected = False
        notify_via_email = True
        notify_via_telegram = False

        try:
            wsp = self.user.work_style_profile
            if wsp and not wsp.is_deleted:
                if wsp.telegram_chat_id:
                    telegram_connected = True
                notify_via_email = wsp.notify_via_email
                notify_via_telegram = wsp.notify_via_telegram
        except Exception:
            pass

        can_manage_automations = False
        if self.user.is_staff or self.user.is_superuser:
            can_manage_automations = True
        else:
            from organizations.models import OrganizationMembership

            can_manage_automations = OrganizationMembership.objects.filter(
                user=self.user,
                role__in=[
                    OrganizationMembership.Role.OWNER,
                    OrganizationMembership.Role.ADMIN,
                ],
                is_deleted=False,
            ).exists()

        user_data = {
            "id": self.user.id,
            "username": self.user.username,
            "email": self.user.email,
            "first_name": self.user.first_name,
            "last_name": self.user.last_name,
            "is_staff": self.user.is_staff,
            "avatar_url": self.user.avatar.url if self.user.avatar else None,
            "telegram_connected": telegram_connected,
            "notify_via_email": notify_via_email,
            "notify_via_telegram": notify_via_telegram,
            "can_manage_automations": can_manage_automations,
        }

        data["user"] = user_data
        return data


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(required=True, write_only=True)

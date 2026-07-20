from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

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

    class Meta:
        model = User
        fields = (
            "username",
            "email",
            "password",
            "password_confirm",
            "first_name",
            "last_name",
            "avatar",
        )

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password": "Password fields didn't match."})

        try:
            validate_password(attrs["password"])
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": exc.messages}) from exc

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
            raise serializers.ValidationError({"detail": "Must include 'email' or 'username' and 'password'."})

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

        user_data = {
            "id": self.user.id,
            "username": self.user.username,
            "email": self.user.email,
            "first_name": self.user.first_name,
            "last_name": self.user.last_name,
            "is_staff": self.user.is_staff,
            "avatar_url": self.user.avatar.url if self.user.avatar else None,
        }

        data["user"] = user_data
        return data


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(required=True, write_only=True)

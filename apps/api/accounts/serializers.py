from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class UserUpdateSerializer(serializers.ModelSerializer):
    profile_image_url = serializers.SerializerMethodField()
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
            "profile_image",
            "profile_image_url",
            "password",
            "password_confirm",
        )
        read_only_fields = ("username", "email")

    def get_profile_image_url(self, obj):
        if not obj.profile_image:
            return None

        request = self.context.get("request")
        image_url = obj.profile_image.url
        return request.build_absolute_uri(image_url) if request else image_url

    def validate(self, attrs):
        if "password" in attrs:
            if attrs["password"] != attrs.get("password_confirm"):
                raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def update(self, instance, validated_data):
        validated_data.pop("password_confirm", None)
        if "password" in validated_data:
            instance.set_password(validated_data.pop("password"))
        return super().update(instance, validated_data)

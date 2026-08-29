from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


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

        telegram_connected = False
        notify_via_email = True
        notify_via_telegram = False

        try:
            wsp = instance.work_style_profile
            if wsp and not wsp.is_deleted:
                if wsp.telegram_chat_id:
                    telegram_connected = True
                notify_via_email = wsp.notify_via_email
                notify_via_telegram = wsp.notify_via_telegram
        except Exception:
            pass

        can_manage_automations = False
        if instance.is_staff or instance.is_superuser:
            can_manage_automations = True
        else:
            from organizations.models import OrganizationMembership

            can_manage_automations = OrganizationMembership.objects.filter(
                user=instance,
                role__in=[
                    OrganizationMembership.Role.OWNER,
                    OrganizationMembership.Role.ADMIN,
                ],
                is_deleted=False,
            ).exists()

        user_permissions: list[str] = []
        user_role_id = None
        user_role_name = None

        try:
            from organizations.models import OrganizationMembership
            from organizations.services import (
                COMPATIBILITY_ROLE_PERMISSIONS_MAP,
                DEFAULT_ORG_PERMISSIONS,
            )

            membership = (
                OrganizationMembership.objects.filter(user=instance, is_deleted=False)
                .prefetch_related("dynamic_roles__permissions")
                .first()
            )

            if membership:
                dynamic_roles = [r for r in membership.dynamic_roles.all() if not r.is_deleted]
                if dynamic_roles:
                    first_role = dynamic_roles[0]
                    user_role_id = str(first_role.id)
                    user_role_name = first_role.name
                    for role in dynamic_roles:
                        for perm in role.permissions.all():
                            if not perm.is_deleted and perm.code not in user_permissions:
                                user_permissions.append(perm.code)
                else:
                    static_role = membership.role
                    user_role_name = static_role
                    user_permissions = list(COMPATIBILITY_ROLE_PERMISSIONS_MAP.get(static_role, []))

                # Merge default organization member permissions
                for def_perm in DEFAULT_ORG_PERMISSIONS:
                    if def_perm not in user_permissions:
                        user_permissions.append(def_perm)
        except Exception:
            pass

        ret["id"] = instance.id
        ret["is_staff"] = instance.is_staff
        ret["telegram_connected"] = telegram_connected
        ret["notify_via_email"] = notify_via_email
        ret["notify_via_telegram"] = notify_via_telegram
        ret["can_manage_automations"] = can_manage_automations
        ret["role"] = {
            "id": user_role_id,
            "name": user_role_name or "Member",
            "permissions": user_permissions,
        }

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

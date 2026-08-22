from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import Permission, Role


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = (
            "id",
            "code",
            "name",
            "module",
            "group",
            "description",
            "created_at",
        )
        read_only_fields = fields


class RoleSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(many=True, read_only=True)

    class Meta:
        model = Role
        fields = (
            "id",
            "organization",
            "name",
            "code",
            "assignment_scope",
            "description",
            "is_active",
            "is_system_role",
            "permissions",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "organization", "is_system_role", "created_at", "updated_at")


class RoleCreateUpdateSerializer(serializers.ModelSerializer):
    permission_codes = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        write_only=True,
    )

    class Meta:
        model = Role
        fields = (
            "id",
            "name",
            "code",
            "description",
            "is_active",
            "permission_codes",
        )
        read_only_fields = ("id",)

    def validate_permission_codes(self, value):
        from .services import resolve_permission_codes

        try:
            resolve_permission_codes(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages) from exc
        return list(dict.fromkeys(value))

    def validate_code(self, value):
        if self.instance and self.instance.code != value:
            raise serializers.ValidationError("Role code cannot be changed after creation.")
        return value


class RolePermissionDetailSerializer(serializers.Serializer):
    role_id = serializers.CharField()
    role_name = serializers.CharField()
    role_code = serializers.CharField()
    assignment_scope = serializers.CharField()
    permissions = serializers.ListField(child=serializers.CharField())


class UserEffectivePermissionsSerializer(serializers.Serializer):
    roles = RolePermissionDetailSerializer(many=True)
    effective_permissions = serializers.ListField(child=serializers.CharField())

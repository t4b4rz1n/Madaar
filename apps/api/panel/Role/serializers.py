from rest_framework import serializers

from organizations.models import Permission, Role


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ["id", "code", "name", "description", "module"]


class RoleSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = [
            "id",
            "name",
            "description",
            "is_protected",
            "permissions",
            "member_count",
        ]

    def get_permissions(self, obj):
        # In-memory evaluation to avoid DB query if prefetched
        return [p.code for p in obj.permissions.all() if not getattr(p, "is_deleted", False)]

    def get_member_count(self, obj):
        if hasattr(obj, "annotated_member_count"):
            return obj.annotated_member_count
        return obj.memberships.filter(is_deleted=False).count()


class RoleCreateSerializer(serializers.ModelSerializer):
    permissions = serializers.ListField(
        child=serializers.CharField(), write_only=True, required=False, default=list
    )
    organization_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = Role
        fields = ["id", "name", "description", "permissions", "organization_id"]

    def validate_name(self, value):
        return value.strip()

    def create(self, validated_data):
        permission_codes = validated_data.pop("permissions", [])
        org_id = validated_data.pop("organization_id", None)

        request = self.context.get("request")
        if not org_id and request:
            org_id = (
                request.data.get("organization_id")
                or request.query_params.get("organization_id")
                or request.headers.get("X-Organization-Id")
            )
            if not org_id and request.user and request.user.is_authenticated:
                mem = request.user.org_memberships.filter(is_deleted=False).first()
                if mem:
                    org_id = mem.organization_id

        if (
            not org_id
            and request
            and request.user
            and (request.user.is_superuser or request.user.is_staff)
        ):
            from organizations.models import Organization

            first_org = Organization.objects.filter(is_deleted=False).first()
            org_id = first_org.id if first_org else None

        if not org_id:
            raise serializers.ValidationError(
                {"organization_id": "Organization context is required."}
            )

        role = Role.objects.create(organization_id=org_id, **validated_data)

        if permission_codes:
            perms = Permission.objects.filter(code__in=permission_codes, is_deleted=False)
            role.permissions.set(perms)

        return role


class RoleUpdateSerializer(serializers.ModelSerializer):
    permissions = serializers.ListField(
        child=serializers.CharField(), write_only=True, required=False
    )

    class Meta:
        model = Role
        fields = ["name", "description", "permissions"]

    def update(self, instance, validated_data):
        permission_codes = validated_data.pop("permissions", None)
        instance = super().update(instance, validated_data)

        if permission_codes is not None:
            perms = Permission.objects.filter(code__in=permission_codes, is_deleted=False)
            instance.permissions.set(perms)

        return instance

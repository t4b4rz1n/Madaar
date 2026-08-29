from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from accounts.models import User


class UserListSerializer(serializers.ModelSerializer):
    role_id = serializers.SerializerMethodField()
    role_name = serializers.SerializerMethodField()

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
            "role_id",
            "role_name",
        ]
        ref_name = "users_panel"

    def _get_active_membership_and_role(self, obj):
        memberships = [m for m in obj.org_memberships.all() if not getattr(m, "is_deleted", False)]
        if memberships:
            membership = memberships[0]
            dynamic_roles = [
                r for r in membership.dynamic_roles.all() if not getattr(r, "is_deleted", False)
            ]
            if dynamic_roles:
                return membership, dynamic_roles[0]
            return membership, None
        return None, None

    def get_role_id(self, obj):
        membership, dynamic_role = self._get_active_membership_and_role(obj)
        if dynamic_role:
            return str(dynamic_role.id)
        if membership:
            return membership.role
        return None

    def get_role_name(self, obj):
        membership, dynamic_role = self._get_active_membership_and_role(obj)
        if dynamic_role:
            return dynamic_role.name
        if membership and membership.role:
            return membership.get_role_display()
        return None


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=True, style={"input_type": "password"}
    )
    email = serializers.EmailField(required=True)
    role_id = serializers.CharField(write_only=True, required=False, allow_null=True)

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

    def create(self, validated_data):
        from django.db import transaction

        from automations.events import EventDispatcher
        from organizations.models import Organization, OrganizationMembership, Role
        from organizations.services import PermissionService

        request = self.context.get("request")
        actor = (
            request.user if (request and request.user and request.user.is_authenticated) else None
        )

        # Only superusers can grant is_staff
        if "is_staff" in validated_data and not (actor and actor.is_superuser):
            validated_data["is_staff"] = False

        role_id = validated_data.pop("role_id", None)
        raw_org_id = request and (
            request.data.get("organization_id")
            or request.query_params.get("organization_id")
            or request.headers.get("X-Organization-Id")
        )

        org = None
        if raw_org_id:
            org = Organization.objects.filter(id=raw_org_id, is_deleted=False).first()
            if not org:
                raise serializers.ValidationError({"organization_id": _("Organization not found.")})
            if actor and not actor.is_superuser:
                has_manage = PermissionService.has_permission(
                    actor, "org.manage_members", str(org.id)
                ) or PermissionService.has_permission(actor, "org.manage_settings", str(org.id))
                if not has_manage:
                    raise serializers.ValidationError(
                        {
                            "organization_id": _(
                                "You do not have permission to manage members in this organization."
                            )
                        }
                    )
        elif actor and not actor.is_superuser:
            mem = (
                actor.org_memberships.filter(is_deleted=False)
                .select_related("organization")
                .first()
            )
            if mem:
                org = mem.organization

        if not org:
            org = Organization.objects.filter(is_deleted=False).first()

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

            if org:
                membership, created_mem = OrganizationMembership.objects.get_or_create(
                    user=user, organization=org, is_deleted=False
                )
                role_obj = None
                if role_id:
                    role_obj = (
                        Role.objects.filter(id=role_id, organization=org, is_deleted=False).first()
                        or Role.objects.filter(id=role_id, is_deleted=False).first()
                        or Role.objects.filter(
                            name__iexact=str(role_id), organization=org, is_deleted=False
                        ).first()
                        or Role.objects.filter(name__iexact=str(role_id), is_deleted=False).first()
                    )
                    if role_obj:
                        membership.dynamic_roles.set([role_obj])
                        membership.save()
                    elif str(role_id) in OrganizationMembership.Role.values:
                        membership.role = str(role_id)
                        membership.save()

                try:
                    from organizations.models import OrganizationAuditLog
                    from organizations.services import AuditService

                    AuditService.log_action(
                        organization=org,
                        actor=actor,
                        action=OrganizationAuditLog.Action.ROLE_UPDATED,
                        target_user=user,
                        details={
                            "role_id": str(role_id),
                            "role_name": role_obj.name
                            if role_obj
                            else (role_id or membership.role),
                        },
                    )
                except Exception:
                    pass

                # Dispatch member_added_to_org with the real dynamic role name and target user
                try:
                    role_display = role_obj.name if role_obj else membership.get_role_display()
                    EventDispatcher.dispatch(
                        event_type="member_added_to_org",
                        payload={
                            "org_name": org.name,
                            "member_name": user.get_full_name() or user.username,
                            "role": role_display,
                            "organization_id": str(org.id),
                            "target_user_id": str(user.id),
                        },
                    )
                except Exception:
                    pass

        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=False)
    role_id = serializers.CharField(write_only=True, required=False, allow_null=True)

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
            "role_id",
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

    def update(self, instance, validated_data):
        from django.db import transaction

        from organizations.models import Organization, OrganizationMembership, Role

        request = self.context.get("request")
        actor = (
            request.user if (request and request.user and request.user.is_authenticated) else None
        )

        # Only superusers can modify is_staff
        if "is_staff" in validated_data and not (actor and actor.is_superuser):
            validated_data.pop("is_staff")

        role_id = validated_data.pop("role_id", None)

        with transaction.atomic():
            user = super().update(instance, validated_data)

            if role_id is not None:
                raw_org_id = request and (
                    request.data.get("organization_id")
                    or request.query_params.get("organization_id")
                    or request.headers.get("X-Organization-Id")
                )
                org = None
                if raw_org_id:
                    org = Organization.objects.filter(id=raw_org_id, is_deleted=False).first()

                if not org and actor:
                    actor_mem = (
                        actor.org_memberships.filter(is_deleted=False)
                        .select_related("organization")
                        .first()
                    )
                    if actor_mem:
                        org = actor_mem.organization

                existing_membership = (
                    OrganizationMembership.objects.filter(user=user, is_deleted=False)
                    .select_related("organization")
                    .first()
                )

                if not org and existing_membership:
                    org = existing_membership.organization

                if not org:
                    org = Organization.objects.filter(is_deleted=False).first()

                if org:
                    membership, _ = OrganizationMembership.objects.get_or_create(
                        user=user, organization=org, is_deleted=False
                    )

                    if not role_id:
                        membership.dynamic_roles.clear()
                        membership.save()
                    else:
                        role_obj = (
                            Role.objects.filter(
                                id=role_id, organization=org, is_deleted=False
                            ).first()
                            or Role.objects.filter(id=role_id, is_deleted=False).first()
                            or Role.objects.filter(
                                name__iexact=str(role_id), organization=org, is_deleted=False
                            ).first()
                            or Role.objects.filter(
                                name__iexact=str(role_id), is_deleted=False
                            ).first()
                        )
                        if role_obj:
                            membership.dynamic_roles.set([role_obj])
                            membership.save()
                        elif str(role_id) in OrganizationMembership.Role.values:
                            membership.role = str(role_id)
                            membership.dynamic_roles.clear()
                            membership.save()

                        try:
                            from organizations.models import OrganizationAuditLog
                            from organizations.services import AuditService

                            AuditService.log_action(
                                organization=org,
                                actor=actor,
                                action=OrganizationAuditLog.Action.ROLE_UPDATED,
                                target_user=user,
                                details={
                                    "role_id": str(role_id),
                                    "role_name": role_obj.name if role_obj else str(role_id),
                                },
                            )
                        except Exception:
                            pass

        return user

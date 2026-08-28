from django.db import transaction
from django.utils.translation import gettext_lazy as _
from organizations.models import Organization, OrganizationMembership
from rest_framework import serializers

from accounts.models import User


def _extract_org_id(request):
    if not request:
        return None
    req_data = getattr(request, "data", None)
    if isinstance(req_data, dict):
        val = req_data.get("organization_id")
        if val:
            return val
    query_params = getattr(request, "query_params", getattr(request, "GET", None))
    if query_params:
        val = query_params.get("organization_id")
        if val:
            return val
    headers = getattr(request, "headers", None)
    if headers:
        val = headers.get("X-Organization-Id")
        if val:
            return val
    return None


class UserListSerializer(serializers.ModelSerializer):
    role_id = serializers.SerializerMethodField()
    role_name = serializers.SerializerMethodField()
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
            "role_id",
            "role_name",
            "organization",
        ]
        ref_name = "users_panel"

    def _get_active_membership_and_role(self, obj):
        from organizations.models import Organization

        request = self.context.get("request")
        raw_org_id = _extract_org_id(request)
        actor = (
            request.user if (request and request.user and request.user.is_authenticated) else None
        )
        target_org_id = raw_org_id
        if not target_org_id and actor and not actor.is_superuser:
            actor_mem = actor.org_memberships.filter(is_deleted=False).first()
            if actor_mem:
                target_org_id = actor_mem.organization_id

        if not target_org_id:
            first_org = Organization.objects.filter(is_deleted=False).first()
            if first_org:
                target_org_id = first_org.id

        memberships = [m for m in obj.org_memberships.all() if not getattr(m, "is_deleted", False)]
        if target_org_id:
            matching = [m for m in memberships if str(m.organization_id) == str(target_org_id)]
            if matching:
                memberships = matching

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
        from organizations.models import Organization, OrganizationMembership
        from django.utils.translation import gettext_lazy as _
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

        organization_id = validated_data.pop("organization_id", None)
        role_id = validated_data.pop("role_id", None)

        org = None
        if organization_id:
            org = Organization.objects.filter(id=organization_id, is_deleted=False).first()
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
                request_user = getattr(self.context.get("request"), "user", None)
                invited_by = (
                    request_user
                    if request_user and request_user.is_authenticated
                    else None
                )
                membership, created_mem = OrganizationMembership.objects.get_or_create(
                    user=user, organization=org, is_deleted=False,
                    defaults={"invited_by": invited_by}
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
                        if role_obj.name.lower() in OrganizationMembership.Role.values:
                            membership.role = role_obj.name.lower()
                        else:
                            membership.role = OrganizationMembership.Role.EMPLOYEE
                        membership.save()
                    elif str(role_id) in OrganizationMembership.Role.values:
                        membership.role = str(role_id)
                        membership.save()

                    PermissionService.clear_user_cache(user, org.id)

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
                raw_org_id = _extract_org_id(request)
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
                            if role_obj.name.lower() in OrganizationMembership.Role.values:
                                membership.role = role_obj.name.lower()
                            else:
                                membership.role = OrganizationMembership.Role.EMPLOYEE
                            membership.save()
                        elif str(role_id) in OrganizationMembership.Role.values:
                            membership.role = str(role_id)
                            membership.dynamic_roles.clear()
                            membership.save()

                        from organizations.services import PermissionService

                        PermissionService.clear_user_cache(user, org.id)

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

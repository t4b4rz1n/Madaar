from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from automations.events import EventDispatcher
from organizations.models import Organization, OrganizationMembership, Permission, Role

_DEFAULT_ROLE_PERMISSIONS = {
    "Owner": [
        "notification.view",
        "project.view",
        "board.view",
        "task.view",
        "org.manage_settings",
        "org.manage_roles",
        "org.manage_members",
        "project.create",
        "project.manage",
        "task.create",
        "task.manage_all",
        "task.review",
        "leave.approve",
        "attendance.view_all",
        "finance.manage",
        "finance.view_reports",
    ],
    "Admin": [
        "notification.view",
        "project.view",
        "board.view",
        "task.view",
        "org.manage_members",
        "project.create",
        "project.manage",
        "task.create",
        "task.manage_all",
        "task.review",
        "leave.approve",
        "attendance.view_all",
        "finance.view_reports",
    ],
    "Team Lead": [
        "notification.view",
        "project.view",
        "board.view",
        "task.view",
        "project.create",
        "task.create",
        "task.manage_all",
        "task.review",
    ],
    "Hr": [
        "notification.view",
        "project.view",
        "board.view",
        "task.view",
        "org.manage_members",
        "leave.approve",
        "attendance.view_all",
    ],
    "Accountant": [
        "notification.view",
        "project.view",
        "board.view",
        "task.view",
        "finance.manage",
        "finance.view_reports",
        "attendance.view_all",
    ],
    "Employee": [
        "notification.view",
        "project.view",
        "board.view",
        "task.view",
        "task.create",
    ],
}


@receiver(post_save, sender=Organization, dispatch_uid="ensure_owner_membership_uid")
def ensure_owner_membership(sender, instance, created, **kwargs):
    if getattr(instance, "is_deleted", False):
        return

    created_roles = {}
    if created:
        # Create default roles for the new organization
        for role_name, perm_codes in _DEFAULT_ROLE_PERMISSIONS.items():
            role, r_created = Role.objects.get_or_create(
                organization=instance,
                name=role_name,
                defaults={
                    "description": f"Default system role for {role_name}",
                    "is_protected": True,
                },
            )
            if r_created or not role.permissions.exists():
                perms = Permission.objects.filter(code__in=perm_codes, is_deleted=False)
                role.permissions.set(perms)
            created_roles[role_name] = role

    if instance.owner:
        # Clean up stale active memberships left behind in soft-deleted
        # organizations before restoring/creating the owner's membership.
        OrganizationMembership.all_objects.filter(
            user=instance.owner,
            is_deleted=False,
            organization__is_deleted=True,
        ).update(is_deleted=True)

        if created:
            # Suppress the member added notification for the owner when the org is just created
            instance._is_new_org_creation = True

        membership = OrganizationMembership.all_objects.filter(
            user=instance.owner,
            organization=instance,
        ).first()

        if membership:
            membership.is_deleted = False
            membership.role = OrganizationMembership.Role.OWNER
            membership.save(update_fields=["is_deleted", "role", "updated_at"])
        else:
            membership = OrganizationMembership.objects.create(
                user=instance.owner,
                organization=instance,
                role=OrganizationMembership.Role.OWNER,
            )

        # Assign dynamic 'Owner' role if it exists (for new orgs it was just created)
        if created and "Owner" in created_roles:
            membership.dynamic_roles.add(created_roles["Owner"])

    # Notify superusers when a new organization is created
    if created:
        owner_name = (
            instance.owner.get_full_name() or instance.owner.username if instance.owner else "—"
        )
        EventDispatcher.dispatch(
            event_type="organization_created",
            payload={
                "org_name": instance.name,
                "owner_name": owner_name,
                "organization_id": str(instance.id),
            },
        )


@receiver(pre_save, sender=OrganizationMembership)
def cache_previous_membership_state(sender, instance, **kwargs):
    if instance.pk:
        try:
            old = OrganizationMembership.all_objects.get(pk=instance.pk)
            instance.__original_is_deleted = old.is_deleted
        except OrganizationMembership.DoesNotExist:
            instance.__original_is_deleted = None


@receiver(post_save, sender=OrganizationMembership, dispatch_uid="notify_member_added_to_org_uid")
def notify_superusers_member_added_to_org(sender, instance, created, **kwargs):
    """Notify superusers and member when a new member is added to an organization."""
    if getattr(instance, "_skip_member_added_signal", False):
        return

    old_is_deleted = getattr(instance, "__original_is_deleted", False)
    is_restored = not created and old_is_deleted and not instance.is_deleted

    if (created or is_restored) and instance.user:
        org = instance.organization
        # Do not send "member added" if it's the owner being added during org creation
        if getattr(org, "_is_new_org_creation", False) and instance.user == org.owner:
            return

        member_name = instance.user.get_full_name() or instance.user.username
        dynamic_role = instance.dynamic_roles.first()
        role_display = dynamic_role.name if dynamic_role else instance.get_role_display()
        payload = {
            "target_user_id": str(instance.user.id),
            "org_name": org.name,
            "member_name": member_name,
            "role": role_display,
            "organization_id": str(org.id),
        }
        EventDispatcher.dispatch(
            event_type="member_added_to_org",
            payload=payload,
        )
        EventDispatcher.dispatch(
            event_type="you_added_to_org",
            payload=payload,
        )

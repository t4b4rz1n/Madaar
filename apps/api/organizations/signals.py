from django.db.models.signals import post_save
from django.dispatch import receiver

from automations.events import EventDispatcher
from organizations.models import Organization, OrganizationMembership


@receiver(post_save, sender=Organization, dispatch_uid="ensure_owner_membership_uid")
def ensure_owner_membership(sender, instance, created, **kwargs):
    if instance.owner:
        if created:
            # Suppress the member added notification for the owner when the org is just created
            instance._is_new_org_creation = True

        membership, membership_created = OrganizationMembership.objects.get_or_create(
            user=instance.owner,
            organization=instance,
            defaults={"role": OrganizationMembership.Role.OWNER},
        )

        # Force the role to OWNER if they were previously something else
        if not membership_created and membership.role != OrganizationMembership.Role.OWNER:
            membership.role = OrganizationMembership.Role.OWNER
            membership.save(update_fields=["role"])

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


@receiver(post_save, sender=OrganizationMembership, dispatch_uid="notify_member_added_to_org_uid")
def notify_superusers_member_added_to_org(sender, instance, created, **kwargs):
    """Notify superusers when a new member is added to an organization."""
    if created and instance.user:
        org = instance.organization
        # Do not send "member added" if it's the owner being added during org creation
        if getattr(org, "_is_new_org_creation", False) and instance.user == org.owner:
            return

        member_name = instance.user.get_full_name() or instance.user.username
        role_display = instance.get_role_display()
        EventDispatcher.dispatch(
            event_type="member_added_to_org",
            payload={
                "org_name": org.name,
                "member_name": member_name,
                "role": role_display,
                "organization_id": str(org.id),
            },
        )

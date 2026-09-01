from django.db.models.signals import post_save
from django.dispatch import receiver

from automations.events import EventDispatcher
from organizations.models import Organization, OrganizationMembership


@receiver(post_save, sender=Organization, dispatch_uid="ensure_owner_membership_uid")
def ensure_owner_membership(sender, instance, created, **kwargs):
    if getattr(instance, "is_deleted", False):
        return

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
            OrganizationMembership.objects.create(
                user=instance.owner,
                organization=instance,
                role=OrganizationMembership.Role.OWNER,
            )

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

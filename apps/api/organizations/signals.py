from django.db.models.signals import post_save
from django.dispatch import receiver

from organizations.models import Organization, OrganizationMembership


@receiver(post_save, sender=Organization)
def ensure_owner_membership(sender, instance, created, **kwargs):
    if instance.owner:
        membership, membership_created = OrganizationMembership.objects.get_or_create(
            user=instance.owner,
            organization=instance,
            defaults={'role': OrganizationMembership.Role.OWNER}
        )

        # Force the role to OWNER if they were previously something else
        if not membership_created and membership.role != OrganizationMembership.Role.OWNER:
            membership.role = OrganizationMembership.Role.OWNER
            membership.save(update_fields=['role'])

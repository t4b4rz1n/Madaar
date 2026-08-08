from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver
from .models import Project, ProjectMember, Milestone
from automations.events import EventDispatcher

@receiver(pre_save, sender=ProjectMember)
def cache_previous_project_member(sender, instance, **kwargs):
    if instance.pk:
        try:
            old = ProjectMember.objects.get(pk=instance.pk)
            instance.__original_user_id = old.user_id
        except ProjectMember.DoesNotExist:
            instance.__original_user_id = None
    else:
        instance.__original_user_id = None

@receiver(post_save, sender=ProjectMember)
def notify_project_member_added_or_changed(sender, instance, created, **kwargs):
    """
    3. project_created: When a user is added to a project
    Also handles when a member user is changed.
    """
    project = instance.project
    creator_name = project.owner.get_full_name() or project.owner.username if project.owner else "سیستم"
    
    if created and instance.user:
        EventDispatcher.dispatch(
            event_type="project_created",
            payload={
                "target_user_id": str(instance.user.id),
                "project_name": project.name,
                "creator_name": creator_name
            }
        )
    elif not created:
        old_user_id = getattr(instance, "__original_user_id", None)
        if old_user_id and old_user_id != instance.user_id:
            # Notify old user they were removed
            EventDispatcher.dispatch(
                event_type="project_member_removed",
                payload={
                    "target_user_id": str(old_user_id),
                    "project_name": project.name,
                    "remover_name": creator_name
                }
            )
            # Notify new user they were added
            if instance.user:
                EventDispatcher.dispatch(
                    event_type="project_created",
                    payload={
                        "target_user_id": str(instance.user.id),
                        "project_name": project.name,
                        "creator_name": creator_name
                    }
                )

@receiver(post_delete, sender=ProjectMember)
def notify_project_member_deleted(sender, instance, **kwargs):
    if instance.user:
        project = instance.project
        remover_name = project.owner.get_full_name() or project.owner.username if project.owner else "سیستم"
        EventDispatcher.dispatch(
            event_type="project_member_removed",
            payload={
                "target_user_id": str(instance.user.id),
                "project_name": project.name,
                "remover_name": remover_name
            }
        )

@receiver(pre_save, sender=Milestone)
def cache_previous_milestone_state(sender, instance, **kwargs):
    if instance.pk:
        try:
            old_instance = Milestone.objects.get(pk=instance.pk)
            instance.__original_status = old_instance.status
        except Milestone.DoesNotExist:
            instance.__original_status = None
    else:
        instance.__original_status = None

@receiver(post_save, sender=Milestone)
def notify_milestone_completed(sender, instance, created, **kwargs):
    """
    6. milestone_completed: When milestone status changes to completed
    """
    if not created:
        old_status = getattr(instance, "__original_status", None)
        if old_status != Milestone.Status.COMPLETED and instance.status == Milestone.Status.COMPLETED:
            project = instance.project
            owner_id = project.owner_id
            target_ids = []
            if owner_id:
                target_ids.append(str(owner_id))
                
            if target_ids:
                EventDispatcher.dispatch(
                    event_type="milestone_completed",
                    payload={
                        "target_user_ids": target_ids,
                        "project_name": project.name,
                        "milestone_title": instance.title
                    }
                )

@receiver(pre_save, sender=Project)
def cache_previous_project_state(sender, instance, **kwargs):
    if instance.pk:
        try:
            old = Project.objects.get(pk=instance.pk)
            instance.__original_budget = old.budget
            instance.__original_status = old.status
        except Project.DoesNotExist:
            instance.__original_budget = None
            instance.__original_status = None
    else:
        instance.__original_budget = None
        instance.__original_status = None

@receiver(post_save, sender=Project)
def notify_project_budget_or_status(sender, instance, created, **kwargs):
    """
    4. project_over_budget: Triggered if the budget changes drastically or status changes
    (Simplified logic for budget warning)
    """
    if not created:
        old_budget = getattr(instance, "__original_budget", None)
        if old_budget is not None and instance.budget is not None:
            if instance.budget < old_budget:
                target_ids = []
                if instance.owner_id:
                    target_ids.append(str(instance.owner_id))
                
                # Also notify Organization Admins
                from organizations.models import OrganizationMembership
                admins = OrganizationMembership.objects.filter(
                    organization_id=instance.organization_id,
                    role=OrganizationMembership.Role.ADMIN
                ).values_list('user_id', flat=True)
                target_ids.extend([str(admin_id) for admin_id in admins])

                if target_ids:
                    EventDispatcher.dispatch(
                        event_type="project_over_budget",
                        payload={
                            "target_user_ids": list(set(target_ids)),
                            "project_name": instance.name
                        }
                    )

"""
projects/services.py
--------------------
Business logic layer for the projects app.
Views and serializers must NOT contain business logic — this is the single
source of truth for all project-related mutations.

All public functions:
    - Accept validated Python objects (not request objects).
    - Wrap multi-step DB work in transaction.atomic().
    - Log a ProjectActivity record for every meaningful mutation.
    - Return the mutated model instance (or None for deletes).
"""

import logging
from typing import Optional

from django.db import transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .models import Milestone, Project, ProjectActivity, ProjectMember

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Internal helper
# ---------------------------------------------------------------------------


def _log_activity(
    project: Project,
    actor,
    event_type: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> None:
    """Create a ProjectActivity record. Never raises — errors are logged only."""
    try:
        ProjectActivity.objects.create(
            project=project,
            actor=actor,
            event_type=event_type,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id else None,
            metadata=metadata or {},
        )
    except Exception as exc:  # pragma: no cover
        logger.warning("Failed to log project activity: %s", exc)


# ---------------------------------------------------------------------------
# Project services
# ---------------------------------------------------------------------------


@transaction.atomic
def create_project(*, actor, validated_data: dict) -> Project:
    """
    Create a new Project and log the creation event.

    Args:
        actor: The User performing the action (used for activity log).
        validated_data: Cleaned data from ProjectWriteSerializer.

    Returns:
        The newly created Project instance.
    """
    project = Project.objects.create(**validated_data)

    _log_activity(
        project=project,
        actor=actor,
        event_type=ProjectActivity.EventType.PROJECT_CREATED,
        entity_type=ProjectActivity.EntityType.PROJECT,
        entity_id=project.pk,
        metadata={"name": project.name, "status": project.status},
    )
    logger.info("Project created: %s (by %s)", project.pk, actor)
    return project


@transaction.atomic
def update_project(*, project: Project, actor, validated_data: dict) -> Project:
    """
    Update a Project's fields and log the update event.
    Automatically sets completed_at / archived_at timestamps.

    Args:
        project: The Project instance to update.
        actor: The User performing the action.
        validated_data: Cleaned data from ProjectWriteSerializer.

    Returns:
        The updated Project instance.
    """
    old_status = project.status
    new_status = validated_data.get("status", old_status)

    for attr, value in validated_data.items():
        setattr(project, attr, value)

    # Manage lifecycle timestamps
    now = timezone.now()
    if new_status == Project.Status.COMPLETED and old_status != Project.Status.COMPLETED:
        project.completed_at = now
    elif new_status != Project.Status.COMPLETED:
        project.completed_at = None

    if new_status == Project.Status.ARCHIVED and old_status != Project.Status.ARCHIVED:
        project.archived_at = now
    elif new_status != Project.Status.ARCHIVED:
        project.archived_at = None

    project.save()

    metadata = {"updated_fields": list(validated_data.keys())}
    if old_status != new_status:
        metadata["status_changed"] = {"from": old_status, "to": new_status}

    event_type = (
        ProjectActivity.EventType.PROJECT_UPDATED
    )
    _log_activity(
        project=project,
        actor=actor,
        event_type=event_type,
        entity_type=ProjectActivity.EntityType.PROJECT,
        entity_id=project.pk,
        metadata=metadata,
    )
    logger.info("Project updated: %s (by %s)", project.pk, actor)
    return project


@transaction.atomic
def delete_project(*, project: Project, actor) -> None:
    """
    Soft-delete a Project (and cascade-soft-delete its members and milestones).

    Args:
        project: The Project instance to delete.
        actor: The User performing the action.
    """
    # Soft-delete dependent objects before soft-deleting the project itself
    project.members.filter(is_deleted=False).update(is_deleted=True)
    project.milestones.filter(is_deleted=False).update(is_deleted=True)
    project.delete()  # calls BaseModel.delete() which sets is_deleted=True
    logger.info("Project soft-deleted: %s (by %s)", project.pk, actor)


# ---------------------------------------------------------------------------
# ProjectMember services
# ---------------------------------------------------------------------------


@transaction.atomic
def add_project_member(*, project: Project, actor, validated_data: dict) -> ProjectMember:
    """
    Add a member (user or team) to a project.

    Args:
        project: The Project to add the member to.
        actor: The User performing the action.
        validated_data: Cleaned data from ProjectMemberWriteSerializer.

    Returns:
        The newly created ProjectMember instance.
    """
    member = ProjectMember.objects.create(project=project, **validated_data)

    user_id = str(member.user_id) if member.user_id else None
    team_id = str(member.team_id) if member.team_id else None

    _log_activity(
        project=project,
        actor=actor,
        event_type=ProjectActivity.EventType.MEMBER_ADDED,
        entity_type=ProjectActivity.EntityType.MEMBER,
        entity_id=member.pk,
        metadata={
            "user_id": user_id,
            "team_id": team_id,
            "specialty": member.specialty,
            "allocation_percentage": member.allocation_percentage,
        },
    )
    logger.info("Member %s added to project %s (by %s)", member.pk, project.pk, actor)
    return member


@transaction.atomic
def update_project_member(
    *, member: ProjectMember, actor, validated_data: dict
) -> ProjectMember:
    """
    Update a project member's allocation / specialty.

    Args:
        member: The ProjectMember instance to update.
        actor: The User performing the action.
        validated_data: Cleaned data from ProjectMemberWriteSerializer.

    Returns:
        The updated ProjectMember instance.
    """
    for attr, value in validated_data.items():
        setattr(member, attr, value)
    member.save()

    _log_activity(
        project=member.project,
        actor=actor,
        event_type=ProjectActivity.EventType.MEMBER_UPDATED,
        entity_type=ProjectActivity.EntityType.MEMBER,
        entity_id=member.pk,
        metadata={"updated_fields": list(validated_data.keys())},
    )
    logger.info("Member %s updated in project %s (by %s)", member.pk, member.project_id, actor)
    return member


@transaction.atomic
def remove_project_member(*, member: ProjectMember, actor) -> None:
    """
    Soft-delete a project member.

    Args:
        member: The ProjectMember instance to remove.
        actor: The User performing the action.
    """
    project = member.project
    user_id = str(member.user_id) if member.user_id else None

    member.delete()  # soft delete via BaseModel

    _log_activity(
        project=project,
        actor=actor,
        event_type=ProjectActivity.EventType.MEMBER_REMOVED,
        entity_type=ProjectActivity.EntityType.MEMBER,
        entity_id=member.pk,
        metadata={"user_id": user_id},
    )
    logger.info("Member %s removed from project %s (by %s)", member.pk, project.pk, actor)


# ---------------------------------------------------------------------------
# Milestone services
# ---------------------------------------------------------------------------


@transaction.atomic
def create_milestone(*, project: Project, actor, validated_data: dict) -> Milestone:
    """
    Create a new Milestone under a project.

    Args:
        project: The parent Project.
        actor: The User performing the action.
        validated_data: Cleaned data from MilestoneSerializer.

    Returns:
        The newly created Milestone instance.
    """
    milestone = Milestone.objects.create(project=project, **validated_data)

    _log_activity(
        project=project,
        actor=actor,
        event_type=ProjectActivity.EventType.MILESTONE_CREATED,
        entity_type=ProjectActivity.EntityType.MILESTONE,
        entity_id=milestone.pk,
        metadata={"title": milestone.title, "target_date": str(milestone.target_date)},
    )
    logger.info("Milestone %s created in project %s (by %s)", milestone.pk, project.pk, actor)
    return milestone


@transaction.atomic
def update_milestone(*, milestone: Milestone, actor, validated_data: dict) -> Milestone:
    """
    Update a Milestone and handle completion timestamp.

    Args:
        milestone: The Milestone instance to update.
        actor: The User performing the action.
        validated_data: Cleaned data from MilestoneSerializer.

    Returns:
        The updated Milestone instance.
    """
    old_status = milestone.status
    new_status = validated_data.get("status", old_status)

    for attr, value in validated_data.items():
        setattr(milestone, attr, value)

    if new_status == Milestone.Status.COMPLETED and old_status != Milestone.Status.COMPLETED:
        milestone.completed_at = timezone.now()
    elif new_status != Milestone.Status.COMPLETED:
        milestone.completed_at = None

    milestone.save()

    event_type = (
        ProjectActivity.EventType.MILESTONE_COMPLETED
        if new_status == Milestone.Status.COMPLETED
        and old_status != Milestone.Status.COMPLETED
        else ProjectActivity.EventType.MILESTONE_UPDATED
    )

    _log_activity(
        project=milestone.project,
        actor=actor,
        event_type=event_type,
        entity_type=ProjectActivity.EntityType.MILESTONE,
        entity_id=milestone.pk,
        metadata={"updated_fields": list(validated_data.keys())},
    )
    logger.info(
        "Milestone %s updated in project %s (by %s)", milestone.pk, milestone.project_id, actor
    )
    return milestone


@transaction.atomic
def delete_milestone(*, milestone: Milestone, actor) -> None:
    """
    Soft-delete a Milestone.

    Args:
        milestone: The Milestone instance to delete.
        actor: The User performing the action.
    """
    project = milestone.project
    milestone.delete()  # soft delete
    logger.info(
        "Milestone %s soft-deleted from project %s (by %s)", milestone.pk, project.pk, actor
    )

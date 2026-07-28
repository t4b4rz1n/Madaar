"""
projects/services.py
--------------------
Business-logic layer for the projects application.

Design principles
~~~~~~~~~~~~~~~~~
* Views and serializers MUST NOT contain business logic.
* Every public method lives on a descriptive **service class**.
* All mutating methods use ``@transaction.atomic`` so partial writes
  never persist.
* A ``ProjectActivity`` record is logged for every meaningful mutation.
* Methods accept validated Python objects — never ``request`` objects —
  so they are easy to call from management commands, Celery tasks or tests.
"""

from __future__ import annotations

import logging
from typing import Any

from django.db import transaction
from django.db.models import Count, Q, QuerySet
from django.utils import timezone

from .models import Milestone, Project, ProjectActivity, ProjectMember

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Internal activity-logging helper
# ---------------------------------------------------------------------------


class _ActivityLogger:
    """Thin wrapper around ``ProjectActivity.objects.create``.

    Swallows exceptions so that a logging failure never aborts the
    business transaction that triggered it.
    """

    @staticmethod
    def log(
        *,
        project: Project,
        actor,
        event_type: str,
        entity_type: str,
        entity_id: str | None = None,
        metadata: dict | None = None,
    ) -> None:
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
# ProjectService
# ---------------------------------------------------------------------------


class ProjectService:
    """Handles all Project-level mutations and queries."""

    # -- Query helpers -----------------------------------------------------

    @staticmethod
    def get_base_queryset(*, include_deleted: bool = False) -> QuerySet[Project]:
        """Return the canonical annotated queryset used by views.

        Every place that needs a ``Project`` queryset should call this
        method so that annotations (``member_count``, ``task_count``,
        ``milestone_count``) are always present and consistent.
        """
        qs = Project.all_objects.all() if include_deleted else Project.objects.all()
        return qs.select_related("organization", "owner", "team").annotate(
            member_count=Count("members", filter=Q(members__is_deleted=False)),
            task_count=Count("tasks", filter=Q(tasks__is_deleted=False)),
            milestone_count=Count("milestones", filter=Q(milestones__is_deleted=False)),
        )

    @classmethod
    def get_with_annotations(cls, pk) -> Project:
        """Fetch a single project with all standard annotations.

        Use this after create / update so the serialiser receives the
        expected annotated fields.
        """
        return cls.get_base_queryset().get(pk=pk)

    # -- Mutations ---------------------------------------------------------

    @classmethod
    @transaction.atomic
    def create(cls, *, actor, validated_data: dict[str, Any]) -> Project:
        """Create a new Project and log a ``PROJECT_CREATED`` event."""
        project = Project.objects.create(**validated_data)

        _ActivityLogger.log(
            project=project,
            actor=actor,
            event_type=ProjectActivity.EventType.PROJECT_CREATED,
            entity_type=ProjectActivity.EntityType.PROJECT,
            entity_id=project.pk,
            metadata={"name": project.name, "status": project.status},
        )
        logger.info("Project created: %s (by %s)", project.pk, actor)
        return cls.get_with_annotations(project.pk)

    @classmethod
    @transaction.atomic
    def update(
        cls, *, project: Project, actor, validated_data: dict[str, Any]
    ) -> Project:
        """Update a Project's fields and manage lifecycle timestamps."""
        old_status = project.status
        new_status = validated_data.get("status", old_status)

        for attr, value in validated_data.items():
            setattr(project, attr, value)

        # Lifecycle timestamps ------------------------------------------
        now = timezone.now()
        if (
            new_status == Project.Status.COMPLETED
            and old_status != Project.Status.COMPLETED
        ):
            project.completed_at = now
        elif (
            new_status != Project.Status.COMPLETED
            and old_status == Project.Status.COMPLETED
            and new_status != Project.Status.ARCHIVED
        ):
            # Only clear completed_at when moving BACK from completed
            # to a non-terminal state.  ARCHIVED preserves it.
            project.completed_at = None

        if (
            new_status == Project.Status.ARCHIVED
            and old_status != Project.Status.ARCHIVED
        ):
            project.archived_at = now
        elif (
            new_status != Project.Status.ARCHIVED
            and old_status == Project.Status.ARCHIVED
        ):
            # Only clear archived_at when moving BACK from archived.
            project.archived_at = None

        project.save()

        # Activity log --------------------------------------------------
        metadata: dict[str, Any] = {"updated_fields": list(validated_data.keys())}
        if old_status != new_status:
            metadata["status_changed"] = {"from": old_status, "to": new_status}

        _ActivityLogger.log(
            project=project,
            actor=actor,
            event_type=ProjectActivity.EventType.PROJECT_UPDATED,
            entity_type=ProjectActivity.EntityType.PROJECT,
            entity_id=project.pk,
            metadata=metadata,
        )
        logger.info("Project updated: %s (by %s)", project.pk, actor)
        return cls.get_with_annotations(project.pk)

    @classmethod
    @transaction.atomic
    def delete(cls, *, project: Project, actor) -> None:
        """Soft-delete a Project and cascade to members / milestones / activities.

        Activities are soft-deleted *before* the deletion log is written
        so the deletion event itself remains visible in the audit trail.
        """
        # First: soft-delete existing activities
        project.activities.filter(is_deleted=False).update(is_deleted=True)

        # Then: log the deletion event (this new record stays is_deleted=False)
        _ActivityLogger.log(
            project=project,
            actor=actor,
            event_type=ProjectActivity.EventType.PROJECT_DELETED,
            entity_type=ProjectActivity.EntityType.PROJECT,
            entity_id=project.pk,
            metadata={"name": project.name},
        )

        # Finally: soft-delete members, milestones, tasks, and the project itself
        project.members.filter(is_deleted=False).update(is_deleted=True)
        project.milestones.filter(is_deleted=False).update(is_deleted=True)
        if hasattr(project, "tasks"):
            project.tasks.filter(is_deleted=False).update(is_deleted=True)
        project.delete()  # BaseModel.delete → sets is_deleted=True
        logger.info("Project soft-deleted: %s (by %s)", project.pk, actor)


# ---------------------------------------------------------------------------
# ProjectMemberService
# ---------------------------------------------------------------------------


class ProjectMemberService:
    """Handles all ProjectMember mutations."""

    @staticmethod
    def get_base_queryset(project_id=None) -> QuerySet[ProjectMember]:
        qs = ProjectMember.objects.select_related("user", "team")
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    @classmethod
    def get_by_pk(cls, pk) -> ProjectMember:
        return cls.get_base_queryset().get(pk=pk)

    @classmethod
    @transaction.atomic
    def add(
        cls, *, project: Project, actor, validated_data: dict[str, Any]
    ) -> ProjectMember:
        """Add a member (user or team) to a project.

        If the same user/team was previously soft-deleted from this
        project, we reactivate the existing record instead of creating
        a duplicate to avoid IntegrityError.
        """
        user = validated_data.get("user")
        team = validated_data.get("team")
        reactivated = None

        if user:
            reactivated = ProjectMember.all_objects.filter(
                project=project, user=user, is_deleted=True
            ).first()
        elif team:
            reactivated = ProjectMember.all_objects.filter(
                project=project, team=team, user__isnull=True, is_deleted=True
            ).first()

        if reactivated:
            reactivated.is_deleted = False
            reactivated.is_active = True
            for attr, value in validated_data.items():
                setattr(reactivated, attr, value)
            reactivated.save()
            member = reactivated
        else:
            member = ProjectMember.objects.create(project=project, **validated_data)

        _ActivityLogger.log(
            project=project,
            actor=actor,
            event_type=ProjectActivity.EventType.MEMBER_ADDED,
            entity_type=ProjectActivity.EntityType.MEMBER,
            entity_id=member.pk,
            metadata={
                "user_id": str(member.user_id) if member.user_id else None,
                "team_id": str(member.team_id) if member.team_id else None,
                "specialty": member.specialty,
                "allocation_percentage": member.allocation_percentage,
            },
        )
        logger.info(
            "Member %s added to project %s (by %s)", member.pk, project.pk, actor
        )
        return cls.get_by_pk(member.pk)

    @classmethod
    @transaction.atomic
    def update(
        cls, *, member: ProjectMember, actor, validated_data: dict[str, Any]
    ) -> ProjectMember:
        """Update a project member's allocation or specialty."""
        for attr, value in validated_data.items():
            setattr(member, attr, value)
        member.save()

        _ActivityLogger.log(
            project=member.project,
            actor=actor,
            event_type=ProjectActivity.EventType.MEMBER_UPDATED,
            entity_type=ProjectActivity.EntityType.MEMBER,
            entity_id=member.pk,
            metadata={"updated_fields": list(validated_data.keys())},
        )
        logger.info(
            "Member %s updated in project %s (by %s)",
            member.pk,
            member.project_id,
            actor,
        )
        return cls.get_by_pk(member.pk)

    @classmethod
    @transaction.atomic
    def remove(cls, *, member: ProjectMember, actor) -> None:
        """Soft-delete a project member."""
        project = member.project
        user_id = str(member.user_id) if member.user_id else None

        member.delete()  # soft delete via BaseModel

        _ActivityLogger.log(
            project=project,
            actor=actor,
            event_type=ProjectActivity.EventType.MEMBER_REMOVED,
            entity_type=ProjectActivity.EntityType.MEMBER,
            entity_id=member.pk,
            metadata={"user_id": user_id},
        )
        logger.info(
            "Member %s removed from project %s (by %s)", member.pk, project.pk, actor
        )


# ---------------------------------------------------------------------------
# MilestoneService
# ---------------------------------------------------------------------------


class MilestoneService:
    """Handles all Milestone mutations."""

    @staticmethod
    def get_base_queryset(project_id=None) -> QuerySet[Milestone]:
        qs = Milestone.objects.annotate(
            task_count=Count("tasks", filter=Q(tasks__is_deleted=False))
        )
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    @classmethod
    def get_by_pk(cls, pk) -> Milestone:
        return cls.get_base_queryset().get(pk=pk)

    @classmethod
    @transaction.atomic
    def create(
        cls, *, project: Project, actor, validated_data: dict[str, Any]
    ) -> Milestone:
        """Create a new Milestone under a project."""
        milestone = Milestone.objects.create(project=project, **validated_data)

        _ActivityLogger.log(
            project=project,
            actor=actor,
            event_type=ProjectActivity.EventType.MILESTONE_CREATED,
            entity_type=ProjectActivity.EntityType.MILESTONE,
            entity_id=milestone.pk,
            metadata={
                "title": milestone.title,
                "target_date": str(milestone.target_date),
            },
        )
        logger.info(
            "Milestone %s created in project %s (by %s)",
            milestone.pk,
            project.pk,
            actor,
        )
        return cls.get_by_pk(milestone.pk)

    @classmethod
    @transaction.atomic
    def update(
        cls, *, milestone: Milestone, actor, validated_data: dict[str, Any]
    ) -> Milestone:
        """Update a Milestone and manage completion timestamp."""
        old_status = milestone.status
        new_status = validated_data.get("status", old_status)

        for attr, value in validated_data.items():
            setattr(milestone, attr, value)

        if (
            new_status == Milestone.Status.COMPLETED
            and old_status != Milestone.Status.COMPLETED
        ):
            milestone.completed_at = timezone.now()
        elif (
            new_status != Milestone.Status.COMPLETED
            and old_status == Milestone.Status.COMPLETED
        ):
            # Only clear completed_at when moving BACK from completed.
            milestone.completed_at = None

        milestone.save()

        event_type = (
            ProjectActivity.EventType.MILESTONE_COMPLETED
            if new_status == Milestone.Status.COMPLETED
            and old_status != Milestone.Status.COMPLETED
            else ProjectActivity.EventType.MILESTONE_UPDATED
        )
        _ActivityLogger.log(
            project=milestone.project,
            actor=actor,
            event_type=event_type,
            entity_type=ProjectActivity.EntityType.MILESTONE,
            entity_id=milestone.pk,
            metadata={"updated_fields": list(validated_data.keys())},
        )
        logger.info(
            "Milestone %s updated in project %s (by %s)",
            milestone.pk,
            milestone.project_id,
            actor,
        )
        return cls.get_by_pk(milestone.pk)

    @classmethod
    @transaction.atomic
    def delete(cls, *, milestone: Milestone, actor) -> None:
        """Soft-delete a Milestone."""
        project = milestone.project
        _ActivityLogger.log(
            project=project,
            actor=actor,
            event_type=ProjectActivity.EventType.MILESTONE_DELETED,
            entity_type=ProjectActivity.EntityType.MILESTONE,
            entity_id=milestone.pk,
            metadata={"title": milestone.title},
        )
        milestone.delete()  # soft delete
        logger.info(
            "Milestone %s soft-deleted from project %s (by %s)",
            milestone.pk,
            project.pk,
            actor,
        )

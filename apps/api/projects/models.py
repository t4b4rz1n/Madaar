from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils.translation import gettext_lazy as _

from common.models import BaseModel


class Project(BaseModel):
    """The planning container for a project's members, capacity, and milestones."""

    class Status(models.TextChoices):
        DRAFT = "draft", _("Draft")
        ACTIVE = "active", _("Active")
        ON_HOLD = "on_hold", _("On hold")
        COMPLETED = "completed", _("Completed")
        ARCHIVED = "archived", _("Archived")

    organization_id = models.UUIDField(_("Organization ID"), null=True, blank=True, db_index=True)
    owner_id = models.UUIDField(_("Owner ID"), db_index=True)
    name = models.CharField(_("Name"), max_length=255)
    description = models.TextField(_("Description"), blank=True)
    budget = models.DecimalField(
        _("Budget"),
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
    )
    budget_currency = models.CharField(_("Budget currency"), max_length=3, default="IRR")
    status = models.CharField(
        _("Status"), max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True
    )
    start_date = models.DateField(_("Start date"), null=True, blank=True)
    deadline = models.DateField(_("Deadline"), null=True, blank=True)
    completed_at = models.DateTimeField(_("Completed at"), null=True, blank=True)
    archived_at = models.DateTimeField(_("Archived at"), null=True, blank=True)

    class Meta:
        verbose_name = _("Project")
        verbose_name_plural = _("Projects")
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["organization_id", "status"], name="project_org_status_idx"),
            models.Index(fields=["owner_id", "status"], name="project_owner_status_idx"),
            models.Index(fields=["status", "deadline"], name="project_status_deadline_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(deadline__isnull=True)
                | Q(start_date__isnull=True)
                | Q(deadline__gte=models.F("start_date")),
                name="project_deadline_after_start_date",
            )
        ]

    def __str__(self):
        return self.name


class ProjectMember(BaseModel):
    """A user's project role, specialty, and allocated capacity.

    User relationships intentionally use IDs until the identity app is finalized.
    """

    class Role(models.TextChoices):
        MANAGER = "manager", _("Manager")
        MEMBER = "member", _("Member")
        VIEWER = "viewer", _("Viewer")

    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="members", verbose_name=_("Project")
    )
    user_id = models.UUIDField(_("User ID"), db_index=True)
    role = models.CharField(_("Role"), max_length=20, choices=Role.choices, default=Role.MEMBER)
    specialty = models.CharField(_("Specialty"), max_length=100, blank=True)
    allocation_percentage = models.PositiveSmallIntegerField(
        _("Allocation percentage"), validators=[MinValueValidator(1), MaxValueValidator(100)]
    )
    allocation_start_date = models.DateField(_("Allocation start date"), null=True, blank=True)
    allocation_end_date = models.DateField(_("Allocation end date"), null=True, blank=True)
    is_active = models.BooleanField(_("Is active"), default=True, db_index=True)

    class Meta:
        verbose_name = _("Project Member")
        verbose_name_plural = _("Project Members")
        ordering = ["project", "user_id"]
        indexes = [models.Index(fields=["user_id", "is_active"], name="member_user_active_idx")]
        constraints = [
            models.UniqueConstraint(fields=["project", "user_id"], name="unique_project_member"),
            models.CheckConstraint(
                condition=Q(allocation_end_date__isnull=True)
                | Q(allocation_start_date__isnull=True)
                | Q(allocation_end_date__gte=models.F("allocation_start_date")),
                name="member_allocation_end_after_start",
            ),
        ]

    def __str__(self):
        return f"{self.project} — {self.user_id}"


class Milestone(BaseModel):
    """A project's major phase, objective, or delivery point."""

    class Status(models.TextChoices):
        PENDING = "pending", _("Pending")
        IN_PROGRESS = "in_progress", _("In progress")
        COMPLETED = "completed", _("Completed")
        CANCELLED = "cancelled", _("Cancelled")

    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="milestones", verbose_name=_("Project")
    )
    title = models.CharField(_("Title"), max_length=255)
    description = models.TextField(_("Description"), blank=True)
    status = models.CharField(
        _("Status"), max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    start_date = models.DateField(_("Start date"), null=True, blank=True)
    target_date = models.DateField(_("Target date"))
    completed_at = models.DateTimeField(_("Completed at"), null=True, blank=True)
    sequence = models.PositiveSmallIntegerField(_("Sequence"), default=0)

    class Meta:
        verbose_name = _("Milestone")
        verbose_name_plural = _("Milestones")
        ordering = ["target_date", "sequence"]
        indexes = [
            models.Index(
                fields=["project", "status", "target_date"], name="milestone_proj_status_date_idx"
            )
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(start_date__isnull=True)
                | Q(target_date__gte=models.F("start_date")),
                name="milestone_target_after_start",
            )
        ]

    def __str__(self):
        return self.title


class ProjectActivity(BaseModel):
    """The immutable, project-wide timeline.

    Events created by the future task app use ``entity_type='task'`` and the
    task's UUID in ``entity_id``. This avoids a cross-app relationship while
    keeping the project timeline complete.
    """

    class EventType(models.TextChoices):
        PROJECT_CREATED = "project_created", _("Project created")
        PROJECT_UPDATED = "project_updated", _("Project updated")
        MEMBER_ADDED = "member_added", _("Member added")
        MEMBER_UPDATED = "member_updated", _("Member updated")
        MEMBER_REMOVED = "member_removed", _("Member removed")
        MILESTONE_CREATED = "milestone_created", _("Milestone created")
        MILESTONE_UPDATED = "milestone_updated", _("Milestone updated")
        MILESTONE_COMPLETED = "milestone_completed", _("Milestone completed")
        TASK_CREATED = "task_created", _("Task created")
        TASK_UPDATED = "task_updated", _("Task updated")
        TASK_COMPLETED = "task_completed", _("Task completed")

    class EntityType(models.TextChoices):
        PROJECT = "project", _("Project")
        MEMBER = "member", _("Member")
        MILESTONE = "milestone", _("Milestone")
        TASK = "task", _("Task")

    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="activities", verbose_name=_("Project")
    )
    actor_id = models.UUIDField(_("Actor ID"), null=True, blank=True, db_index=True)
    event_type = models.CharField(_("Event type"), max_length=30, choices=EventType.choices)
    entity_type = models.CharField(_("Entity type"), max_length=20, choices=EntityType.choices)
    entity_id = models.UUIDField(_("Entity ID"), null=True, blank=True, db_index=True)
    metadata = models.JSONField(_("Metadata"), default=dict, blank=True)

    class Meta:
        verbose_name = _("Project Activity")
        verbose_name_plural = _("Project Activities")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["project", "created_at"], name="activity_project_created_idx"),
            models.Index(fields=["project", "event_type"], name="activity_project_event_idx"),
        ]

    def __str__(self):
        return f"{self.project} — {self.get_event_type_display()}"

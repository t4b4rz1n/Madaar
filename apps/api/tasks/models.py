import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from common.models import BaseModel


class Board(BaseModel):
    """Kanban Board for a project."""
    title = models.CharField(_("Board Title"), max_length=255)
    project_id = models.IntegerField(_("Project ID"), db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="boards",
        verbose_name=_("Created By"),
        null=True,
        blank=True,
        db_index=True,
    )

    class Meta:
        verbose_name = _("Board")
        verbose_name_plural = _("Boards")
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class BoardColumn(BaseModel):
    """Custom Kanban column belonging to a Board."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    board = models.ForeignKey(
        Board,
        on_delete=models.CASCADE,
        related_name="columns",
        verbose_name=_("Board"),
        db_index=True,
    )
    title = models.CharField(_("Column Title"), max_length=100)
    order = models.PositiveIntegerField(_("Order"), default=0, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Board Column")
        verbose_name_plural = _("Board Columns")
        ordering = ["order", "created_at"]
        unique_together = ("board", "title")

    def __str__(self):
        return f"{self.board.title} – {self.title}"


class Task(BaseModel):
    """Primary task model."""

    class Status(models.TextChoices):
        TODO = "todo", _("TODO")
        IN_PROGRESS = "in_progress", _("Doing")
        REVIEW = "review", _("Review")
        DONE = "done", _("Done")

    class Priority(models.TextChoices):
        LOW = "low", _("Low")
        MEDIUM = "medium", _("Medium")
        HIGH = "high", _("High")
        CRITICAL = "critical", _("Critical")

    title = models.CharField(_("Title"), max_length=255)
    description = models.TextField(_("Description"), blank=True, null=True)
    column = models.ForeignKey(
        BoardColumn,
        on_delete=models.SET_NULL,
        related_name="tasks",
        verbose_name=_("Kanban Column"),
        null=True,
        blank=True,
        db_index=True,
    )

    status = models.CharField(
        _("Status"), max_length=20, choices=Status.choices, default=Status.TODO, db_index=True
    )
    priority = models.CharField(
        _("Priority"), max_length=20, choices=Priority.choices, default=Priority.MEDIUM, db_index=True
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="tasks",
        verbose_name=_("Assignee"),
        null=True,
        blank=True,
        db_index=True,
    )
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="reported_tasks",
        verbose_name=_("Reporter"),
        null=True,
        blank=True,
        db_index=True,
    )
    due_date = models.DateField(_("Due Date"), null=True, blank=True, db_index=True)
    estimated_hours = models.DecimalField(
        _("Estimated Hours"), max_digits=5, decimal_places=2, null=True, blank=True
    )
    spent_hours = models.DecimalField(
        _("Spent Hours"), max_digits=5, decimal_places=2, default=0, help_text=_("Hours logged by the assignee")
    )
    parent_task = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        related_name="subtasks",
        verbose_name=_("Parent Task"),
        null=True,
        blank=True,
        db_index=True,
    )
    order = models.PositiveIntegerField(_("Kanban Order"), default=0, db_index=True)

    class Meta:
        verbose_name = _("Task")
        verbose_name_plural = _("Tasks")
        ordering = ["order", "-created_at"]
        indexes = [
            models.Index(fields=["status", "priority"]),
            models.Index(fields=["assignee"]),
        ]

    def __str__(self):
        return f"{self.title} [{self.get_status_display()}]"


class TaskChecklistItem(BaseModel):
    """Checklist items belonging to a task."""

    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="checklist_items",
        verbose_name=_("Task"),
    )
    description = models.CharField(_("Description"), max_length=255)
    is_completed = models.BooleanField(_("Completed"), default=False, db_index=True)

    class Meta:
        verbose_name = _("Task Checklist Item")
        verbose_name_plural = _("Task Checklist Items")
        ordering = ["id"]

    def __str__(self):
        return f"{self.task.title} – {self.description}"


class TaskDependency(BaseModel):
    """Dependencies between tasks (FS, SS, FF, SF)."""

    class DepType(models.TextChoices):
        FINISH_START = "FS", _("Finish‑Start")
        START_START = "SS", _("Start‑Start")
        FINISH_FINISH = "FF", _("Finish‑Finish")
        START_FINISH = "SF", _("Start‑Finish")

    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="dependencies",
        verbose_name=_("Task"),
    )
    depends_on = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="dependents",
        verbose_name=_("Depends on"),
    )
    dependency_type = models.CharField(
        _("Dependency Type"), max_length=2, choices=DepType.choices, default=DepType.FINISH_START
    )
    lag = models.IntegerField(_("Lag (days)"), default=0)

    class Meta:
        verbose_name = _("Task Dependency")
        verbose_name_plural = _("Task Dependencies")
        unique_together = ("task", "depends_on", "dependency_type")

    def __str__(self):
        return f"{self.task.title} {self.dependency_type} {self.depends_on.title}"


class TaskComment(BaseModel):
    """Comments on a task, with optional file attachment."""

    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="comments",
        verbose_name=_("Task"),
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="task_comments",
        verbose_name=_("Author"),
        null=True,
        blank=True,
    )
    content = models.TextField(_("Content"))
    attached_file = models.FileField(
        _("Attached file"), upload_to="task_attachments/", null=True, blank=True
    )
    created_at = models.DateTimeField(_("Created at"), auto_now_add=True)

    class Meta:
        verbose_name = _("Task Comment")
        verbose_name_plural = _("Task Comments")
        ordering = ["-created_at"]

    def __str__(self):
        return f"Comment by {self.author} on {self.task.title}"


class TaskActivityLog(BaseModel):
    """Audit trail for task actions."""

    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="activity_logs",
        verbose_name=_("Task"),
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="task_activities",
        verbose_name=_("Actor"),
        null=True,
        blank=True,
    )
    action = models.CharField(_("Action"), max_length=255)
    timestamp = models.DateTimeField(_("Timestamp"), default=timezone.now, db_index=True)

    class Meta:
        verbose_name = _("Task Activity Log")
        verbose_name_plural = _("Task Activity Logs")
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.task.title} – {self.action} @ {self.timestamp}"

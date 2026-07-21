from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import BaseModel


class Board(BaseModel):
    """Kanban Board for a project."""

    title = models.CharField(_("Board Title"), max_length=255)
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="boards",
        verbose_name=_("Project"),
        null=True,
        blank=True,
        db_index=True,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="boards",
        verbose_name=_("Created By"),
        null=True,
        blank=True,
        db_index=True,
    )
    order = models.PositiveIntegerField(_("Order"), default=0, db_index=True)

    class Meta:
        verbose_name = _("Board")
        verbose_name_plural = _("Boards")
        ordering = ["order", "-created_at"]

    def __str__(self):
        return self.title


class BoardColumn(BaseModel):
    """Custom Kanban column belonging to a Board."""

    board = models.ForeignKey(
        Board,
        on_delete=models.CASCADE,
        related_name="columns",
        verbose_name=_("Board"),
        db_index=True,
    )
    title = models.CharField(_("Column Title"), max_length=100)
    order = models.PositiveIntegerField(_("Order"), default=0, db_index=True)

    class Meta:
        verbose_name = _("Board Column")
        verbose_name_plural = _("Board Columns")
        ordering = ["order", "created_at"]
        constraints = [
            models.UniqueConstraint(fields=["board", "title"], name="unique_board_column_title")
        ]

    def __str__(self):
        return f"{self.board.title} – {self.title}"


class TaskStatus(BaseModel):
    """
    Customizable task status per board.
    Each board gets default statuses on creation;
    users can add, remove, and reorder statuses freely.
    """

    board = models.ForeignKey(
        Board,
        on_delete=models.CASCADE,
        related_name="statuses",
        verbose_name=_("Board"),
        null=True,
        blank=True,
        db_index=True,
    )
    code = models.SlugField(
        _("Code"),
        max_length=50,
        db_index=True,
        help_text=_("Identifier for the status (e.g., 'todo', 'doing', 'review')"),
    )
    name = models.CharField(
        _("Name"),
        max_length=100,
        help_text=_("Display name for the status (e.g., 'To Do', 'Doing', 'Review')"),
    )
    order = models.PositiveIntegerField(
        _("Order"), default=0, db_index=True, help_text=_("Order in Kanban board columns")
    )

    class Meta:
        verbose_name = _("Task Status")
        verbose_name_plural = _("Task Statuses")
        ordering = ["order", "created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["board", "code"],
                name="unique_status_code_per_board",
            )
        ]

    def __str__(self):
        return self.name


class Task(BaseModel):
    """Primary task model."""

    class Priority(models.TextChoices):
        LOW = "low", _("Low")
        MEDIUM = "medium", _("Medium")
        HIGH = "high", _("High")
        CRITICAL = "critical", _("Critical")

    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="tasks",
        verbose_name=_("Project"),
        null=True,
        blank=True,
        db_index=True,
    )
    milestone = models.ForeignKey(
        "projects.Milestone",
        on_delete=models.SET_NULL,
        related_name="tasks",
        verbose_name=_("Milestone"),
        null=True,
        blank=True,
        db_index=True,
    )
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
    status = models.ForeignKey(
        TaskStatus,
        on_delete=models.PROTECT,
        related_name="tasks",
        verbose_name=_("Status"),
        db_index=True,
    )
    priority = models.CharField(
        _("Priority"),
        max_length=20,
        choices=Priority.choices,
        default=Priority.MEDIUM,
        db_index=True,
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
        _("Spent Hours"),
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text=_("Hours logged by the assignee"),
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
            models.Index(fields=["project", "status"]),
            models.Index(fields=["project", "assignee"]),
            models.Index(fields=["status", "priority"]),
            models.Index(fields=["assignee"]),
        ]

    def __str__(self):
        return f"{self.title} [{self.status.name if self.status else 'No Status'}]"


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
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.task.title} – {self.description}"


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

    class Meta:
        verbose_name = _("Task Activity Log")
        verbose_name_plural = _("Task Activity Logs")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.task.title} – {self.action} @ {self.created_at}"


class AsyncStandup(BaseModel):
    """
    Daily standup report by team members.
    Includes yesterday's achievements, today's focus, and blockers.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="standups",
        verbose_name=_("User"),
        db_index=True,
    )
    yesterday_work = models.TextField(_("Yesterday's Work"))
    today_work = models.TextField(_("Today's Work"))
    blockers = models.TextField(_("Blockers"), blank=True, null=True)

    class Meta:
        verbose_name = _("Async Standup")
        verbose_name_plural = _("Async Standups")
        ordering = ["-created_at"]

    def __str__(self):
        return f"Standup by {self.user} on {self.created_at.date()}"

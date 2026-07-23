from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import BaseModel


class Board(BaseModel):
    """Kanban Board for a project."""

    title = models.CharField(_("Board Title"), max_length=255)
    description = models.TextField(_("Description"), blank=True, null=True)
    background_color = models.CharField(
        _("Background Color"), max_length=50, blank=True, null=True, default="#6366f1"
    )
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


class TaskStatus(BaseModel):
    """
    Customizable task status per board (Acts as Kanban Column).
    Each board gets default statuses on creation;
    users can add, remove, and reorder statuses freely per board.
    """

    board = models.ForeignKey(
        Board,
        on_delete=models.CASCADE,
        related_name="statuses",
        verbose_name=_("Board"),
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
        _("Order"),
        default=0,
        db_index=True,
        help_text=_("Order in Kanban board columns"),
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
        return f"{self.board.title} – {self.name}"


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
        on_delete=models.SET_NULL,
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

    @property
    def is_completed(self):
        """Returns True if the task status code is 'done'."""
        return bool(self.status and self.status.code == "done")

    def _progress_percent_internal(self, seen=None):
        """Recursive progress calculation with cycle detection."""
        if seen is None:
            seen = set()
        if self.id in seen:
            return 0.0
        seen = seen | {self.id}

        if hasattr(self, "annotated_checklist_total") and hasattr(self, "annotated_checklist_done"):
            checklist_total = self.annotated_checklist_total
            checklist_done = self.annotated_checklist_done
        else:
            checklist_total = self.checklist_items.count()
            checklist_done = self.checklist_items.filter(is_completed=True).count()

        checklist_progress = (
            (checklist_done / checklist_total * 100) if checklist_total > 0 else None
        )

        subtask_list = list(self.subtasks.all())
        if subtask_list:
            subtask_progress = sum(
                s._progress_percent_internal(seen) for s in subtask_list
            ) / len(subtask_list)
        else:
            subtask_progress = None

        if checklist_progress is not None and subtask_progress is not None:
            return round((checklist_progress + subtask_progress) / 2, 1)
        if checklist_progress is not None:
            return round(checklist_progress, 1)
        if subtask_progress is not None:
            return round(subtask_progress, 1)
        return 0.0

    @property
    def progress_percent(self):
        """
        Calculate task progress (0-100) based on:
        1. Checklist items completion ratio
        2. Subtask progress (recursive)

        If a task has both checklists and subtasks, both contribute equally.
        If only checklists → 100% weight to checklists.
        If only subtasks → 100% weight to subtasks.
        If neither → 0%.
        """
        return self._progress_percent_internal()


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
        author_name = self.author.get_full_name() if self.author else _("Unknown")
        return f"Comment by {author_name} on {self.task.title}"


class TaskActivityLog(BaseModel):
    """Audit trail for task and board actions."""

    task = models.ForeignKey(
        Task,
        on_delete=models.SET_NULL,
        related_name="activity_logs",
        verbose_name=_("Task"),
        null=True,
        blank=True,
    )
    board = models.ForeignKey(
        Board,
        on_delete=models.SET_NULL,
        related_name="activity_logs",
        verbose_name=_("Board"),
        null=True,
        blank=True,
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
        target = (
            self.task.title
            if self.task
            else (self.board.title if self.board else "Global")
        )
        return f"{target} – {self.action} @ {self.created_at}"


class AsyncStandup(BaseModel):
    """
    Daily standup report by team members.
    Includes yesterday's achievements, today's focus, and blockers.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="standups",
        verbose_name=_("User"),
        null=True,
        blank=True,
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

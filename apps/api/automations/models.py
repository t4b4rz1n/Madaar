from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import BaseModel
from projects.models import Project


class AutomationRule(BaseModel):
    class ActionType(models.TextChoices):
        TELEGRAM = "telegram", _("Telegram Message")
        EMAIL = "email", _("Email Notification")
        BOTH = "both", _("Both")

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="automation_rules",
        null=True,
        blank=True,
        help_text=_("Project this rule applies to. If null, applies to all organization events.")
    )
    
    event_type = models.CharField(
        max_length=100,
        db_index=True,
        help_text=_("String identifier for the event trigger (e.g. 'task_completed'). Sent by frontend.")
    )
    
    action_type = models.CharField(
        max_length=20,
        choices=ActionType.choices,
        default=ActionType.TELEGRAM
    )
    
    telegram_group_id = models.CharField(
        max_length=255, 
        blank=True, 
        null=True,
        help_text=_("Telegram Chat ID to send messages to, if action_type is telegram or both.")
    )
    
    message_template = models.TextField(
        help_text=_("Dynamic message template with {{variables}}.")
    )
    
    recipients = models.JSONField(
        default=list,
        blank=True,
        help_text=_("List of recipient roles, e.g. ['owner', 'admins', 'team_leads', 'assignee', 'reporter']")
    )

    class Meta:
        verbose_name = _("Automation Rule")
        verbose_name_plural = _("Automation Rules")
        # Ensure a project doesn't have identical redundant rules
        unique_together = (("project", "event_type", "action_type"),)

    def __str__(self):
        project_name = self.project.name if self.project else "Global"
        return f"{project_name} - {self.event_type} -> {self.get_action_type_display()}"

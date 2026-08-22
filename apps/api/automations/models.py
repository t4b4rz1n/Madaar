from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import BaseModel


class AutomationRule(BaseModel):
    class ActionType(models.TextChoices):
        TELEGRAM = "telegram", _("Telegram Message")
        EMAIL = "email", _("Email Notification")
        BOTH = "both", _("Both")

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="automation_rules",
        null=True,
        help_text=_("Organization this rule applies to."),
    )

    event_type = models.CharField(
        max_length=100,
        db_index=True,
        help_text=_(
            "String identifier for the event trigger (e.g. 'task_completed'). Sent by frontend."
        ),
    )

    action_type = models.CharField(
        max_length=20, choices=ActionType.choices, default=ActionType.TELEGRAM
    )

    telegram_group_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text=_("Telegram Chat ID to send messages to, if action_type is telegram or both."),
    )

    message_template = models.TextField(
        blank=True,
        default="",
        help_text=_(
            "Optional dynamic message template with {{variables}}. Leave blank to use the standard event message."
        ),
    )

    is_active = models.BooleanField(
        default=True, help_text=_("Whether this rule is active and should trigger notifications.")
    )

    recipients = models.JSONField(
        default=list,
        blank=True,
        help_text=_(
            "List of recipient roles, e.g. ['owner', 'admins', 'team_leads', 'assignee', 'reporter']"
        ),
    )

    class Meta:
        verbose_name = _("Automation Rule")
        verbose_name_plural = _("Automation Rules")
        # Ensure an organization doesn't have identical redundant rules
        unique_together = (("organization", "event_type"),)

    def __str__(self):
        org_name = self.organization.name if self.organization else "Global"
        return f"{org_name} - {self.event_type} -> {self.get_action_type_display()}"

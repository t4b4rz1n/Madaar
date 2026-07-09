from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import BaseModel

User = settings.AUTH_USER_MODEL


class Notification(BaseModel):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications",
        db_index=True,
        verbose_name=_("User"),
    )
    text = models.CharField(_("Text"), max_length=255)
    link = models.URLField(_("Link"), max_length=255, blank=True, null=True)
    seen = models.BooleanField(_("Seen"), default=False, db_index=True)

    class Meta:
        verbose_name = _("Notification")
        verbose_name_plural = _("Notifications")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "seen"]),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.text[:50]}"

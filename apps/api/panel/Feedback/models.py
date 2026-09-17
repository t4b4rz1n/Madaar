from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import BaseModel

User = settings.AUTH_USER_MODEL


class Feedback(BaseModel):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="feedbacks", verbose_name=_("User")
    )
    subject = models.CharField(_("Subject"), max_length=255)
    text = models.TextField(_("Message Text"))

    class Meta:
        verbose_name = _("Feedback")
        verbose_name_plural = _("Feedbacks")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} - {self.subject}"

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import BaseModel


class DiscountCode(BaseModel):
    code = models.CharField(
        _("Code"),
        max_length=50,
        unique=True,
        db_index=True,
        help_text=_("Unique discount code like SUMMER2025"),
    )
    description = models.TextField(_("Description"), blank=True, null=True)
    percent = models.PositiveIntegerField(
        _("Discount Percentage"),
        validators=[MinValueValidator(1), MaxValueValidator(100)],
        help_text=_("Percentage between 1 and 100"),
    )
    max_usage = models.PositiveIntegerField(
        _("Max Usage Count"), default=1, help_text=_("Total number of times this code can be used")
    )
    current_usage = models.PositiveIntegerField(_("Current Usage Count"), default=0, editable=False)
    expiration_date = models.DateTimeField(_("Expiration Date"), null=True, blank=True)
    is_active = models.BooleanField(_("Is Active"), default=True, db_index=True)

    class Meta:
        verbose_name = _("Discount Code")
        verbose_name_plural = _("Discount Codes")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.code} ({self.percent}%)"

    @property
    def is_valid(self):
        from django.utils import timezone

        if not self.is_active:
            return False
        if self.current_usage >= self.max_usage:
            return False
        if self.expiration_date and self.expiration_date < timezone.now():
            return False
        return True

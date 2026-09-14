from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import BaseModel


class SalaryConfig(BaseModel):
    """
    Stores salary configuration for a user within an organization,
    optionally scoped to a specific project (project-level override).

    - If `project` is None  → this is the org-level (default) salary.
    - If `project` is set   → this overrides the org-level salary for that project only.
    """

    class PaymentType(models.TextChoices):
        MONTHLY = "monthly", _("Monthly")
        HOURLY = "hourly", _("Hourly")

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="salary_configs",
        verbose_name=_("User"),
        db_index=True,
    )
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="salary_configs",
        verbose_name=_("Organization"),
        db_index=True,
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="salary_configs",
        verbose_name=_("Project (optional override)"),
        null=True,
        blank=True,
        db_index=True,
    )
    payment_type = models.CharField(
        _("Payment Type"),
        max_length=20,
        choices=PaymentType.choices,
        default=PaymentType.MONTHLY,
    )
    rate = models.DecimalField(
        _("Rate"),
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text=_("Monthly salary amount OR hourly rate, depending on payment_type."),
    )
    currency = models.CharField(
        _("Currency"),
        max_length=10,
        default="IRR",
    )
    is_active = models.BooleanField(_("Is Active"), default=True, db_index=True)

    class Meta:
        verbose_name = _("Salary Config")
        verbose_name_plural = _("Salary Configs")
        ordering = ["-created_at"]
        # One org-level config per user per org (project=None)
        # One project-level config per user per project
        constraints = [
            models.UniqueConstraint(
                fields=["user", "organization"],
                condition=models.Q(project__isnull=True, is_deleted=False, is_active=True),
                name="unique_active_org_salary_config",
            ),
            models.UniqueConstraint(
                fields=["user", "organization", "project"],
                condition=models.Q(project__isnull=False, is_deleted=False, is_active=True),
                name="unique_active_project_salary_config",
            ),
        ]

    def __str__(self):
        scope = f"project:{self.project_id}" if self.project_id else "org-level"
        return f"SalaryConfig({self.user_id} | {scope} | {self.payment_type} {self.rate} {self.currency})"

import django.core.validators
import django.db.models.deletion
import django.utils.timezone
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("organizations", "0018_remove_organizationmembership_salary_amount_and_more"),
        ("projects", "0015_remove_projectmember_salary_amount_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="SalaryConfig",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("is_deleted", models.BooleanField(db_index=True, default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "payment_type",
                    models.CharField(
                        choices=[("monthly", "Monthly"), ("hourly", "Hourly")],
                        default="monthly",
                        max_length=20,
                        verbose_name="Payment Type",
                    ),
                ),
                (
                    "rate",
                    models.DecimalField(
                        decimal_places=2,
                        help_text="Monthly salary amount OR hourly rate, depending on payment_type.",
                        max_digits=14,
                        validators=[django.core.validators.MinValueValidator(0)],
                        verbose_name="Rate",
                    ),
                ),
                ("currency", models.CharField(default="IRR", max_length=10, verbose_name="Currency")),
                ("is_active", models.BooleanField(db_index=True, default=True, verbose_name="Is Active")),
                (
                    "organization",
                    models.ForeignKey(
                        db_index=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="salary_configs",
                        to="organizations.organization",
                        verbose_name="Organization",
                    ),
                ),
                (
                    "project",
                    models.ForeignKey(
                        blank=True,
                        db_index=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="salary_configs",
                        to="projects.project",
                        verbose_name="Project (optional override)",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        db_index=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="salary_configs",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="User",
                    ),
                ),
            ],
            options={
                "verbose_name": "Salary Config",
                "verbose_name_plural": "Salary Configs",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="salaryconfig",
            constraint=models.UniqueConstraint(
                condition=models.Q(project__isnull=True, is_deleted=False, is_active=True),
                fields=["user", "organization"],
                name="unique_active_org_salary_config",
            ),
        ),
        migrations.AddConstraint(
            model_name="salaryconfig",
            constraint=models.UniqueConstraint(
                condition=models.Q(project__isnull=False, is_deleted=False, is_active=True),
                fields=["user", "organization", "project"],
                name="unique_active_project_salary_config",
            ),
        ),
    ]

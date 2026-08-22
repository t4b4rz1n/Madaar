import uuid

from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import BaseModel


class Permission(BaseModel):
    """
    Registry for system permissions owned by various modules.
    Permission code format: <module>.<action>_<resource>
    Example: users.view_user, access_control.manage_roles
    """

    code = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text=_("Permission code e.g. users.view_user"),
    )
    name = models.CharField(
        max_length=150,
        help_text=_("Human-readable permission name"),
    )
    module = models.CharField(
        max_length=50,
        db_index=True,
        help_text=_("Owning module e.g. users, organizations, access_control"),
    )
    group = models.CharField(
        max_length=50,
        db_index=True,
        blank=True,
        help_text=_("Category/Group e.g. Users, Teams, Roles"),
    )
    description = models.TextField(blank=True)

    class Meta:
        db_table = "access_permissions"
        verbose_name = _("Permission")
        verbose_name_plural = _("Permissions")
        ordering = ["module", "group", "code"]

    def __str__(self):
        return f"{self.code} ({self.name})"


class RoleAssignmentScope(models.TextChoices):
    ORGANIZATION = "organization", _("Organization")
    TEAM = "team", _("Team")


class Role(models.Model):
    """
    Role entity that dynamically owns permissions.
    Permissions are NEVER copied into users; they are resolved live from active roles.
    Role deletion is strictly forbidden; disabling is controlled via is_active.
    """

    AssignmentScope = RoleAssignmentScope

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="roles",
    )
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=100, db_index=True)
    assignment_scope = models.CharField(
        max_length=20,
        choices=RoleAssignmentScope.choices,
        default="organization",
        db_index=True,
        help_text=_("Where this role can be assigned."),
    )
    description = models.TextField(blank=True)

    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text=_("Disable roles using is_active=False"),
    )
    is_system_role = models.BooleanField(
        default=False,
        help_text=_("System roles automatically seeded by the system"),
    )

    permissions = models.ManyToManyField(
        Permission,
        related_name="roles",
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "access_roles"
        verbose_name = _("Role")
        verbose_name_plural = _("Roles")
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "name"],
                name="unique_role_organization_name",
            ),
            models.UniqueConstraint(
                fields=["organization", "code"],
                name="unique_role_organization_code",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"

    def delete(self, using=None, keep_parents=False):
        raise ValidationError(
            _(
                "Role deletion is strictly forbidden to preserve history and security. Deactivate the role instead using is_active=False."
            )
        )

    def hard_delete(self, using=None, keep_parents=False):
        raise ValidationError(
            _(
                "Role deletion is strictly forbidden to preserve history and security. Deactivate the role instead using is_active=False."
            )
        )

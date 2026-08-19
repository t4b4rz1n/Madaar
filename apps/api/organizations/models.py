from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from common.models import BaseModel


class Organization(BaseModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"
        ARCHIVED = "archived", "Archived"

    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, db_index=True)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="owned_organizations",
    )

    class Meta:
        db_table = "organizations"
        verbose_name = "Organization"
        verbose_name_plural = "Organizations"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Team(BaseModel):
    name = models.CharField(max_length=100)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="teams",
    )
    parent_team = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="subteams",
        verbose_name="Parent Team",
    )
    description = models.TextField(blank=True)

    class Meta:
        db_table = "teams"
        verbose_name = "Team"
        verbose_name_plural = "Teams"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "name"],
                name="unique_team_org_name",
            )
        ]

    def __str__(self):
        return self.name


class OrganizationMembership(BaseModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="org_memberships",
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    role = models.ForeignKey(
        "access_control.Role",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="org_memberships",
        help_text="RBAC Role assigned to this member within this organization.",
    )

    class Meta:
        db_table = "organization_memberships"
        verbose_name = "Organization Membership"
        verbose_name_plural = "Organization Memberships"
        ordering = ["-created_at"]  # BaseModel provides created_at
        constraints = [
            models.UniqueConstraint(
                fields=["user", "organization"],
                name="unique_org_membership_user_org",
            )
        ]

    def __str__(self):
        return f"{self.user_id} - {self.organization_id} ({self.role})"

    def clean(self):
        if self.role_id and self.role.organization_id != self.organization_id:
            raise ValidationError({"role": "Role must belong to the same organization."})
        if (
            self.role_id
            and self.role.assignment_scope != self.role.AssignmentScope.ORGANIZATION
        ):
            raise ValidationError({"role": "Organization membership requires an organization role."})


class TeamMembership(BaseModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="team_memberships",
    )
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    role = models.ForeignKey(
        "access_control.Role",
        on_delete=models.PROTECT,
        related_name="team_memberships",
        help_text="RBAC Role assigned to this member within this team.",
    )

    class Meta:
        db_table = "team_memberships"
        verbose_name = "Team Membership"
        verbose_name_plural = "Team Memberships"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "team"],
                name="unique_team_membership_user_team",
            )
        ]

    def __str__(self):
        return f"{self.user_id} - {self.team_id} ({self.role})"

    def clean(self):
        if self.role_id:
            if self.role.organization_id != self.team.organization_id:
                raise ValidationError({"role": "Role must belong to the team's organization."})
            if self.role.assignment_scope != self.role.AssignmentScope.TEAM:
                raise ValidationError({"role": "Team membership requires a team role."})
            if not self.role.is_active:
                raise ValidationError({"role": "Team membership role must be active."})

        if self.user_id and self.team_id:
            has_active_org_membership = OrganizationMembership.objects.filter(
                user_id=self.user_id,
                organization_id=self.team.organization_id,
                is_deleted=False,
            ).exists()
            if not has_active_org_membership:
                raise ValidationError(
                    {"user": "User must be an active organization member before joining a team."}
                )

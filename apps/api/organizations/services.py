from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied, ValidationError

from organizations.models import Organization, OrganizationMembership, Team, TeamMembership


def _get_role(organization: Organization, code: str, assignment_scope: str = None):
    """Fetch an active role preset owned by the organization."""
    from access_control.models import Role

    queryset = Role.objects.filter(organization=organization, code=code, is_active=True)
    if assignment_scope is not None:
        queryset = queryset.filter(assignment_scope=assignment_scope)
    return get_object_or_404(queryset)


def create_organization(owner, organization_data: dict) -> Organization:
    """Create an organization, its role presets, and its owner membership atomically."""
    from access_control.models import Role
    from access_control.services import seed_default_roles_and_permissions

    with transaction.atomic():
        organization = Organization.objects.create(owner=owner, **organization_data)
        seed_default_roles_and_permissions(organization)
        owner_role = Role.objects.get(
            organization=organization,
            code="owner",
            assignment_scope=Role.AssignmentScope.ORGANIZATION,
            is_active=True,
        )
        OrganizationMembership.objects.create(
            user=owner,
            organization=organization,
            role=owner_role,
        )
    return organization


def add_member(organization: Organization, user, role_code: str):
    """Add a member when an organization administrator creates a user."""
    from access_control.models import Role

    role = _get_role(organization, role_code, Role.AssignmentScope.ORGANIZATION)
    return OrganizationMembership.objects.create(
        user=user,
        organization=organization,
        role=role,
    )


def remove_member(membership, user):
    """Soft delete a membership. Prevent removing owner."""
    if membership.role and membership.role.code == "owner":
        raise PermissionDenied("Cannot remove owner")
    membership.is_deleted = True
    membership.save(update_fields=["is_deleted"])


def change_member_role(membership, new_role_code: str, user):
    """Change member role. Prevent demoting owner."""
    if membership.role and membership.role.code == "owner" and new_role_code != "owner":
        raise PermissionDenied("Cannot change owner role")
    from access_control.models import Role

    new_role = _get_role(membership.organization, new_role_code, Role.AssignmentScope.ORGANIZATION)
    membership.role = new_role
    membership.save(update_fields=["role"])


def transfer_ownership(current_membership, new_owner_id, user):
    """Transfer ownership from current owner to another active member. Atomic with row locks."""
    if not current_membership.role or current_membership.role.code != "owner":
        raise PermissionDenied("Only owner can transfer ownership")
    if current_membership.user != user:
        raise PermissionDenied("You are not the owner")

    owner_role = _get_role(current_membership.organization, "owner")
    admin_role = _get_role(current_membership.organization, "admin")

    with transaction.atomic():
        # Lock both memberships to prevent race conditions
        current = OrganizationMembership.objects.select_for_update().get(pk=current_membership.pk)
        target = OrganizationMembership.objects.select_for_update().get(
            pk=new_owner_id,
            organization=current.organization,
            is_deleted=False,
        )
        if target.role and target.role.code == "owner":
            raise ValidationError("Target is already owner")
        target.role = owner_role
        target.save(update_fields=["role"])
        current.role = admin_role
        current.save(update_fields=["role"])
    return current


def archive_organization(organization, user):
    """Set organization as archived."""
    organization.status = Organization.Status.ARCHIVED
    organization.save(update_fields=["status"])


def restore_organization(organization, user):
    """Restore archived organization."""
    organization.status = Organization.Status.ACTIVE
    organization.save(update_fields=["status"])


def get_team(organization_id, team_id) -> Team:
    return get_object_or_404(
        Team,
        id=team_id,
        organization_id=organization_id,
        is_deleted=False,
    )


def list_team_memberships(team: Team):
    return (
        TeamMembership.objects.filter(team=team, is_deleted=False)
        .select_related("user", "team", "role")
        .order_by("-created_at")
    )


def _ensure_active_organization_member(team: Team, user):
    return get_object_or_404(
        OrganizationMembership,
        user=user,
        organization=team.organization,
        is_deleted=False,
    )


def add_team_member(team: Team, user, role_code: str = "member") -> TeamMembership:
    """Add a user to a team with a team-scoped RBAC role."""
    from access_control.models import Role

    role = _get_role(team.organization, role_code, Role.AssignmentScope.TEAM)
    _ensure_active_organization_member(team, user)
    with transaction.atomic():
        membership, created = TeamMembership.all_objects.get_or_create(
            user=user,
            team=team,
            defaults={"role": role},
        )
        if not created:
            membership.role = role
            membership.is_deleted = False
        membership.full_clean()
        if not created:
            membership.save(update_fields=["role", "is_deleted", "updated_at"])
        return membership


def remove_team_member(membership: TeamMembership, user) -> None:
    """Soft delete a team membership."""
    membership.is_deleted = True
    membership.save(update_fields=["is_deleted"])


def change_team_member_role(membership: TeamMembership, new_role_code: str, user) -> TeamMembership:
    """Change a team membership role between team-scoped role presets."""
    from access_control.models import Role

    new_role = _get_role(membership.team.organization, new_role_code, Role.AssignmentScope.TEAM)
    with transaction.atomic():
        membership.role = new_role
        membership.full_clean()
        membership.save(update_fields=["role"])
    return membership

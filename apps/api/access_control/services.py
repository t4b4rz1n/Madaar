from typing import Any, Dict, Iterable, List, Set

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils.translation import gettext_lazy as _

from .models import Permission, Role

User = get_user_model()


def get_membership_role(user: Any, organization_id: Any) -> Role | None:
    """Return the user's active role in one organization, if assigned."""
    if not user or not user.is_authenticated or not organization_id:
        return None

    from organizations.models import OrganizationMembership

    membership = (
        OrganizationMembership.objects.filter(
            user=user,
            organization_id=organization_id,
            is_deleted=False,
            role__is_active=True,
            role__assignment_scope=Role.AssignmentScope.ORGANIZATION,
        )
        .select_related("role")
        .first()
    )
    return membership.role if membership else None


def get_team_membership_role(user: Any, organization_id: Any, team_id: Any) -> Role | None:
    """Return the user's active role in one team, if the team belongs to the organization."""
    if not user or not user.is_authenticated or not organization_id or not team_id:
        return None

    from organizations.models import TeamMembership

    membership = (
        TeamMembership.objects.filter(
            user=user,
            team_id=team_id,
            team__organization_id=organization_id,
            team__is_deleted=False,
            is_deleted=False,
            role__is_active=True,
            role__assignment_scope=Role.AssignmentScope.TEAM,
        )
        .select_related("role")
        .first()
    )
    return membership.role if membership else None


def get_user_roles(user: Any, organization_id: Any, team_id: Any = None) -> List[Role]:
    """Return organization role plus the team role in the requested team context."""
    roles = []
    organization_role = get_membership_role(user, organization_id)
    if organization_role:
        roles.append(organization_role)
    team_role = get_team_membership_role(user, organization_id, team_id)
    if team_role:
        roles.append(team_role)
    return roles


def get_user_effective_permissions(
    user: Any, organization_id: Any, team_id: Any = None
) -> Set[str]:
    """
    Calculate effective permissions for a user.
    Effective permissions come only from the user's active membership role in
    the requested organization.
    """
    if not user or not user.is_authenticated or not getattr(user, "is_active", True):
        return set()

    roles = get_user_roles(user, organization_id, team_id)
    if not roles:
        return set()
    return set(
        Permission.objects.filter(roles__in=roles, is_deleted=False)
        .distinct()
        .values_list("code", flat=True)
    )


def has_permission(
    user: Any, permission_code: str, organization_id: Any, team_id: Any = None
) -> bool:
    """
    Central permission checking service.
    """
    if not user or not user.is_authenticated:
        return False

    effective_perms = get_user_effective_permissions(user, organization_id, team_id)
    return permission_code in effective_perms


def get_user_permission_breakdown(
    user: Any, organization_id: Any, team_id: Any = None
) -> Dict[str, Any]:
    """
    Returns breakdown of user's permissions for frontend display:
    - the permission preset assigned through organization membership
    - effective permissions
    """
    if not user or not user.is_authenticated:
        return {
            "roles": [],
            "effective_permissions": [],
        }

    roles = []
    for role in get_user_roles(user, organization_id, team_id):
        roles.append(
            {
                "role_id": str(role.id),
                "role_name": role.name,
                "role_code": role.code,
                "assignment_scope": role.assignment_scope,
                "permissions": list(
                    role.permissions.filter(is_deleted=False).values_list("code", flat=True)
                ),
            }
        )

    effective = list(get_user_effective_permissions(user, organization_id, team_id))

    return {
        "roles": roles,
        "effective_permissions": effective,
    }


def resolve_permission_codes(permission_codes: Iterable[str]) -> List[Permission]:
    """Return active permissions and reject unknown or deleted codes."""
    codes = list(dict.fromkeys(permission_codes))
    permissions = list(Permission.objects.filter(code__in=codes, is_deleted=False))
    found_codes = {permission.code for permission in permissions}
    unknown_codes = [code for code in codes if code not in found_codes]
    if unknown_codes:
        raise ValidationError(
            _("Unknown or inactive permission codes: %(codes)s")
            % {"codes": ", ".join(unknown_codes)}
        )
    return permissions


def register_permission(
    code: str,
    name: str,
    module: str,
    group: str = "",
    description: str = "",
) -> Permission:
    """
    Register or update a module permission in the database registry.
    Format: <module>.<action>_<resource>
    """
    perm, _created = Permission.objects.update_or_create(
        code=code,
        defaults={
            "name": name,
            "module": module,
            "group": group,
            "description": description,
        },
    )
    return perm


def create_role(
    organization: Any,
    name: str,
    code: str,
    description: str = "",
    is_active: bool = True,
    is_system_role: bool = False,
    assignment_scope: str = Role.AssignmentScope.ORGANIZATION,
    permission_codes: List[str] = None,
) -> Role:
    """
    Create a new role entity with associated permissions.
    """
    with transaction.atomic():
        role = Role.objects.create(
            organization=organization,
            name=name,
            code=code,
            description=description,
            assignment_scope=assignment_scope,
            is_active=is_active,
            is_system_role=is_system_role,
        )
        if permission_codes is not None:
            perms = resolve_permission_codes(permission_codes)
            role.permissions.set(perms)
        return role


def update_role(
    role: Role,
    name: str = None,
    description: str = None,
    is_active: bool = None,
    permission_codes: List[str] = None,
) -> Role:
    """
    Update an existing role.
    If disabling (is_active=False), validates that we do not disable the last active admin role.
    """
    with transaction.atomic():
        if name is not None:
            role.name = name
        if description is not None:
            role.description = description
        if is_active is not None and is_active != role.is_active:
            if not is_active:
                disable_role(role)
            else:
                role.is_active = True

        if permission_codes is not None:
            perms = resolve_permission_codes(permission_codes)
            role.permissions.set(perms)

        role.save()
        return role


def disable_role(role: Role) -> Role:
    """
    Safely disable a role.
    Guarantees the system never disables the last active administrative role.
    """
    if role.code == "admin" or role.permissions.filter(code="access_control.manage_roles").exists():
        # Check if there are other active admin roles
        other_active_admin_exists = (
            Role.objects.filter(organization=role.organization, is_active=True, code="admin")
            .exclude(pk=role.pk)
            .exists()
        )

        if not other_active_admin_exists:
            raise ValidationError(
                _(
                    "Cannot disable the last active administrative role. The system must always maintain a valid administrative path."
                )
            )

    role.is_active = False
    role.save(update_fields=["is_active", "updated_at"])
    return role


def seed_default_roles_and_permissions(organization: Any = None) -> None:
    """
    Seed permission registry and default role presets for one organization.
    When no organization is supplied, all existing organizations are seeded.
    """
    # 1. Seed All Permissions
    default_permissions = [
        # Users Module
        ("users.view_user", "View Users", "users", "Users", "Can view user accounts and profiles"),
        ("users.create_user", "Create User", "users", "Users", "Can create new user accounts"),
        ("users.update_user", "Update User", "users", "Users", "Can update user accounts"),
        ("users.delete_user", "Delete User", "users", "Users", "Can soft delete user accounts"),
        (
            "users.manage_roles",
            "Manage User Roles",
            "users",
            "Users",
            "Can assign/remove roles for users",
        ),
        # Organizations Module (matches constants.py codes)
        (
            "organizations.view",
            "View Organization",
            "organizations",
            "Organizations",
            "Can view organizations",
        ),
        (
            "organizations.create",
            "Create Organization",
            "organizations",
            "Organizations",
            "Can create organizations",
        ),
        (
            "organizations.update",
            "Update Organization",
            "organizations",
            "Organizations",
            "Can update organizations",
        ),
        (
            "organizations.delete",
            "Delete Organization",
            "organizations",
            "Organizations",
            "Can delete organizations",
        ),
        (
            "organizations.archive",
            "Archive Organization",
            "organizations",
            "Organizations",
            "Can archive organizations",
        ),
        (
            "organizations.restore",
            "Restore Organization",
            "organizations",
            "Organizations",
            "Can restore archived organizations",
        ),
        ("members.remove", "Remove Member", "organizations", "Members", "Can remove members"),
        (
            "members.change_role",
            "Change Member Role",
            "organizations",
            "Members",
            "Can change member role",
        ),
        (
            "members.transfer_ownership",
            "Transfer Ownership",
            "organizations",
            "Members",
            "Can transfer org ownership",
        ),
        # Teams Module
        ("teams.view", "View Team", "organizations", "Teams", "Can view teams and subteams"),
        ("teams.create", "Create Team", "organizations", "Teams", "Can create teams"),
        ("teams.update", "Update Team", "organizations", "Teams", "Can update teams"),
        ("teams.delete", "Delete Team", "organizations", "Teams", "Can delete teams"),
        (
            "teams.assign_lead",
            "Assign Team Lead",
            "organizations",
            "Teams",
            "Deprecated. Use team_members.change_role for team lead assignment.",
        ),
        (
            "team_members.view",
            "View Team Members",
            "organizations",
            "Team Members",
            "Can view members of a team",
        ),
        (
            "team_members.add",
            "Add Team Member",
            "organizations",
            "Team Members",
            "Can add members to a team",
        ),
        (
            "team_members.remove",
            "Remove Team Member",
            "organizations",
            "Team Members",
            "Can remove members from a team",
        ),
        (
            "team_members.change_role",
            "Change Team Member Role",
            "organizations",
            "Team Members",
            "Can change a member role inside a team",
        ),
        # Access Control Module
        (
            "access_control.view_role",
            "View Roles",
            "access_control",
            "Roles",
            "Can view access roles",
        ),
        (
            "access_control.create_role",
            "Create Role",
            "access_control",
            "Roles",
            "Can create access roles",
        ),
        (
            "access_control.update_role",
            "Update Role",
            "access_control",
            "Roles",
            "Can update and toggle access roles",
        ),
        (
            "access_control.view_permission",
            "View Permissions",
            "access_control",
            "Permissions",
            "Can view registered system permissions",
        ),
        (
            "access_control.assign_role",
            "Assign Roles",
            "access_control",
            "Roles",
            "Can assign roles to users",
        ),
    ]

    created_perms = {}
    for code, name, module, group, desc in default_permissions:
        created_perms[code] = register_permission(code, name, module, group, desc)

    # 2. Define default role presets
    all_perm_codes = list(created_perms.keys())

    owner_perms = all_perm_codes  # Full access

    manager_perms = [
        "users.view_user",
        "users.create_user",
        "users.update_user",
        "organizations.view",
        "organizations.create",
        "organizations.update",
        "organizations.archive",
        "organizations.restore",
        "members.remove",
        "members.change_role",
        "teams.view",
        "teams.create",
        "teams.update",
        "teams.delete",
        "team_members.view",
        "team_members.add",
        "team_members.remove",
        "team_members.change_role",
        "access_control.view_role",
        "access_control.view_permission",
        "access_control.assign_role",
    ]

    employee_perms = [
        "users.view_user",
        "organizations.view",
        "teams.view",
    ]

    hr_perms = [
        "users.view_user",
        "users.create_user",
        "users.update_user",
        "organizations.view",
        "members.remove",
        "members.change_role",
        "teams.view",
        "team_members.view",
        "team_members.add",
        "team_members.remove",
        "team_members.change_role",
    ]

    accountant_perms = [
        "users.view_user",
        "organizations.view",
        "teams.view",
    ]

    admin_perms = all_perm_codes

    team_member_perms = [
        "teams.view",
        "team_members.view",
    ]

    team_lead_perms = [
        *team_member_perms,
        "team_members.add",
        "team_members.remove",
        "team_members.change_role",
    ]

    default_roles = [
        (
            "Admin",
            "admin",
            "Full Administrative Role",
            admin_perms,
            Role.AssignmentScope.ORGANIZATION,
        ),
        ("Owner", "owner", "Organization Owner", owner_perms, Role.AssignmentScope.ORGANIZATION),
        (
            "Manager",
            "manager",
            "Department/Organizational Manager",
            manager_perms,
            Role.AssignmentScope.ORGANIZATION,
        ),
        (
            "Employee",
            "employee",
            "Standard Employee Role",
            employee_perms,
            Role.AssignmentScope.ORGANIZATION,
        ),
        ("HR", "hr", "Human Resources Role", hr_perms, Role.AssignmentScope.ORGANIZATION),
        (
            "Accountant",
            "accountant",
            "Accountant Role",
            accountant_perms,
            Role.AssignmentScope.ORGANIZATION,
        ),
        ("Member", "member", "Team Member Role", team_member_perms, Role.AssignmentScope.TEAM),
        ("Lead", "lead", "Team Lead Role", team_lead_perms, Role.AssignmentScope.TEAM),
    ]

    if organization is None:
        from organizations.models import Organization

        organizations = Organization.objects.filter(is_deleted=False)
    else:
        organizations = [organization]

    for current_organization in organizations:
        for name, code, desc, perm_codes, assignment_scope in default_roles:
            role = Role.objects.filter(organization=current_organization, code=code).first()
            if not role:
                create_role(
                    organization=current_organization,
                    name=name,
                    code=code,
                    description=desc,
                    is_active=True,
                    is_system_role=True,
                    assignment_scope=assignment_scope,
                    permission_codes=perm_codes,
                )
            else:
                update_fields = []
                if not role.is_system_role:
                    role.is_system_role = True
                    update_fields.append("is_system_role")
                if role.assignment_scope != assignment_scope:
                    role.assignment_scope = assignment_scope
                    update_fields.append("assignment_scope")
                if not role.is_active:
                    role.is_active = True
                    update_fields.append("is_active")
                if update_fields:
                    update_fields.append("updated_at")
                    role.save(update_fields=update_fields)
                role.permissions.set(resolve_permission_codes(perm_codes))

        legacy_team_lead = Role.objects.filter(
            organization=current_organization,
            code="team_lead",
            assignment_scope=Role.AssignmentScope.ORGANIZATION,
            is_active=True,
        ).first()
        employee_role = Role.objects.filter(
            organization=current_organization,
            code="employee",
            assignment_scope=Role.AssignmentScope.ORGANIZATION,
            is_active=True,
        ).first()
        if legacy_team_lead:
            if employee_role:
                from organizations.models import OrganizationMembership

                OrganizationMembership.objects.filter(
                    organization=current_organization,
                    role=legacy_team_lead,
                    is_deleted=False,
                ).update(role=employee_role)
            legacy_team_lead.is_active = False
            legacy_team_lead.is_system_role = True
            legacy_team_lead.save(update_fields=["is_active", "is_system_role", "updated_at"])

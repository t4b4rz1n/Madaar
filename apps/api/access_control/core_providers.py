"""Database-backed providers for organization-scoped RBAC."""

from typing import Set

from access_control.permissions import RolePermissionProvider, RoleProvider


class DatabaseRoleProvider(RoleProvider):
    """Resolve organization role plus an optional same-team role."""

    def get_roles(self, user, context: dict) -> Set[str]:
        organization_id = context.get("organization_id")
        if not organization_id:
            return set()

        from organizations.models import OrganizationMembership, TeamMembership

        membership = (
            OrganizationMembership.objects.filter(
                user=user,
                organization_id=organization_id,
                is_deleted=False,
                role__is_active=True,
                role__assignment_scope="organization",
            )
            .select_related("role")
            .first()
        )
        role_ids = {str(membership.role_id)} if membership and membership.role_id else set()

        team_id = context.get("team_id")
        if team_id:
            team_membership = (
                TeamMembership.objects.filter(
                    user=user,
                    team_id=team_id,
                    team__organization_id=organization_id,
                    team__is_deleted=False,
                    is_deleted=False,
                    role__is_active=True,
                    role__assignment_scope="team",
                )
                .select_related("role")
                .first()
            )
            if team_membership and team_membership.role_id:
                role_ids.add(str(team_membership.role_id))

        return role_ids


class DatabaseRolePermissionProvider(RolePermissionProvider):
    """Read permission codes from an active organization-local Role preset."""

    def get_permissions_for_role(self, role_id: str) -> Set[str]:
        from access_control.models import Permission

        return set(
            Permission.objects.filter(
                roles__id=role_id,
                roles__is_active=True,
                is_deleted=False,
            ).values_list("code", flat=True)
        )

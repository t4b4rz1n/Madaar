"""
reports/permissions.py
----------------------
Role-based permission classes for the reporting & analytics endpoints.

Access matrix
~~~~~~~~~~~~~
+----------------------------+-----------------------------------------------------+
| Dashboard level            | Allowed roles                                       |
+============================+=====================================================+
| Employee Dashboard         | Any authenticated member of an organisation         |
| Manager Dashboard          | owner, admin, team_lead (org) OR lead (team)        |
| Manager Members            | Same as Manager Dashboard                           |
| Executive Dashboard        | owner, admin only                                   |
+----------------------------+-----------------------------------------------------+

Design notes
~~~~~~~~~~~~
* All dashboard endpoints are **read-only** (GET).  Non-safe methods are
  always denied.
* Organisation membership is resolved from the ``org_id`` query-parameter
  (executive) or derived from ``team_id`` (manager).
* Staff / superuser always has full access.
"""

from django.utils.translation import gettext_lazy as _
from rest_framework import permissions

from organizations.models import OrganizationMembership, TeamMembership

# ---------------------------------------------------------------------------
# Helpers (private)
# ---------------------------------------------------------------------------


def _get_user_org_roles(user):
    """Return a queryset of the user's non-deleted organisation memberships."""
    return OrganizationMembership.objects.filter(
        user=user,
        is_deleted=False,
    )


def _is_org_member(user, org_id) -> bool:
    """Check whether *user* belongs to the given organisation."""
    return _get_user_org_roles(user).filter(organization_id=org_id).exists()


def _get_org_role(user, org_id) -> str | None:
    """Return the user's role in the given organisation, or ``None``."""
    membership = _get_user_org_roles(user).filter(organization_id=org_id).first()
    return membership.role if membership else None


def _is_org_admin_or_owner(user, org_id) -> bool:
    """Check whether *user* is admin or owner of the given organisation."""
    return (
        _get_user_org_roles(user)
        .filter(
            organization_id=org_id,
            role__in=[
                OrganizationMembership.Role.OWNER,
                OrganizationMembership.Role.ADMIN,
            ],
        )
        .exists()
    )


def _is_team_lead(user, team_id) -> bool:
    """Check whether *user* is lead of the given team."""
    return TeamMembership.objects.filter(
        user=user,
        team_id=team_id,
        role=TeamMembership.Role.LEAD,
        is_deleted=False,
    ).exists()


def _get_managed_team_ids(user):
    """Return IDs of all teams where *user* is a lead."""
    return list(
        TeamMembership.objects.filter(
            user=user,
            role=TeamMembership.Role.LEAD,
            is_deleted=False,
        ).values_list("team_id", flat=True)
    )


# ---------------------------------------------------------------------------
# Employee-level permission
# ---------------------------------------------------------------------------


class IsEmployeeOrAbove(permissions.BasePermission):
    """Any authenticated member of at least one organisation may access
    the employee dashboard.

    The employee dashboard is personal — it shows only the requesting
    user's own data — so no organisation/team filtering is required at
    the permission level.
    """

    message = _("You must be a member of an organisation to access dashboards.")

    def has_permission(self, request, view):
        if request.method not in permissions.SAFE_METHODS:
            return False

        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_staff or user.is_superuser:
            return True

        return _get_user_org_roles(user).exists()


# ---------------------------------------------------------------------------
# Manager-level permission
# ---------------------------------------------------------------------------


class IsManagerOrAbove(permissions.BasePermission):
    """Managers (team_lead, admin, owner) may access team-level dashboards.

    Access is validated against the ``team_id`` query-parameter:
    * ``owner`` / ``admin`` of the team's organisation → full access
    * ``team_lead`` in the org AND lead of the specific team → access
    * All others → denied

    If no ``team_id`` is provided, access is granted only if the user
    leads at least one team (the view will auto-select their teams).
    """

    message = _("You must be a team lead or organisation admin to access this dashboard.")

    def has_permission(self, request, view):
        if request.method not in permissions.SAFE_METHODS:
            return False

        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_staff or user.is_superuser:
            return True

        team_id = request.query_params.get("team_id")

        if team_id:
            # Resolve the team's organisation to check org-level role
            from organizations.models import Team

            try:
                team = Team.objects.get(pk=team_id, is_deleted=False)
            except Team.DoesNotExist:
                return False

            org_id = team.organization_id

            # Org admin/owner → full access to any team in their org
            if _is_org_admin_or_owner(user, org_id):
                return True

            # Team lead of the org who also leads this specific team
            org_role = _get_org_role(user, org_id)
            if org_role == OrganizationMembership.Role.TEAM_LEAD:
                return _is_team_lead(user, team_id)

            return False

        # No team_id provided — allow if user leads at least one team
        managed_teams = _get_managed_team_ids(user)
        if managed_teams:
            return True

        # Also allow org admins/owners (they may not lead a specific team)
        return (
            _get_user_org_roles(user)
            .filter(
                role__in=[
                    OrganizationMembership.Role.OWNER,
                    OrganizationMembership.Role.ADMIN,
                ],
            )
            .exists()
        )


# ---------------------------------------------------------------------------
# Executive-level permission
# ---------------------------------------------------------------------------


class IsExecutive(permissions.BasePermission):
    """Only organisation owners and admins may access the executive dashboard.

    Access is validated against the ``org_id`` query-parameter.
    """

    message = _("Only organisation owners and admins can access the executive dashboard.")

    def has_permission(self, request, view):
        if request.method not in permissions.SAFE_METHODS:
            return False

        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_staff or user.is_superuser:
            return True

        org_id = request.query_params.get("org_id")

        if org_id:
            return _is_org_admin_or_owner(user, org_id)

        # No org_id — allow if user is admin/owner of at least one org
        return (
            _get_user_org_roles(user)
            .filter(
                role__in=[
                    OrganizationMembership.Role.OWNER,
                    OrganizationMembership.Role.ADMIN,
                ],
            )
            .exists()
        )

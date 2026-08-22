"""
Bootstrap for core.PermissionResolver using DB-backed providers from access_control.
Replaces the old hardcoded mapping-based resolver.
"""

from access_control.core_providers import DatabaseRolePermissionProvider, DatabaseRoleProvider
from access_control.permissions import PermissionResolver


def get_organization_resolver() -> PermissionResolver:
    """
    Returns a PermissionResolver backed by the access_control database.
    - Roles and permissions are read live from DB.
    - Org-scoped membership roles are resolved via OrganizationMembership.role FK.
    """
    role_provider = DatabaseRoleProvider()
    perm_provider = DatabaseRolePermissionProvider()
    return PermissionResolver(role_provider, perm_provider)

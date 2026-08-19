from .providers import RolePermissionProvider, RoleProvider


class PermissionResolver:
    def __init__(self, role_provider: RoleProvider, role_perm_provider: RolePermissionProvider):
        self.role_provider = role_provider
        self.role_perm_provider = role_perm_provider

    def has_permission(self, user, permission: str, context: dict) -> bool:
        if not user or not user.is_authenticated:
            return False
        roles = self.role_provider.get_roles(user, context)
        for role in roles:
            if permission in self.role_perm_provider.get_permissions_for_role(role):
                return True
        return False


_resolver = None


def set_resolver(resolver: PermissionResolver) -> None:
    global _resolver
    _resolver = resolver


def get_resolver() -> PermissionResolver:
    if _resolver is None:
        raise RuntimeError("Permission resolver not configured. Ensure bootstrap is imported.")
    return _resolver

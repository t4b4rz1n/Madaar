from rest_framework import permissions

from organizations.services import PermissionService


class CanManageUsers(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.is_staff or request.user.is_superuser:
            return True

        # Get the first organization for the user
        mem = request.user.org_memberships.filter(is_deleted=False).first()
        if not mem or not mem.organization_id:
            return False

        org_id = mem.organization_id

        # Action specific checks
        if view.action in ["list", "retrieve"]:
            return PermissionService.has_permission(
                request.user, "user.view", org_id
            ) or PermissionService.has_permission(request.user, "org.manage_members", org_id)
        else:
            return PermissionService.has_permission(request.user, "org.manage_members", org_id)

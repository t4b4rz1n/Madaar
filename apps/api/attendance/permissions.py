from rest_framework import permissions

class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Object-level permission to only allow owners of an object to access it.
    Superusers and staff have full access.
    """
    def has_object_permission(self, request, view, obj):
        # Admins have full access
        if request.user and (request.user.is_superuser or request.user.is_staff):
            return True

        # Instance must have an attribute named `user`.
        return obj.user == request.user

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Object-level permission to only allow admins to edit it.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and (request.user.is_superuser or request.user.is_staff)

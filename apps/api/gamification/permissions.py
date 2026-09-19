from rest_framework import permissions


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    The request is authenticated as an admin, or is a read-only request.
    In both cases the user must be authenticated.
    """

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return bool(
            request.method in permissions.SAFE_METHODS or request.user.is_staff
        )


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Object-level permission: allow access only to the object's owner or staff.
    The view must set `owner_field` on the ViewSet, defaulting to 'user'.
    """

    def has_object_permission(self, request, view, obj):
        if request.user and request.user.is_staff:
            return True
        owner_field = getattr(view, "owner_field", "user")
        # Support both direct FK (obj.user) and reporter/mentor fields
        for field in owner_field if isinstance(owner_field, (list, tuple)) else [owner_field]:
            if getattr(obj, field, None) == request.user:
                return True
        return False


from rest_framework import permissions


class IsTaskAssigneeOrReporterOrReadOnly(permissions.BasePermission):
    """
    Custom permission to allow only the assignee or reporter of a task to modify it.
    Read-only access is granted for safe HTTP methods.
    """

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        if hasattr(obj, "assignee") and obj.assignee == request.user:
            return True

        if hasattr(obj, "reporter") and obj.reporter == request.user:
            return True

        if hasattr(obj, "user") and obj.user == request.user:
            return True

        if hasattr(obj, "author") and obj.author == request.user:
            return True

        return request.user and request.user.is_staff

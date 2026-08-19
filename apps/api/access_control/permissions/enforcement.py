from functools import wraps

from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission

from .resolver import get_resolver


def permission_required(permission: str, org_kwarg: str = "organization_id"):
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            resolver = get_resolver()
            context = {}
            org_id = kwargs.get(org_kwarg)
            if org_id is not None:
                context["organization_id"] = org_id
            if not resolver.has_permission(request.user, permission, context):
                raise PermissionDenied
            return view_func(request, *args, **kwargs)

        return wrapper

    return decorator


class HasPermission(BasePermission):
    def has_permission(self, request, view):
        permission = getattr(view, "required_permission", None)
        if permission is None and hasattr(view, "get_required_permission"):
            permission = view.get_required_permission(request)
        if permission is None:
            return False
        resolver = get_resolver()
        if hasattr(view, "get_permission_context"):
            context = view.get_permission_context(request)
        else:
            context = {}
            org_kwarg = getattr(view, "organization_id_kwarg", "organization_id")
            org_id = view.kwargs.get(org_kwarg)
            if org_id is not None:
                context["organization_id"] = org_id
        return resolver.has_permission(request.user, permission, context)

from rest_framework import permissions


class BaseAttendancePermission(permissions.BasePermission):
    def get_user_org_role(self, request, organization_id=None):
        user = request.user
        if not user or not user.is_authenticated:
            return None
        if user.is_staff or user.is_superuser:
            return "owner"

        if not hasattr(request, "_user_org_roles_cache"):
            request._user_org_roles_cache = {}

        cache_key = str(organization_id) if organization_id else "default"
        if cache_key in request._user_org_roles_cache:
            return request._user_org_roles_cache[cache_key]

        qs = user.org_memberships.all()
        if organization_id:
            qs = qs.filter(organization_id=organization_id)

        membership = qs.first()
        role = membership.role.lower() if membership else None
        request._user_org_roles_cache[cache_key] = role
        return role

    def extract_organization_id(self, request, view, obj=None):
        if obj and hasattr(obj, "organization_id"):
            return obj.organization_id
        if hasattr(request, "data") and request.data.get("organization"):
            return request.data.get("organization")
        if hasattr(request, "query_params"):
            if request.query_params.get("organization"):
                return request.query_params.get("organization")
            project_id = request.query_params.get("project")
            if project_id:
                from projects.models import Project

                project = Project.objects.filter(id=project_id).first()
                if project:
                    return project.organization_id
        return None

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return True


class IsAttendanceOwnerOrAdmin(BaseAttendancePermission):
    """Attendance: only the record owner or Owner/Admin can access."""

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff or request.user.is_superuser:
            return True
        if obj.user == request.user:
            return True
        role = self.get_user_org_role(request, obj.organization_id)
        return role in ["owner", "admin"]


class IsTimeLogOwnerOrAdmin(BaseAttendancePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.is_staff or request.user.is_superuser:
            return True

        # Check org from project or task
        org_id = None
        if obj.project:
            org_id = obj.project.organization_id
        elif obj.task and obj.task.project:
            org_id = obj.task.project.organization_id

        if request.method in permissions.SAFE_METHODS:
            role = self.get_user_org_role(request, org_id)
            return role is not None

        if obj.user == request.user:
            return True
        role = self.get_user_org_role(request, org_id)
        return role in ["owner", "admin"]


class IsTimeOffRequestPermission(BaseAttendancePermission):
    """Time-off: only the requester or Owner/Admin can view/modify; approve/reject is Owner/Admin only."""

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff or request.user.is_superuser:
            return True

        is_owner = obj.user == request.user
        role = self.get_user_org_role(request, obj.organization_id)
        is_manager = role in ["owner", "admin"]

        if view.action in ["approve", "reject"]:
            return is_manager

        if view.action == "cancel":
            return is_owner and obj.status == "pending"

        return is_owner or is_manager


class IsHolidayPermission(BaseAttendancePermission):
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False

        if request.method in permissions.SAFE_METHODS:
            return True

        if request.user.is_staff or request.user.is_superuser:
            return True

        org_id = self.extract_organization_id(request, view)
        if not org_id:
            return False

        role = self.get_user_org_role(request, org_id)
        return role in ["owner", "admin"]


class IsTimesheetPermission(BaseAttendancePermission):
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False

        if view.action in ["team", "project"]:
            # All org members can view team/project timesheets
            org_id = self.extract_organization_id(request, view)
            role = self.get_user_org_role(request, org_id)
            return role is not None or request.user.is_staff

        # personal timesheets (daily/weekly/monthly)
        return True

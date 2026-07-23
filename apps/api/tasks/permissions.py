from rest_framework import permissions


def get_user_org_role(request, organization_id=None):
    """Retrieves and caches the user's role in an organization (prevents N+1 DB queries)."""
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
    if membership:
        role = membership.role.lower()
    elif organization_id is None:
        role = "owner"
    else:
        role = None

    request._user_org_roles_cache[cache_key] = role
    return role


def extract_organization_id(obj_or_request):
    """Extracts organization_id from object or request context."""
    if hasattr(obj_or_request, "organization_id") and obj_or_request.organization_id:
        return obj_or_request.organization_id
    if hasattr(obj_or_request, "organization") and obj_or_request.organization:
        return getattr(obj_or_request.organization, "id", None)
    if hasattr(obj_or_request, "project") and obj_or_request.project:
        return getattr(obj_or_request.project, "organization_id", None)
    if hasattr(obj_or_request, "board") and obj_or_request.board:
        project = getattr(obj_or_request.board, "project", None)
        return getattr(project, "organization_id", None) if project else None
    if hasattr(obj_or_request, "task") and obj_or_request.task:
        project = getattr(obj_or_request.task, "project", None)
        return getattr(project, "organization_id", None) if project else None

    if hasattr(obj_or_request, "method") and obj_or_request.method in [
        "POST",
        "PUT",
        "PATCH",
    ]:
        try:
            data = getattr(obj_or_request, "data", {})
            if isinstance(data, dict):
                org_id = data.get("organization") or data.get("organization_id")
                if org_id:
                    return org_id
                proj_id = data.get("project") or data.get("project_id")
                if proj_id:
                    from projects.models import Project

                    return (
                        Project.objects.filter(id=proj_id)
                        .values_list("organization_id", flat=True)
                        .first()
                    )
        except Exception:
            pass

    if hasattr(obj_or_request, "query_params"):
        org_id = obj_or_request.query_params.get(
            "organization"
        ) or obj_or_request.query_params.get("organization_id")
        if org_id:
            return org_id
        proj_id = obj_or_request.query_params.get(
            "project"
        ) or obj_or_request.query_params.get("project_id")
        if proj_id:
            from projects.models import Project

            return (
                Project.objects.filter(id=proj_id)
                .values_list("organization_id", flat=True)
                .first()
            )

    return None


def extract_project_id(obj_or_request):
    """Extracts project_id from object or request context."""
    if hasattr(obj_or_request, "project_id") and obj_or_request.project_id:
        return obj_or_request.project_id
    if hasattr(obj_or_request, "project") and obj_or_request.project:
        return getattr(obj_or_request.project, "id", None)
    if hasattr(obj_or_request, "board") and obj_or_request.board:
        return getattr(obj_or_request.board, "project_id", None)
    if hasattr(obj_or_request, "task") and obj_or_request.task:
        return getattr(obj_or_request.task, "project_id", None)

    if hasattr(obj_or_request, "query_params"):
        p_id = obj_or_request.query_params.get(
            "project"
        ) or obj_or_request.query_params.get("project_id")
        if p_id:
            return p_id

    if hasattr(obj_or_request, "method") and obj_or_request.method in [
        "POST",
        "PUT",
        "PATCH",
    ]:
        try:
            data = getattr(obj_or_request, "data", {})
            if isinstance(data, dict):
                return data.get("project") or data.get("project_id")
        except Exception:
            pass

    return None


def is_user_project_member(request, project_id):
    """Checks if the user is an active member of the given project."""
    user = request.user
    if not user or not user.is_authenticated:
        return False
    if user.is_staff or user.is_superuser:
        return True
    if not project_id:
        return False

    if not hasattr(request, "_user_project_memberships_cache"):
        from projects.models import ProjectMember

        p_ids = set(
            ProjectMember.objects.filter(user=user, is_active=True).values_list(
                "project_id", flat=True
            )
        )
        request._user_project_memberships_cache = {str(pid) for pid in p_ids}

    return str(project_id) in request._user_project_memberships_cache


class BaseMadaarPermission(permissions.BasePermission):
    """Base permission enforcing auth, org isolation, staff bypass, and role caching."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_staff or request.user.is_superuser:
            return True

        org_id = extract_organization_id(request)
        role = get_user_org_role(request, org_id)

        if org_id is not None and role is None:
            return False

        return self.check_permission(request, view)

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_staff or request.user.is_superuser:
            return True

        org_id = extract_organization_id(obj)
        role = get_user_org_role(request, org_id)

        if org_id is not None and role is None:
            return False

        return self.check_object_permission(request, view, obj)

    def check_permission(self, request, view):
        return True

    def check_object_permission(self, request, view, obj):
        return True


class IsBoardPermission(BaseMadaarPermission):
    """Board access: Read for org members; Modify for Owner, Admin, Team Lead, or Creator."""

    def check_permission(self, request, view):
        org_id = extract_organization_id(request)
        role = get_user_org_role(request, org_id)
        if role is None:
            return False
        return role in ["owner", "admin", "team_lead"]

    def check_object_permission(self, request, view, obj):
        if hasattr(obj, "created_by") and obj.created_by == request.user:
            return True
        org_id = extract_organization_id(obj)
        role = get_user_org_role(request, org_id)
        if role is None:
            return False
        return role in ["owner", "admin", "team_lead"]


class IsTaskStatusPermission(BaseMadaarPermission):
    """Kanban status access: Modify for Owner, Admin, Board Creator, or Team Lead."""

    def check_permission(self, request, view):
        org_id = extract_organization_id(request)
        role = get_user_org_role(request, org_id)
        if role is None:
            return False
        return role in ["owner", "admin", "team_lead"]

    def check_object_permission(self, request, view, obj):
        if hasattr(obj, "board") and obj.board and obj.board.created_by == request.user:
            return True
        org_id = extract_organization_id(obj)
        role = get_user_org_role(request, org_id)
        if role is None:
            return False
        return role in ["owner", "admin", "team_lead"]


class IsTaskPermission(BaseMadaarPermission):
    """Task access: Read for org members; Modify for Owner, Admin, Lead, or Assignee/Reporter."""

    def check_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True

        org_id = extract_organization_id(request)
        role = get_user_org_role(request, org_id)
        if role in ["accountant", "hr"]:
            return False

        if role in ["team_lead", "employee"]:
            project_id = extract_project_id(request)
            if project_id and not is_user_project_member(request, project_id):
                return False

        return True

    def check_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        org_id = extract_organization_id(obj)
        role = get_user_org_role(request, org_id)

        if role in ["accountant", "hr"]:
            return False

        project_id = extract_project_id(obj)

        if role in ["owner", "admin"]:
            return True

        if role == "team_lead":
            if project_id and not is_user_project_member(request, project_id):
                return False
            return True

        if request.method == "DELETE":
            return hasattr(obj, "reporter") and obj.reporter == request.user

        if role == "employee":
            if project_id and not is_user_project_member(request, project_id):
                return False

        if hasattr(obj, "assignee") and obj.assignee == request.user:
            return True
        if hasattr(obj, "reporter") and obj.reporter == request.user:
            return True
        if hasattr(obj, "created_by") and obj.created_by == request.user:
            return True

        return False


class IsTaskChecklistPermission(BaseMadaarPermission):
    """Checklist access: Toggle/Modify for Admin, Owner, Lead, Assignee, Reporter, or Creator."""

    def check_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True

        org_id = extract_organization_id(request)
        role = get_user_org_role(request, org_id)
        return role not in ["accountant", "hr"]

    def check_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        org_id = extract_organization_id(obj)
        role = get_user_org_role(request, org_id)
        if role in ["accountant", "hr"]:
            return False

        project_id = extract_project_id(obj)

        if role in ["owner", "admin"]:
            return True

        if role == "team_lead":
            if project_id and not is_user_project_member(request, project_id):
                return False
            return True

        if hasattr(obj, "created_by") and obj.created_by == request.user:
            return True

        if hasattr(obj, "task") and obj.task:
            if project_id and not is_user_project_member(request, project_id):
                return False
            if obj.task.assignee == request.user or obj.task.reporter == request.user:
                return True

        return False


class IsTaskCommentPermission(BaseMadaarPermission):
    """Task comment access: Create for project members; Edit/Delete for Author, Admin, or Owner."""

    def check_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True

        org_id = extract_organization_id(request)
        role = get_user_org_role(request, org_id)
        if role in ["accountant", "hr"]:
            return False

        if role in ["team_lead", "employee"]:
            project_id = extract_project_id(request)
            if project_id and not is_user_project_member(request, project_id):
                return False

        return True

    def check_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        if hasattr(obj, "author") and obj.author == request.user:
            return True
        if hasattr(obj, "user") and obj.user == request.user:
            return True

        org_id = extract_organization_id(obj)
        role = get_user_org_role(request, org_id)
        if role in ["accountant", "hr"]:
            return False

        project_id = extract_project_id(obj)

        if role in ["owner", "admin"]:
            return True

        if role in ["team_lead", "employee"]:
            if project_id and not is_user_project_member(request, project_id):
                return False

        return False


class IsAsyncStandupPermission(BaseMadaarPermission):
    """Async Standup access: Read for org members; Create for org users; Modify for Author, Admin, or Owner."""

    def check_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        if hasattr(obj, "user") and obj.user == request.user:
            return True

        org_id = extract_organization_id(obj)
        role = get_user_org_role(request, org_id)
        return role in ["owner", "admin"]


# Legacy aliases for backward compatibility
IsTaskAssigneeOrReporterOrReadOnly = IsTaskPermission
IsBoardOwnerOrReadOnly = IsBoardPermission

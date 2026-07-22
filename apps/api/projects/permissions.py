"""
projects/permissions.py
-----------------------
Custom DRF permission classes for the projects application.

Access matrix
~~~~~~~~~~~~~
+----------------------------+-------------------------------------------------+
| Action                     | Allowed for                                     |
+============================+=================================================+
| Project list / detail      | Any authenticated user in the same org (+ staff)|
| Project create             | Org admin / owner (+ staff)                     |
| Project update / delete    | Project owner, org admin/owner (+ staff)        |
| ProjectMember write        | Project owner, org admin/owner (+ staff)        |
| Milestone write            | Project members + project owner + org admin     |
| Activity feed (read-only)  | Project members, org members (+ staff)          |
+----------------------------+-------------------------------------------------+
"""

from django.utils.translation import gettext_lazy as _
from rest_framework import permissions

from organizations.models import OrganizationMembership

# ---------------------------------------------------------------------------
# Helpers (private)
# ---------------------------------------------------------------------------


def _get_org_role(user, organization):
    """Return the user's organisation role, or ``None``."""
    if not organization:
        return None
    try:
        return OrganizationMembership.objects.get(
            user=user, organization=organization, is_deleted=False
        ).role
    except OrganizationMembership.DoesNotExist:
        return None


def _is_org_admin(user, organization) -> bool:
    """Check whether *user* is admin or owner of *organization*."""
    role = _get_org_role(user, organization)
    return role in (
        OrganizationMembership.Role.OWNER,
        OrganizationMembership.Role.ADMIN,
    )


def _is_project_member(user, project) -> bool:
    return project.members.filter(user=user, is_deleted=False).exists()


def _is_project_owner(user, project) -> bool:
    return project.owner_id == user.pk


# ---------------------------------------------------------------------------
# Base helper
# ---------------------------------------------------------------------------


class _ProjectFromKwargsMixin(permissions.BasePermission):
    """Extracts the parent ``Project`` from the view's URL kwargs.

    For nested viewsets the ``project_pk`` kwarg holds the UUID of the
    parent project.  For the top-level ``ProjectViewSet`` the kwarg is
    just ``pk``.  This mixin normalises access via ``_get_project(view)``.
    """

    @staticmethod
    def _get_project(view):
        pk = view.kwargs.get("project_pk") or view.kwargs.get("pk")
        if not pk:
            return None
        try:
            from projects.models import Project

            return Project.objects.get(pk=pk, is_deleted=False)
        except Project.DoesNotExist:
            return None


# ---------------------------------------------------------------------------
# Project-level permissions
# ---------------------------------------------------------------------------


class IsProjectOwnerOrOrgAdmin(permissions.BasePermission):
    """Object-level: allow writes only for project owner, org admin, or staff."""

    message = _("You do not have permission to modify this project.")

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        if user.is_staff:
            return True
        if _is_project_owner(user, obj):
            return True
        if _is_org_admin(user, obj.organization):
            return True
        return False


class CanCreateProject(permissions.BasePermission):
    """View-level: only org admins/owners (or staff) may create projects."""

    message = _("Only organisation admins or staff can create projects.")

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_staff:
            return True
        return OrganizationMembership.objects.filter(
            user=user,
            role__in=[
                OrganizationMembership.Role.OWNER,
                OrganizationMembership.Role.ADMIN,
            ],
            is_deleted=False,
        ).exists()


# ---------------------------------------------------------------------------
# Member-level permissions
# ---------------------------------------------------------------------------


class CanManageProjectMember(_ProjectFromKwargsMixin):
    """View-level: project owner, org admin, or staff can manage members."""

    message = _("You do not have permission to manage project members.")

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_staff:
            return True
        project = self._get_project(view)
        if project is None:
            return True  # let the view raise 404
        if _is_project_owner(user, project):
            return True
        if _is_org_admin(user, project.organization):
            return True
        return False


# ---------------------------------------------------------------------------
# Milestone-level permissions
# ---------------------------------------------------------------------------


class CanManageMilestone(_ProjectFromKwargsMixin):
    """View-level: project members (+ owner, org admin, staff) can manage milestones."""

    message = _("You must be a project member to manage milestones.")

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_staff:
            return True
        project = self._get_project(view)
        if project is None:
            return True
        if _is_project_owner(user, project):
            return True
        if _is_org_admin(user, project.organization):
            return True
        if _is_project_member(user, project):
            return True
        return False


# ---------------------------------------------------------------------------
# Activity (read-only) permission
# ---------------------------------------------------------------------------


class CanViewProjectActivity(_ProjectFromKwargsMixin):
    """Activity feed is visible to org members, project members, or staff."""

    message = _("You do not have permission to view this project's activity.")

    def has_permission(self, request, view):
        if request.method not in permissions.SAFE_METHODS:
            return False  # activity is always read-only
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_staff:
            return True
        project = self._get_project(view)
        if project is None:
            return True
        if _is_project_owner(user, project):
            return True
        if _get_org_role(user, project.organization):
            return True
        if _is_project_member(user, project):
            return True
        return False

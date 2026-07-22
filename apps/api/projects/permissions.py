"""
projects/permissions.py
-----------------------
Custom DRF permission classes for the projects app.

Access matrix:
    - Project list/detail : any authenticated user in the same org (or staff)
    - Project create      : org admin / owner or staff
    - Project update      : project owner, org admin/owner, or staff
    - Project delete      : project owner, org admin/owner, or staff
    - ProjectMember write : project owner, org admin/owner, or staff
    - Milestone write     : project members + above
    - Activity (read-only): project members or staff
"""

from django.utils.translation import gettext_lazy as _
from rest_framework import permissions

from organizations.models import OrganizationMembership


def _get_org_role(user, organization):
    """Return the user's role in *organization*, or None if not a member."""
    try:
        return OrganizationMembership.objects.get(
            user=user, organization=organization, is_deleted=False
        ).role
    except OrganizationMembership.DoesNotExist:
        return None


def _is_org_admin(user, organization):
    role = _get_org_role(user, organization)
    return role in (
        OrganizationMembership.Role.OWNER,
        OrganizationMembership.Role.ADMIN,
    )


def _is_project_member(user, project):
    return project.members.filter(user=user, is_deleted=False).exists()


def _is_project_owner(user, project):
    return project.owner_id == user.pk


# ---------------------------------------------------------------------------
# Base helper mixin
# ---------------------------------------------------------------------------


class _ProjectPermBase(permissions.BasePermission):
    """Shared helper to extract the project from view.get_object() or kwargs."""

    def _project(self, view):
        # For nested routes the project is in kwargs
        project_pk = view.kwargs.get("project_pk") or view.kwargs.get("pk")
        if not project_pk:
            return None
        try:
            from projects.models import Project

            return Project.objects.get(pk=project_pk, is_deleted=False)
        except (Project.DoesNotExist, Exception):
            return None


# ---------------------------------------------------------------------------
# Project-level permissions
# ---------------------------------------------------------------------------


class IsProjectOwnerOrOrgAdmin(permissions.BasePermission):
    """Allow write access only to project owner, org admin/owner, or staff."""

    message = _("You do not have permission to modify this project.")

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        if user.is_staff:
            return True
        if _is_project_owner(user, obj):
            return True
        if obj.organization and _is_org_admin(user, obj.organization):
            return True
        return False


class CanCreateProject(permissions.BasePermission):
    """Allow project creation to org admin/owner or staff."""

    message = _("Only organisation admins or staff can create projects.")

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_staff:
            return True
        # At least one org where user is admin/owner
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


class CanManageProjectMember(_ProjectPermBase):
    """Allow member CRUD to project owner, org admin/owner, or staff."""

    message = _("You do not have permission to manage project members.")

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_staff:
            return True
        project = self._project(view)
        if not project:
            return True  # let 404 handle it
        if _is_project_owner(user, project):
            return True
        if project.organization and _is_org_admin(user, project.organization):
            return True
        return False


# ---------------------------------------------------------------------------
# Milestone-level permissions
# ---------------------------------------------------------------------------


class CanManageMilestone(_ProjectPermBase):
    """Allow milestone CRUD to project members, owner, org admin/owner, or staff."""

    message = _("You must be a project member to manage milestones.")

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_staff:
            return True
        project = self._project(view)
        if not project:
            return True
        if _is_project_owner(user, project):
            return True
        if project.organization and _is_org_admin(user, project.organization):
            return True
        if _is_project_member(user, project):
            return True
        return False


# ---------------------------------------------------------------------------
# Activity (read-only) permission
# ---------------------------------------------------------------------------


class CanViewProjectActivity(_ProjectPermBase):
    """Activity feed is visible to project members, org members, or staff."""

    message = _("You do not have permission to view this project's activity.")

    def has_permission(self, request, view):
        if not request.method in permissions.SAFE_METHODS:
            return False  # activity is always read-only via API
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_staff:
            return True
        project = self._project(view)
        if not project:
            return True
        if _is_project_owner(user, project):
            return True
        if project.organization and _get_org_role(user, project.organization):
            return True
        return False

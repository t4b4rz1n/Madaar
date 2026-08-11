from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache

from tasks.models import Task
from attendance.models import TimeLog, Attendance
from projects.models import Project, ProjectMember
from organizations.models import TeamMembership


def _bump_version(version_key):
    """Atomically increment a version counter in cache.

    Uses add() + incr() instead of set() to be safe under concurrent
    invalidations: whichever caller wins the add() initialises the
    counter, every other concurrent caller increments it via incr().

    timeout=None is mandatory — the version key must never expire.
    If it did, cache.get() would fall back to the default (1), and
    stale v1-keyed dashboard data could be served silently.
    """
    if not cache.add(version_key, 2, timeout=None):
        try:
            cache.incr(version_key)
        except ValueError:
            # Key expired between add() and incr() — re-seed it
            cache.set(version_key, 2, timeout=None)


def _invalidate_employee(user_id):
    """Bump the version for all employee dashboard cache keys of this user."""
    if user_id:
        _bump_version(f"dashboard_version:emp:user_{user_id}")


def _invalidate_manager(user_id=None, team_id=None):
    """Bump version keys for manager dashboards.

    If team_id is given, bump that specific team and all managers leading it.
    If user_id is given, find all their teams and bump those versions too.
    """
    if team_id:
        _bump_version(f"dashboard_version:mgr:team_{team_id}")
        # Bump the aggregate cache for all managers of this team
        managers = TeamMembership.objects.filter(
            team_id=team_id, role=TeamMembership.Role.LEAD, is_deleted=False
        ).values_list("user_id", flat=True)
        for mgr_id in managers:
            _bump_version(f"dashboard_version:mgr:user_{mgr_id}")

    if user_id:
        # User might be an employee in several teams. Bump those teams' versions.
        teams = TeamMembership.objects.filter(
            user_id=user_id, is_deleted=False
        ).values_list("team_id", flat=True)
        for t_id in teams:
            _bump_version(f"dashboard_version:mgr:team_{t_id}")
            # Bump aggregate managers for these teams
            managers = TeamMembership.objects.filter(
                team_id=t_id, role=TeamMembership.Role.LEAD, is_deleted=False
            ).values_list("user_id", flat=True)
            for mgr_id in managers:
                _bump_version(f"dashboard_version:mgr:user_{mgr_id}")

        # Also bump the user's own aggregate view if they are a manager
        _bump_version(f"dashboard_version:mgr:user_{user_id}")


def _invalidate_executive(org_id):
    """Bump the version for executive dashboard cache keys of this org."""
    if org_id:
        _bump_version(f"dashboard_version:exec:org_{org_id}")


@receiver([post_save, post_delete], sender=Task)
def invalidate_on_task_change(sender, instance, **kwargs):
    _invalidate_employee(instance.assignee_id)
    _invalidate_manager(user_id=instance.assignee_id)
    
    if instance.project_id:
        # We need the org_id from the project
        project = Project.objects.filter(id=instance.project_id).first()
        if project:
            _invalidate_executive(project.organization_id)

@receiver([post_save, post_delete], sender=TimeLog)
def invalidate_on_timelog_change(sender, instance, **kwargs):
    _invalidate_employee(instance.user_id)
    _invalidate_manager(user_id=instance.user_id)
    
    if instance.project_id:
        project = Project.objects.filter(id=instance.project_id).first()
        if project:
            _invalidate_executive(project.organization_id)

@receiver([post_save, post_delete], sender=Attendance)
def invalidate_on_attendance_change(sender, instance, **kwargs):
    _invalidate_employee(instance.user_id)
    _invalidate_manager(user_id=instance.user_id)
    _invalidate_executive(instance.organization_id)

@receiver([post_save, post_delete], sender=Project)
def invalidate_on_project_change(sender, instance, **kwargs):
    # This covers Soft Delete of a Project as requested
    _invalidate_executive(instance.organization_id)
    
    # We should also invalidate employees and managers related to this project.
    # To be precise, any user allocated to this project:
    members = ProjectMember.objects.filter(project_id=instance.id).values_list("user_id", flat=True)
    for u_id in members:
        _invalidate_employee(u_id)
        _invalidate_manager(user_id=u_id)

@receiver([post_save, post_delete], sender=TeamMembership)
def invalidate_on_team_membership_change(sender, instance, **kwargs):
    # If a user joins/leaves a team or becomes a lead, invalidate
    _invalidate_employee(instance.user_id)
    _invalidate_manager(user_id=instance.user_id)
    _invalidate_manager(team_id=instance.team_id)

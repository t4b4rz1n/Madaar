from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache

from tasks.models import Task
from attendance.models import TimeLog, Attendance
from projects.models import Project, ProjectMember
from organizations.models import TeamMembership

def _invalidate_employee(user_id):
    """Invalidate all timezone variations of employee dashboard for user."""
    if user_id:
        if hasattr(cache, "delete_pattern"):
            cache.delete_pattern(f"*reports:emp:user_{user_id}:tz_*")
        else:
            # Fallback if delete_pattern not available (e.g. LocMemCache)
            cache.delete(f"reports:emp:user_{user_id}:tz_UTC")

def _invalidate_manager(user_id=None, team_id=None):
    """
    Invalidate manager dashboard.
    If team_id is given, invalidate that specific team and all managers leading it.
    If user_id is given, find all their teams and invalidate.
    """
    if hasattr(cache, "delete_pattern"):
        if team_id:
            cache.delete_pattern(f"*reports:mgr:team_{team_id}:tz_*")
            # Invalidate the aggregate cache for all managers of this team
            managers = TeamMembership.objects.filter(
                team_id=team_id, role=TeamMembership.Role.LEAD, is_deleted=False
            ).values_list("user_id", flat=True)
            for mgr_id in managers:
                cache.delete_pattern(f"*reports:mgr:user_{mgr_id}:tz_*")

        if user_id:
            # User might be an employee in several teams. Invalidate those teams' dashboards.
            teams = TeamMembership.objects.filter(
                user_id=user_id, is_deleted=False
            ).values_list("team_id", flat=True)
            for t_id in teams:
                cache.delete_pattern(f"*reports:mgr:team_{t_id}:tz_*")
                # Invalidate aggregate managers for these teams
                managers = TeamMembership.objects.filter(
                    team_id=t_id, role=TeamMembership.Role.LEAD, is_deleted=False
                ).values_list("user_id", flat=True)
                for mgr_id in managers:
                    cache.delete_pattern(f"*reports:mgr:user_{mgr_id}:tz_*")
                    
            # Also, if the user themselves is a manager, invalidate their aggregate view
            cache.delete_pattern(f"*reports:mgr:user_{user_id}:tz_*")
    else:
        # Fallback for LocMemCache – delete the default UTC keys used in tests
        if team_id:
            cache.delete(f"reports:mgr:team_{team_id}:tz_UTC")
        if user_id:
            cache.delete(f"reports:mgr:user_{user_id}:tz_UTC")

def _invalidate_executive(org_id):
    """Invalidate executive dashboard for an organization.
    Supports both pattern‑based backends (django‑redis) and LocMemCache fallback.
    """
    if not org_id:
        return
    if hasattr(cache, "delete_pattern"):
        cache.delete_pattern(f"*reports:exec:org_{org_id}:tz_*")
    else:
        # Fallback – delete the default UTC key used in tests
        cache.delete(f"reports:exec:org_{org_id}:tz_UTC")

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

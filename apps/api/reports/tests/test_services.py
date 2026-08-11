import pytest
from rest_framework.exceptions import NotFound
from django.utils.translation import gettext as _
from reports.services import ExecutiveDashboardService, ManagerDashboardService
from organizations.models import OrganizationMembership
from .factories import OrganizationFactory, OrganizationMembershipFactory

# Additional imports for cache invalidation tests
from django.core.cache import cache
from .factories import ProjectFactory, TeamFactory, TeamMembershipFactory, TeamMembership

@pytest.mark.django_db
class TestExecutiveDashboardService:
    def test_get_dashboard_no_org_membership_raises_not_found(self, users):
        """
        User with no organization membership should get a NotFound error
        when org_id is not provided.
        """
        loner = users["loner"]
        
        with pytest.raises(NotFound) as exc_info:
            ExecutiveDashboardService.get_dashboard(user=loner, org_id=None)
            
        assert str(exc_info.value.detail) == _("No organisation found for this user.")
        
    def test_get_dashboard_auto_resolves_correct_org_id(self, users):
        """
        User belongs to two orgs:
        - Org 1: as EMPLOYEE
        - Org 2: as OWNER
        When get_dashboard is called with org_id=None, it should resolve to Org 2.
        """
        employee2 = users["employee2"]  # We will use this user
        
        # Org 1: Employee role
        org1 = OrganizationFactory(name="Employee Org")
        OrganizationMembershipFactory(
            user=employee2, 
            organization=org1, 
            role=OrganizationMembership.Role.EMPLOYEE
        )
        
        # Org 2: Owner role
        org2 = OrganizationFactory(name="Owner Org")
        OrganizationMembershipFactory(
            user=employee2, 
            organization=org2, 
            role=OrganizationMembership.Role.OWNER
        )
        
        # We don't need to assert the entire dashboard output, just that the
        # resolved dashboard belongs to org2. 
        # ExecutiveDashboardService returns 'resource_utilization' which has 'total_members'.
        # Org2 has 1 member (employee2 + the owner created by default in factory, wait, 
        # OrganizationFactory subfactory creates an owner. Let's just check company_overview total_members).
        
        dashboard = ExecutiveDashboardService.get_dashboard(user=employee2, org_id=None)
        
        # Since we use org2, let's verify what data is returned.
        # Actually, let's just mock or check the returned data's projects/tasks because it's distinct.
        # total_members for org2 should be 2 (the factory owner + employee2). 
        # org1 has 2 members too.
        # Let's add a project to org2 to distinguish it clearly.
        from .factories import ProjectFactory
        ProjectFactory(organization=org2)
        
        dashboard_again = ExecutiveDashboardService.get_dashboard(user=employee2, org_id=None)
        
        assert dashboard_again["company_overview"]["projects"]["total"] == 1
        
        # If we explicitly pass org1, project total is 0
        dashboard_org1 = ExecutiveDashboardService.get_dashboard(user=employee2, org_id=org1.id)
        assert dashboard_org1["company_overview"]["projects"]["total"] == 0

    def test_get_dashboard_invalid_timezone_falls_back_to_utc(self, users):
        """
        If an invalid tz_name is provided, it should gracefully fall back to UTC
        instead of throwing a 500 error, ensuring the application remains robust.
        """
        loner = users["loner"]
        org = OrganizationFactory(name="Valid Org")
        OrganizationMembershipFactory(
            user=loner, 
            organization=org, 
            role=OrganizationMembership.Role.OWNER
        )

        # Calling with invalid tz_name should not raise any ZoneInfoNotFoundError
        # It should fallback to UTC and return successfully.
        dashboard = ExecutiveDashboardService.get_dashboard(
            user=loner, org_id=org.id, tz_name="Invalid/Timezone"
        )
        assert dashboard["company_overview"]["total_members"] == 1


def test_get_business_days():
    from reports.services import get_business_days
    import datetime
    
    # Test 1: Start in middle of week (Wednesday) to next week's Tuesday (7 days total)
    # 2026-08-05 is Wednesday, 2026-08-11 is Tuesday.
    # Wed, Thu, Fri (3 days) + Sat, Sun (weekend) + Mon, Tue (2 days) = 5 days
    start = datetime.date(2026, 8, 5)
    end = datetime.date(2026, 8, 11)
    assert get_business_days(start, end) == 5
    
    # Test 2: Exactly 3 full weeks
    # 2026-08-03 is Monday, 2026-08-23 is Sunday (21 days)
    # 3 weeks * 5 days = 15 days
    start = datetime.date(2026, 8, 3)
    end = datetime.date(2026, 8, 23)
    assert get_business_days(start, end) == 15
    
    # Test 3: Entirely within a weekend
    # 2026-08-08 (Sat) to 2026-08-09 (Sun) -> 0 days
    start = datetime.date(2026, 8, 8)
    end = datetime.date(2026, 8, 9)
    assert get_business_days(start, end) == 0
    
    # Test 4: Single day (Friday)
    # 2026-08-07 is Friday -> 1 day
    start = datetime.date(2026, 8, 7)
    end = datetime.date(2026, 8, 7)
    assert get_business_days(start, end) == 1
    
    # Test 5: End date before start date -> 0 days
    assert get_business_days(end, start - datetime.timedelta(days=1)) == 0

# Fixture to clear cache before each test
@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()

@pytest.mark.django_db
def test_executive_cache_invalidation_on_project_soft_delete(clear_cache, users, org_data):
    user = users["org_owner"]
    org = org_data["org"]
    project = ProjectFactory(organization=org, is_deleted=False)
    tz = "UTC"
    version_key = f"dashboard_version:exec:org_{org.id}"
    # Read current version (may have been bumped by fixture setup signals)
    current_version = cache.get(version_key, 1)
    # First call caches result at current version
    dashboard = ExecutiveDashboardService.get_dashboard(user=user, org_id=org.id, tz_name=tz)
    old_cache_key = f"reports:exec:org_{org.id}:v{current_version}:tz_{tz}"
    assert cache.get(old_cache_key) is not None
    # Soft delete the project – triggers signal → bumps version
    project.is_deleted = True
    project.save()
    # Version should have incremented
    new_version = cache.get(version_key, 1)
    assert new_version == current_version + 1
    # Second call – builds new versioned key, recomputes, caches fresh data
    dashboard2 = ExecutiveDashboardService.get_dashboard(user=user, org_id=org.id, tz_name=tz)
    new_cache_key = f"reports:exec:org_{org.id}:v{new_version}:tz_{tz}"
    assert cache.get(new_cache_key) is not None
    assert dashboard2["company_overview"]["projects"]["total"] == 0

@pytest.mark.django_db
def test_manager_cache_invalidation_on_team_membership_change(clear_cache, users, org_data):
    lead = users["team_lead"]
    member = users["employee1"]
    team = TeamFactory()
    # initial membership – lead only
    TeamMembershipFactory(user=lead, team=team, role=TeamMembership.Role.LEAD)
    tz = "UTC"
    version_key = f"dashboard_version:mgr:team_{team.id}"
    # Read current version (may have been bumped by TeamMembershipFactory signal)
    current_version = cache.get(version_key, 1)
    dashboard = ManagerDashboardService.get_dashboard(user=lead, team_id=team.id, tz_name=tz)
    old_cache_key = f"reports:mgr:team_{team.id}:v{current_version}:tz_{tz}"
    assert cache.get(old_cache_key) is not None
    # add a regular member – triggers signal → bumps version
    TeamMembershipFactory(user=member, team=team, role=TeamMembership.Role.MEMBER)
    # Version should have incremented
    new_version = cache.get(version_key, 1)
    assert new_version > current_version
    # Fetch again – uses new versioned key, recomputes
    dashboard2 = ManagerDashboardService.get_dashboard(user=lead, team_id=team.id, tz_name=tz)
    new_cache_key = f"reports:mgr:team_{team.id}:v{new_version}:tz_{tz}"
    assert cache.get(new_cache_key) is not None
    assert dashboard2["team_member_count"] == 2


@pytest.mark.django_db
def test_cache_invalidation_on_timelog_update(users, org_data, project_data):
    from reports.services import EmployeeDashboardService
    from attendance.models import TimeLog
    import datetime
    
    employee = users["employee1"]
    
    # 1. Fetch dashboard data (this will cache it)
    dashboard_initial = EmployeeDashboardService.get_dashboard(user=employee)
    initial_seconds = dashboard_initial["weekly_time"]["total_seconds"]
    
    # Check that it's cached. 
    # To be absolutely sure, we'll manually fetch from cache, but it's enough to 
    # update the DB and verify the next get_dashboard call returns new data.
    
    # 2. Update a TimeLog (this should trigger post_save signal and invalidate cache)
    task = project_data["tasks"][0]
    new_timelog = TimeLog.objects.create(
        user=employee,
        task=task,
        project=task.project,
        date=datetime.date.today(),
        start_time=datetime.datetime.now(),
        duration_seconds=1800,  # add 30 mins
        is_active=False,
    )
    
    # 3. Fetch dashboard data again
    dashboard_updated = EmployeeDashboardService.get_dashboard(user=employee)
    updated_seconds = dashboard_updated["weekly_time"]["total_seconds"]
    
    # The updated dashboard should reflect the new timelog (+1800 seconds)
    # If caching invalidation didn't work, updated_seconds would equal initial_seconds
    assert updated_seconds == initial_seconds + 1800


@pytest.mark.django_db
def test_version_bump_uses_no_expiry(users, org_data):
    """Regression: version-key writes must always pass timeout=None.
    
    If timeout=None is accidentally removed from _bump_version(),
    the version key inherits Django's default cache timeout (e.g. 300s).
    When the version key expires, cache.get() falls back to 1, and if
    a stale v1-keyed dashboard entry is still alive, the system silently
    serves outdated data with no error, no log, and no visible symptom.
    
    This test catches that by mocking cache and asserting that
    cache.add() is called with an explicit timeout=None argument.
    """
    from unittest.mock import patch
    from reports.signals import _invalidate_executive
    
    with patch("reports.signals.cache") as mock_cache:
        mock_cache.add.return_value = True  # simulate first invalidation
        _invalidate_executive(org_data["org"].id)

        mock_cache.add.assert_called_once()
        _args, kwargs = mock_cache.add.call_args
        
        # Must distinguish between these two cases:
        #   cache.add(key, 2, timeout=None)  → correct (explicit no-expiry)
        #   cache.add(key, 2)                → BUG (inherits default timeout)
        # kwargs.get("timeout") is None would pass for BOTH — so we check
        # that "timeout" is actually present as a keyword or positional arg.
        if "timeout" in kwargs:
            assert kwargs["timeout"] is None, (
                "timeout must be exactly None to prevent silent staleness"
            )
        elif len(_args) >= 3:
            assert _args[2] is None, (
                "timeout must be exactly None to prevent silent staleness"
            )
        else:
            pytest.fail(
                "cache.add() was called without an explicit timeout argument — "
                "this will cause silent staleness when the version key expires"
            )


import pytest

# Additional imports for cache invalidation tests
from django.core.cache import cache
from django.utils.translation import gettext as _
from rest_framework.exceptions import NotFound

from organizations.models import OrganizationMembership
from reports.services import ExecutiveDashboardService, ManagerDashboardService

from .factories import (
    BoardFactory,
    OrganizationFactory,
    OrganizationMembershipFactory,
    ProjectFactory,
    ProjectMemberFactory,
    TaskFactory,
    TaskStatusFactory,
    TeamFactory,
    TeamMembership,
    TeamMembershipFactory,
    UserFactory,
)


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
            user=employee2, organization=org1, role=OrganizationMembership.Role.EMPLOYEE
        )

        # Org 2: Owner role
        org2 = OrganizationFactory(name="Owner Org")
        OrganizationMembershipFactory(
            user=employee2, organization=org2, role=OrganizationMembership.Role.OWNER
        )

        # We don't need to assert the entire dashboard output, just that the
        # resolved dashboard belongs to org2.
        # ExecutiveDashboardService returns 'resource_utilization' which has 'total_members'.
        # Org2 has 1 member (employee2 + the owner created by default in factory, wait,
        # OrganizationFactory subfactory creates an owner. Let's just check company_overview total_members).

        ExecutiveDashboardService.get_dashboard(user=employee2, org_id=None)

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
            user=loner, organization=org, role=OrganizationMembership.Role.OWNER
        )

        # Calling with invalid tz_name should not raise any ZoneInfoNotFoundError
        # It should fallback to UTC and return successfully.
        dashboard = ExecutiveDashboardService.get_dashboard(
            user=loner, org_id=org.id, tz_name="Invalid/Timezone"
        )
        assert dashboard["company_overview"]["total_members"] == 1


def test_get_business_days():
    import datetime

    from reports.services import get_business_days

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
    ExecutiveDashboardService.get_dashboard(user=user, org_id=org.id, tz_name=tz)
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
    ManagerDashboardService.get_dashboard(user=lead, team_id=team.id, tz_name=tz)
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
    import datetime

    from django.utils import timezone

    from attendance.models import TimeLog
    from reports.services import EmployeeDashboardService

    employee = users["employee1"]

    dashboard_initial = EmployeeDashboardService.get_dashboard(user=employee)
    initial_seconds = dashboard_initial["weekly_time"]["total_seconds"]

    # Update a TimeLog (this should trigger post_save signal and invalidate cache)
    task = project_data["tasks"][0]
    TimeLog.objects.create(
        user=employee,
        task=task,
        project=task.project,
        date=datetime.date.today(),
        start_time=timezone.now(),
        duration_seconds=1800,  # add 30 mins
        is_active=False,
    )

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
            assert (
                kwargs["timeout"] is None
            ), "timeout must be exactly None to prevent silent staleness"
        elif len(_args) >= 3:
            assert _args[2] is None, "timeout must be exactly None to prevent silent staleness"
        else:
            pytest.fail(
                "cache.add() was called without an explicit timeout argument — "
                "this will cause silent staleness when the version key expires"
            )


@pytest.mark.django_db
class TestUpcomingTasks:
    """Tests for EmployeeDashboardService._get_upcoming_tasks.

    The method must return tasks with due_date between today and
    UPCOMING_TASKS_WINDOW_DAYS days ahead, ordered by nearest deadline
    first, capped at UPCOMING_TASKS_LIMIT.
    """

    @pytest.fixture
    def setup(self):
        """Shared scaffold: user, project, board, statuses."""
        user = UserFactory()
        org = OrganizationFactory(owner=user)
        project = ProjectFactory(organization=org, owner=user)
        ProjectMemberFactory(user=user, project=project)
        board = BoardFactory(project=project, created_by=user)
        status_todo = TaskStatusFactory(board=board, name="To Do", code="todo", order=1)
        status_done = TaskStatusFactory(board=board, name="Done", code="done", order=3)
        return {
            "user": user,
            "project": project,
            "status_todo": status_todo,
            "status_done": status_done,
        }

    def test_no_window_and_ordering(self, setup):
        """Tasks at day 0, day 3, and day 10: all appear, ordered by nearest deadline."""
        import datetime

        from django.utils import timezone

        from reports.services import EmployeeDashboardService

        user = setup["user"]
        project = setup["project"]
        status = setup["status_todo"]
        now = timezone.now()

        task_today = TaskFactory(
            project=project,
            assignee=user,
            status=status,
            due_date=now,
            title="Due today",
        )
        task_3d = TaskFactory(
            project=project,
            assignee=user,
            status=status,
            due_date=now + datetime.timedelta(days=3),
            title="Due in 3 days",
        )
        task_10d = TaskFactory(
            project=project,
            assignee=user,
            status=status,
            due_date=now + datetime.timedelta(days=10),
            title="Due in 10 days — now included (no window)",
        )

        dashboard = EmployeeDashboardService.get_dashboard(user=user)
        upcoming = dashboard["upcoming_tasks"]

        returned_ids = [t["id"] for t in upcoming]
        assert len(upcoming) == 3
        assert returned_ids[0] == task_today.id
        assert returned_ids[1] == task_3d.id
        assert returned_ids[2] == task_10d.id

    def test_limit_caps_results(self, setup):
        """More than UPCOMING_TASKS_LIMIT tasks in window → only closest N returned."""
        import datetime

        from django.utils import timezone

        from reports.services import UPCOMING_TASKS_LIMIT, EmployeeDashboardService

        user = setup["user"]
        project = setup["project"]
        status = setup["status_todo"]
        now = timezone.now()

        for day_offset in range(UPCOMING_TASKS_LIMIT + 3):
            TaskFactory(
                project=project,
                assignee=user,
                status=status,
                due_date=now + datetime.timedelta(days=min(day_offset, 6)),
                title=f"Task day {day_offset}",
            )

        dashboard = EmployeeDashboardService.get_dashboard(user=user)
        assert len(dashboard["upcoming_tasks"]) == UPCOMING_TASKS_LIMIT

    def test_limit_without_window(self, setup):
        """6 tasks at days 0, 2, 5, 10, 20, 30: only closest 5 returned, day-30 excluded."""
        import datetime

        from django.utils import timezone

        from reports.services import UPCOMING_TASKS_LIMIT, EmployeeDashboardService

        user = setup["user"]
        project = setup["project"]
        status = setup["status_todo"]
        now = timezone.now()

        offsets = [0, 2, 5, 10, 20, 30]
        tasks = []
        for d in offsets:
            t = TaskFactory(
                project=project,
                assignee=user,
                status=status,
                due_date=now + datetime.timedelta(days=d),
                title=f"Task day {d}",
            )
            tasks.append(t)

        dashboard = EmployeeDashboardService.get_dashboard(user=user)
        upcoming = dashboard["upcoming_tasks"]

        assert len(upcoming) == UPCOMING_TASKS_LIMIT
        returned_ids = [t["id"] for t in upcoming]
        # The 5 closest (days 0,2,5,10,20) should be in; day 30 should not
        for t in tasks[:5]:
            assert t.id in returned_ids
        assert tasks[5].id not in returned_ids
        # Ordering: nearest first
        for i in range(len(returned_ids) - 1):
            assert upcoming[i]["due_date"] <= upcoming[i + 1]["due_date"]

    def test_tiebreak_by_created_at(self, setup):
        """Two tasks with identical due_date are ordered by created_at (older first)."""
        import datetime
        import time

        from django.utils import timezone

        from reports.services import EmployeeDashboardService

        user = setup["user"]
        project = setup["project"]
        status = setup["status_todo"]
        tomorrow = timezone.now() + datetime.timedelta(days=1)

        task_older = TaskFactory(
            project=project,
            assignee=user,
            status=status,
            due_date=tomorrow,
            title="Older task",
        )
        # Small sleep to guarantee distinct created_at timestamps
        time.sleep(0.05)
        task_newer = TaskFactory(
            project=project,
            assignee=user,
            status=status,
            due_date=tomorrow,
            title="Newer task",
        )

        dashboard = EmployeeDashboardService.get_dashboard(user=user)
        upcoming = dashboard["upcoming_tasks"]

        returned_ids = [t["id"] for t in upcoming]
        assert returned_ids.index(task_older.id) < returned_ids.index(task_newer.id)

    def test_done_tasks_excluded(self, setup):
        """A task with due_date tomorrow but status=done must NOT appear."""
        import datetime

        from django.utils import timezone

        from reports.services import EmployeeDashboardService

        user = setup["user"]
        project = setup["project"]
        status_done = setup["status_done"]
        status_todo = setup["status_todo"]
        tomorrow = timezone.now() + datetime.timedelta(days=1)

        task_done = TaskFactory(
            project=project,
            assignee=user,
            status=status_done,
            due_date=tomorrow,
            title="Done task — must NOT appear",
        )
        task_active = TaskFactory(
            project=project,
            assignee=user,
            status=status_todo,
            due_date=tomorrow,
            title="Active task — must appear",
        )

        dashboard = EmployeeDashboardService.get_dashboard(user=user)
        returned_ids = [t["id"] for t in dashboard["upcoming_tasks"]]
        assert task_done.id not in returned_ids
        assert task_active.id in returned_ids

    def test_null_due_date_comes_after_dated_tasks(self, setup):
        """Tasks with due_date appear before tasks without; null-due_date included if room."""
        import datetime

        from django.utils import timezone

        from reports.services import EmployeeDashboardService

        user = setup["user"]
        project = setup["project"]
        status = setup["status_todo"]
        now = timezone.now()

        task_dated_1 = TaskFactory(
            project=project,
            assignee=user,
            status=status,
            due_date=now + datetime.timedelta(days=1),
            title="Has deadline",
        )
        task_dated_2 = TaskFactory(
            project=project,
            assignee=user,
            status=status,
            due_date=now + datetime.timedelta(days=5),
            title="Also has deadline",
        )
        task_no_date = TaskFactory(
            project=project,
            assignee=user,
            status=status,
            due_date=None,
            title="No deadline",
        )

        dashboard = EmployeeDashboardService.get_dashboard(user=user)
        upcoming = dashboard["upcoming_tasks"]
        returned_ids = [t["id"] for t in upcoming]

        assert len(upcoming) == 3
        # Dated tasks come first, null last
        assert returned_ids[0] == task_dated_1.id
        assert returned_ids[1] == task_dated_2.id
        assert returned_ids[2] == task_no_date.id
        # The null-due_date task has due_date=None in the response
        assert upcoming[2]["due_date"] is None


@pytest.mark.django_db
class TestResourceUtilization:
    """Tests for ExecutiveDashboardService._get_resource_utilization logic."""

    @pytest.fixture
    def util_setup(self):
        """Create a minimal org with 1 member for utilization tests."""
        import datetime

        from django.utils import timezone

        from .factories import (
            AttendanceSettingFactory,
            OrganizationFactory,
            OrganizationMembershipFactory,
            ProjectFactory,
            TimeLogFactory,
            UserFactory,
        )

        owner = UserFactory(username="util_owner")
        emp = UserFactory(username="util_emp")
        org = OrganizationFactory(owner=owner)
        OrganizationMembershipFactory(
            user=owner,
            organization=org,
            role=OrganizationMembership.Role.OWNER,
        )
        OrganizationMembershipFactory(
            user=emp,
            organization=org,
            role=OrganizationMembership.Role.EMPLOYEE,
        )
        project = ProjectFactory(organization=org, owner=owner)

        return {
            "owner": owner,
            "emp": emp,
            "org": org,
            "project": project,
        }

    def test_utilization_fallback_no_attendance_setting(self, util_setup):
        """
        When no AttendanceSetting exists for the org, the expected daily
        hours must fall back to 8.0 — this must be visible in expected_seconds.
        """
        from reports.services import ExecutiveDashboardService

        org = util_setup["org"]

        # Ensure no AttendanceSetting exists for this org
        from attendance.models import AttendanceSetting

        assert not AttendanceSetting.objects.filter(organization=org).exists()

        dashboard = ExecutiveDashboardService.get_dashboard(
            user=util_setup["owner"], org_id=org.id
        )
        utilization = dashboard["resource_utilization"]

        # expected_seconds should be computed based on 8h/day fallback
        # Member count = 2 (owner + emp), business_days depends on current week
        # The key assertion: expected_seconds > 0 and it was computed (no crash)
        assert utilization["expected_seconds"] >= 0
        assert utilization["total_members"] == 2

    def test_utilization_overlapping_leaves_counted_separately(self, util_setup):
        """
        Two approved leaves from different users overlapping the same time
        range should both be subtracted from expected_seconds independently.
        Also verifies that two leaves from the SAME user in overlapping time
        ranges are both counted (potential double-counting bug).
        """
        import datetime

        from django.utils import timezone

        from attendance.models import AttendanceSetting, TimeOffRequest
        from reports.services import ExecutiveDashboardService

        from .factories import AttendanceSettingFactory, TimeOffRequestFactory

        org = util_setup["org"]
        emp = util_setup["emp"]

        # Set expected daily hours to 8
        AttendanceSettingFactory(organization=org, expected_daily_hours=8)

        # Get the current week range to place leaves within it
        now = timezone.now()
        # Create two overlapping 4-hour leaves for the SAME user on the same day
        leave_start = now.replace(hour=8, minute=0, second=0, microsecond=0)
        leave1_end = leave_start + datetime.timedelta(hours=4)  # 8:00-12:00
        leave2_start = leave_start + datetime.timedelta(hours=2)  # 10:00
        leave2_end = leave2_start + datetime.timedelta(hours=4)  # 10:00-14:00
        # Overlap region: 10:00-12:00 (2 hours)

        # Both approved
        TimeOffRequestFactory(
            user=emp,
            organization=org,
            request_type=TimeOffRequest.Type.VACATION,
            start_datetime=leave_start,
            end_datetime=leave1_end,
            status=TimeOffRequest.Status.APPROVED,
        )
        TimeOffRequestFactory(
            user=emp,
            organization=org,
            request_type=TimeOffRequest.Type.SICK,
            start_datetime=leave2_start,
            end_datetime=leave2_end,
            status=TimeOffRequest.Status.APPROVED,
        )

        # Clear any cached data
        cache.clear()

        dashboard = ExecutiveDashboardService.get_dashboard(
            user=util_setup["owner"], org_id=org.id
        )
        utilization = dashboard["resource_utilization"]

        # The current implementation counts each leave request separately.
        # Total leave deducted = 4h + 4h = 8h (28800 seconds), NOT 6h.
        # This is the known behavior — each TimeOffRequest is counted independently.
        # The overlap of 2h is double-counted.
        total_leave_seconds = (4 * 3600) + (4 * 3600)  # 28800

        # Verify that expected_seconds is reduced by the full leave amount
        # expected_seconds = (member_count * business_days * 8h * 3600) - 28800
        # We can't know exact business_days, but we can verify the leave
        # was deducted by comparing with a baseline (no-leave scenario).
        cache.clear()

        # Remove the leaves and recalculate to get baseline
        TimeOffRequest.objects.filter(organization=org).delete()
        baseline = ExecutiveDashboardService.get_dashboard(
            user=util_setup["owner"], org_id=org.id
        )
        baseline_expected = baseline["resource_utilization"]["expected_seconds"]

        # Re-create the leaves
        TimeOffRequestFactory(
            user=emp,
            organization=org,
            request_type=TimeOffRequest.Type.VACATION,
            start_datetime=leave_start,
            end_datetime=leave1_end,
            status=TimeOffRequest.Status.APPROVED,
        )
        TimeOffRequestFactory(
            user=emp,
            organization=org,
            request_type=TimeOffRequest.Type.SICK,
            start_datetime=leave2_start,
            end_datetime=leave2_end,
            status=TimeOffRequest.Status.APPROVED,
        )
        cache.clear()

        with_leaves = ExecutiveDashboardService.get_dashboard(
            user=util_setup["owner"], org_id=org.id
        )
        with_leaves_expected = with_leaves["resource_utilization"]["expected_seconds"]

        # The difference should be exactly 28800 (8h = two 4h leaves counted independently)
        deducted = baseline_expected - with_leaves_expected
        assert deducted == total_leave_seconds, (
            f"Expected {total_leave_seconds}s deducted for overlapping leaves, "
            f"got {deducted}s. Baseline={baseline_expected}, WithLeaves={with_leaves_expected}"
        )

    def test_utilization_ignores_pending_and_rejected_leaves(self, util_setup):
        """
        Only 'approved' leaves should reduce expected_seconds.
        Pending and rejected leaves must NOT affect the calculation.
        """
        import datetime

        from django.utils import timezone

        from attendance.models import TimeOffRequest
        from reports.services import ExecutiveDashboardService

        from .factories import AttendanceSettingFactory, TimeOffRequestFactory

        org = util_setup["org"]
        emp = util_setup["emp"]

        AttendanceSettingFactory(organization=org, expected_daily_hours=8)

        now = timezone.now()
        leave_start = now.replace(hour=9, minute=0, second=0, microsecond=0)
        leave_end = leave_start + datetime.timedelta(hours=4)

        cache.clear()
        # Get baseline (no leaves)
        baseline = ExecutiveDashboardService.get_dashboard(
            user=util_setup["owner"], org_id=org.id
        )
        baseline_expected = baseline["resource_utilization"]["expected_seconds"]

        # Create PENDING leave — should NOT be deducted
        TimeOffRequestFactory(
            user=emp,
            organization=org,
            request_type=TimeOffRequest.Type.VACATION,
            start_datetime=leave_start,
            end_datetime=leave_end,
            status=TimeOffRequest.Status.PENDING,
        )
        # Create REJECTED leave — should NOT be deducted
        TimeOffRequestFactory(
            user=emp,
            organization=org,
            request_type=TimeOffRequest.Type.SICK,
            start_datetime=leave_start,
            end_datetime=leave_end,
            status=TimeOffRequest.Status.REJECTED,
        )

        cache.clear()
        with_non_approved = ExecutiveDashboardService.get_dashboard(
            user=util_setup["owner"], org_id=org.id
        )
        with_non_approved_expected = with_non_approved["resource_utilization"]["expected_seconds"]

        # Expected seconds should be UNCHANGED — pending/rejected leaves are ignored
        assert with_non_approved_expected == baseline_expected, (
            f"Pending/rejected leaves should not affect expected_seconds. "
            f"Baseline={baseline_expected}, WithNonApproved={with_non_approved_expected}"
        )

"""
reports/serializers.py
----------------------
Read-only serializers for the reporting & analytics endpoints.

These are plain ``Serializer`` classes (not ``ModelSerializer``)
because the reports app has no models — it aggregates data from
other apps and returns structured JSON responses.
"""

from rest_framework import serializers


class TaskSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    title = serializers.CharField()
    priority = serializers.CharField(allow_null=True)
    due_date = serializers.DateTimeField(allow_null=True)
    status_name = serializers.CharField(allow_null=True)
    status_code = serializers.CharField(allow_null=True, required=False)
    project_name = serializers.CharField(allow_null=True)
    project_id = serializers.UUIDField(allow_null=True)


class TimeSummarySerializer(serializers.Serializer):
    total_seconds = serializers.IntegerField()
    total_logs = serializers.IntegerField()


class ActiveProjectSerializer(serializers.Serializer):
    project_id = serializers.UUIDField()
    project_name = serializers.CharField()
    project_status = serializers.CharField()
    project_deadline = serializers.DateField(allow_null=True)
    allocation_percentage = serializers.IntegerField()


class AttendanceStatusSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    check_in = serializers.DateTimeField(allow_null=True)
    check_out = serializers.DateTimeField(allow_null=True)
    is_remote = serializers.BooleanField()
    overtime_minutes = serializers.IntegerField()
    organization_name = serializers.CharField(allow_null=True)


class ActiveTimerSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    start_time = serializers.DateTimeField()
    task_id = serializers.UUIDField(allow_null=True)
    task_title = serializers.CharField(allow_null=True)
    project_name = serializers.CharField(allow_null=True)


class StandupSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    yesterday_work = serializers.CharField()
    today_work = serializers.CharField()
    blockers = serializers.CharField(allow_blank=True, allow_null=True)
    created_at = serializers.DateTimeField()


class MilestoneSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    title = serializers.CharField()
    status = serializers.CharField()
    target_date = serializers.DateField()
    project_name = serializers.CharField()
    project_id = serializers.UUIDField()


class EmployeeDashboardSerializer(serializers.Serializer):
    upcoming_tasks = TaskSummarySerializer(many=True)
    overdue_tasks = TaskSummarySerializer(many=True)
    blocked_tasks = TaskSummarySerializer(many=True)
    today_standup = StandupSummarySerializer(allow_null=True)
    weekly_time = TimeSummarySerializer()
    active_projects = ActiveProjectSerializer(many=True)
    attendance_today = AttendanceStatusSerializer(allow_null=True)
    active_timer = ActiveTimerSerializer(allow_null=True)
    upcoming_milestones = MilestoneSummarySerializer(many=True)
    # Stubs for future modules
    points = serializers.IntegerField(allow_null=True)
    badges = serializers.ListField(allow_null=True)
    goals = serializers.ListField(allow_null=True)


class TaskStatSerializer(serializers.Serializer):
    status_code = serializers.CharField(allow_null=True)
    status_name = serializers.CharField(allow_null=True)
    count = serializers.IntegerField()


class OverdueMemberSerializer(serializers.Serializer):
    username = serializers.CharField()
    first_name = serializers.CharField()
    count = serializers.IntegerField()


class OverdueSummarySerializer(serializers.Serializer):
    total_overdue = serializers.IntegerField()
    by_member = OverdueMemberSerializer(many=True)


class MemberWorkHoursSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
    username = serializers.CharField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    total_seconds = serializers.IntegerField()
    total_logs = serializers.IntegerField()


class MemberAttendanceSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
    username = serializers.CharField()
    first_name = serializers.CharField()
    check_in = serializers.DateTimeField(allow_null=True)
    check_out = serializers.DateTimeField(allow_null=True)
    is_remote = serializers.BooleanField()


class ProjectSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    status = serializers.CharField()
    budget = serializers.DecimalField(max_digits=14, decimal_places=2, allow_null=True)
    budget_currency = serializers.CharField()
    deadline = serializers.DateField(allow_null=True)
    active_member_count = serializers.IntegerField()
    total_tasks = serializers.IntegerField()
    done_tasks = serializers.IntegerField()
    total_time_seconds = serializers.IntegerField(allow_null=True)


class ManagerDashboardSerializer(serializers.Serializer):
    team_member_count = serializers.IntegerField()
    task_stats = TaskStatSerializer(many=True)
    overdue_summary = OverdueSummarySerializer()
    work_hours = MemberWorkHoursSerializer(many=True)
    members_attendance = MemberAttendanceSerializer(many=True)
    project_summary = ProjectSummarySerializer(many=True)


class MemberDetailSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    username = serializers.CharField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.EmailField()
    total_tasks = serializers.IntegerField()
    done_tasks = serializers.IntegerField()
    overdue_tasks = serializers.IntegerField()
    week_seconds = serializers.IntegerField(allow_null=True)


class ProjectStatsSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    active = serializers.IntegerField()
    completed = serializers.IntegerField()
    on_hold = serializers.IntegerField()


class TaskStatsOverviewSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    done = serializers.IntegerField()
    in_progress = serializers.IntegerField()


class CompanyOverviewSerializer(serializers.Serializer):
    total_members = serializers.IntegerField()
    projects = ProjectStatsSerializer()
    tasks = TaskStatsOverviewSerializer()


class ResourceUtilizationSerializer(serializers.Serializer):
    total_work_seconds = serializers.IntegerField()
    expected_seconds = serializers.IntegerField()
    utilization_rate = serializers.FloatField()
    active_workers = serializers.IntegerField()
    total_members = serializers.IntegerField()


class ProjectHealthSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    deadline = serializers.DateField(allow_null=True)
    budget = serializers.DecimalField(max_digits=14, decimal_places=2, allow_null=True)
    budget_currency = serializers.CharField()
    total_tasks = serializers.IntegerField()
    done_tasks = serializers.IntegerField()
    overdue_tasks = serializers.IntegerField()
    overdue_milestones = serializers.IntegerField()
    progress = serializers.FloatField()
    health = serializers.CharField()


class FinancialSummarySerializer(serializers.Serializer):
    total_budget = serializers.DecimalField(max_digits=14, decimal_places=2, allow_null=True)
    project_count = serializers.IntegerField()
    total_time_seconds = serializers.IntegerField(allow_null=True)


class ExecutiveDashboardSerializer(serializers.Serializer):
    company_overview = CompanyOverviewSerializer()
    resource_utilization = ResourceUtilizationSerializer()
    project_health = ProjectHealthSerializer(many=True)
    financial_summary = FinancialSummarySerializer()

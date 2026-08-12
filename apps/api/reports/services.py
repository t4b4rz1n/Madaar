"""
reports/services.py
-------------------
Business-logic layer for the reporting & analytics application.

Design principles
~~~~~~~~~~~~~~~~~
* **Read-only** — no mutations, only aggregation queries.
* **DB-level aggregation** — all calculations use Django ORM
  ``Count``, ``Sum``, ``Avg``, ``annotate``, ``aggregate``.
  No Python-level loops for summing data.
* **Private method composition** — each data section lives in a
  ``_private`` method; ``get_dashboard`` composes them into a dict.
* **Timezone-aware** — "today" is calculated from the client's
  timezone, then converted to UTC boundaries for DB queries.
* **Manager → team_id scope** / **Executive → org_id scope**.
"""

from __future__ import annotations

import datetime
import logging
import zoneinfo

from django.core.cache import cache
from django.db.models import (
    Count,
    F,
    OuterRef,
    Q,
    Subquery,
    Sum,
)
from django.utils import timezone

from attendance.models import Attendance, AttendanceSetting, TimeLog, TimeOffRequest
from organizations.models import TeamMembership
from projects.models import Milestone, Project, ProjectMember
from tasks.models import Task

logger = logging.getLogger(__name__)

UPCOMING_TASKS_LIMIT = 5


def get_user_today_range(
    tz_name: str = "UTC",
) -> tuple[datetime.datetime, datetime.datetime]:
    """Return the UTC-aware start and end of *today* in the user's timezone.

    Example: for ``Asia/Tehran`` (UTC+3:30) at 2026-08-07 01:00 UTC,
    "today" in Tehran is already 2026-08-07, so the range is
    2026-08-06T20:30:00Z → 2026-08-07T20:30:00Z.
    """
    try:
        user_tz = zoneinfo.ZoneInfo(tz_name)
    except (zoneinfo.ZoneInfoNotFoundError, TypeError):
        user_tz = zoneinfo.ZoneInfo("UTC")

    now_in_user_tz = timezone.now().astimezone(user_tz)
    today_start_local = now_in_user_tz.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end_local = today_start_local + datetime.timedelta(days=1)

    # Convert back to UTC for DB queries
    today_start_utc = today_start_local.astimezone(zoneinfo.ZoneInfo("UTC"))
    today_end_utc = today_end_local.astimezone(zoneinfo.ZoneInfo("UTC"))
    return today_start_utc, today_end_utc


def get_user_week_range(
    tz_name: str = "UTC",
) -> tuple[datetime.datetime, datetime.datetime]:
    """Return the UTC-aware start (Saturday) and end of current week."""
    try:
        user_tz = zoneinfo.ZoneInfo(tz_name)
    except (zoneinfo.ZoneInfoNotFoundError, TypeError):
        user_tz = zoneinfo.ZoneInfo("UTC")

    now_in_user_tz = timezone.now().astimezone(user_tz)
    today_local = now_in_user_tz.replace(hour=0, minute=0, second=0, microsecond=0)

    # Week starts on Saturday (weekday 5 in Python's Monday=0 system)
    days_since_saturday = (today_local.weekday() - 5) % 7
    week_start_local = today_local - datetime.timedelta(days=days_since_saturday)
    week_end_local = week_start_local + datetime.timedelta(days=7)

    week_start_utc = week_start_local.astimezone(zoneinfo.ZoneInfo("UTC"))
    week_end_utc = week_end_local.astimezone(zoneinfo.ZoneInfo("UTC"))
    return week_start_utc, week_end_utc


def _merge_intervals(
    intervals: list[tuple[datetime.datetime, datetime.datetime]],
) -> list[tuple[datetime.datetime, datetime.datetime]]:
    """Return a de-duplicated, sorted list of non-overlapping intervals.

    This is the classic O(n log n) merge-intervals algorithm:
    1. Sort by start time.
    2. Walk forward, extending the current interval whenever the next one
       overlaps (i.e. next.start <= current.end).

    Used in :func:`_get_resource_utilization` to prevent double-counting
    leave time when two approved TimeOffRequests overlap in the same week.
    """
    if not intervals:
        return []
    sorted_intervals = sorted(intervals, key=lambda x: x[0])
    merged = [sorted_intervals[0]]
    for start, end in sorted_intervals[1:]:
        cur_start, cur_end = merged[-1]
        if start <= cur_end:  # overlap or adjacent — extend
            merged[-1] = (cur_start, max(cur_end, end))
        else:
            merged.append((start, end))
    return merged


def get_business_days(start_date: datetime.date, end_date: datetime.date) -> int:
    """Calculate the number of business days (Sat-Wed) between two dates inclusive.

    Assumes the Iranian work-week: Saturday through Wednesday (5 days).
    Thursday and Friday are weekend days (Python weekday 3=Thursday, 4=Friday —
    **but Saturday=5, Sunday=6 in Python's Monday=0 system**).

    Iranian weekdays:  Sat=5, Sun=6, Mon=0, Tue=1, Wed=2  → business days
    Iranian weekend:   Thu=3, Fri=4                        → skip

    NOTE: this is intentionally hard-coded to the Iranian calendar.
    If multi-locale support is needed in future, move working_days into
    AttendanceSetting and read from there.
    """
    if start_date > end_date:
        return 0

    # Iranian business days: Saturday(5), Sunday(6), Monday(0), Tuesday(1), Wednesday(2)
    BUSINESS_WEEKDAYS = {0, 1, 2, 5, 6}  # Mon, Tue, Wed, Sat, Sun

    days = (end_date - start_date).days + 1
    weeks = days // 7
    business_days = weeks * 5  # each full 7-day span contains exactly 5 business days

    remainder = days % 7
    start_weekday = start_date.weekday()
    for i in range(remainder):
        if (start_weekday + i) % 7 in BUSINESS_WEEKDAYS:
            business_days += 1

    return business_days


class EmployeeDashboardService:
    """Personal dashboard data for the authenticated employee."""

    @staticmethod
    def _get_upcoming_tasks(user, today_start):
        today_date = today_start.date()
        return (
            Task.objects.filter(
                assignee=user,
                is_deleted=False,
                project__is_deleted=False,
            )
            .filter(Q(due_date__date__gte=today_date) | Q(due_date__isnull=True))
            .exclude(status__code__iexact="done")
            .select_related("status", "project")
            .annotate(
                status_name=F("status__name"),
                status_code=F("status__code"),
                project_name=F("project__name"),
            )
            .order_by(F("due_date").asc(nulls_last=True), "created_at")
            .values(
                "id",
                "title",
                "priority",
                "due_date",
                "status_name",
                "status_code",
                "project_name",
                "project_id",
            )[:UPCOMING_TASKS_LIMIT]
        )

    @staticmethod
    def _get_overdue_tasks(user, today_start):
        today_date = today_start.date()
        return (
            Task.objects.filter(
                assignee=user,
                is_deleted=False,
                due_date__date__lt=today_date,
                project__is_deleted=False,
            )
            .exclude(status__code__iexact="done")
            .select_related("status", "project")
            .annotate(
                status_name=F("status__name"),
                status_code=F("status__code"),
                project_name=F("project__name"),
            )
            .values(
                "id",
                "title",
                "priority",
                "due_date",
                "status_name",
                "status_code",
                "project_name",
                "project_id",
            )
        )

    @staticmethod
    def _get_weekly_time_summary(user, week_start, week_end):
        result = TimeLog.objects.filter(
            user=user,
            is_deleted=False,
            date__gte=week_start.date(),
            date__lte=week_end.date(),
            is_active=False,
            project__is_deleted=False,
        ).aggregate(
            total_seconds=Sum("duration_seconds"),
            total_logs=Count("id"),
        )
        return {
            "total_seconds": result["total_seconds"] or 0,
            "total_logs": result["total_logs"] or 0,
        }

    @staticmethod
    def _get_active_projects(user):
        return (
            ProjectMember.objects.filter(
                user=user,
                is_deleted=False,
                is_active=True,
                project__is_deleted=False,
                project__status__in=[
                    Project.Status.ACTIVE,
                    Project.Status.DRAFT,
                ],
            )
            .select_related("project")
            .annotate(
                project_name=F("project__name"),
                project_status=F("project__status"),
                project_deadline=F("project__deadline"),
            )
            .values(
                "project_id",
                "project_name",
                "project_status",
                "project_deadline",
                "allocation_percentage",
            )
        )

    @staticmethod
    def _get_attendance_status(user, today_start):
        today_date = today_start.date()
        attendance = (
            Attendance.objects.filter(
                user=user,
                date=today_date,
                is_deleted=False,
            )
            .annotate(organization_name=F("organization__name"))
            .values(
                "id",
                "check_in",
                "check_out",
                "is_remote",
                "overtime_minutes",
                "organization_name",
            )
            .first()
        )
        return attendance

    @staticmethod
    def _get_active_timer(user):
        timer = (
            TimeLog.objects.filter(
                user=user,
                is_active=True,
                is_deleted=False,
                project__is_deleted=False,
            )
            .select_related("task", "project")
            .annotate(
                task_title=F("task__title"),
                project_name=F("project__name"),
            )
            .values(
                "id",
                "start_time",
                "task_id",
                "task_title",
                "project_name",
            )
            .first()
        )
        return timer

    @staticmethod
    def _get_upcoming_milestones(user):
        user_project_ids = ProjectMember.objects.filter(
            user=user,
            is_deleted=False,
            is_active=True,
        ).values_list("project_id", flat=True)

        return (
            Milestone.objects.filter(
                project_id__in=user_project_ids,
                is_deleted=False,
                status__in=[
                    Milestone.Status.PENDING,
                    Milestone.Status.IN_PROGRESS,
                ],
            )
            .select_related("project")
            .annotate(
                project_name=F("project__name"),
            )
            .order_by("target_date")
            .values(
                "id",
                "title",
                "status",
                "target_date",
                "project_name",
                "project_id",
            )[:5]
        )

    @classmethod
    def get_dashboard(cls, user, tz_name: str = "UTC") -> dict:
        """Compose all employee dashboard sections into a single dict."""
        version = cache.get(f"dashboard_version:emp:user_{user.id}", 1)
        cache_key = f"reports:emp:user_{user.id}:v{version}:tz_{tz_name}"
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return cached_data

        today_start, today_end = get_user_today_range(tz_name)
        week_start, week_end = get_user_week_range(tz_name)

        result = {
            "upcoming_tasks": list(cls._get_upcoming_tasks(user, today_start)),
            "overdue_tasks": list(cls._get_overdue_tasks(user, today_start)),
            "weekly_time": cls._get_weekly_time_summary(user, week_start, week_end),
            "active_projects": list(cls._get_active_projects(user)),
            "attendance_today": cls._get_attendance_status(user, today_start),
            "active_timer": cls._get_active_timer(user),
            "upcoming_milestones": list(cls._get_upcoming_milestones(user)),
            # Stubs for future modules
            "points": None,  # Module 5 — Gamification (Phase 2)
            "badges": None,  # Module 5 — Gamification (Phase 2)
            "goals": None,  # Module 7 — OKR (Phase 3)
        }

        # Cache for 10 minutes (600 seconds)
        cache.set(cache_key, result, 600)
        return result


class ManagerDashboardService:
    """Team-scoped dashboard data for managers / team leads."""

    @staticmethod
    def get_managed_team_ids(user) -> list:
        return list(
            TeamMembership.objects.filter(
                user=user,
                role=TeamMembership.Role.LEAD,
                is_deleted=False,
            ).values_list("team_id", flat=True)
        )

    @staticmethod
    def _get_team_member_user_ids(team_id) -> list:
        return list(
            TeamMembership.objects.filter(
                team_id=team_id,
                is_deleted=False,
            ).values_list("user_id", flat=True)
        )

    @staticmethod
    def _get_task_stats(member_ids):
        return list(
            Task.objects.filter(
                assignee_id__in=member_ids,
                is_deleted=False,
                project__is_deleted=False,
            )
            .annotate(
                status_code=F("status__code"),
                status_name=F("status__name"),
            )
            .values("status_code", "status_name")
            .annotate(count=Count("id"))
            .order_by("status_code")
        )

    @staticmethod
    def _get_overdue_tasks(member_ids, today_start):
        today_date = today_start.date()
        qs = Task.objects.filter(
            assignee_id__in=member_ids,
            is_deleted=False,
            due_date__date__lt=today_date,
            project__is_deleted=False,
        ).exclude(status__code__iexact="done")

        return {
            "total_overdue": qs.count(),
            "by_member": list(
                qs.annotate(
                    username=F("assignee__username"),
                    first_name=F("assignee__first_name"),
                )
                .values("username", "first_name")
                .annotate(count=Count("id"))
                .order_by("-count")
            ),
        }

    @staticmethod
    def _get_work_hours(member_ids, week_start, week_end):
        return list(
            TimeLog.objects.filter(
                user_id__in=member_ids,
                is_deleted=False,
                is_active=False,
                date__gte=week_start.date(),
                date__lte=week_end.date(),
                project__is_deleted=False,
            )
            .annotate(
                username=F("user__username"),
                first_name=F("user__first_name"),
                last_name=F("user__last_name"),
            )
            .values(
                "user_id",
                "username",
                "first_name",
                "last_name",
            )
            .annotate(
                total_seconds=Sum("duration_seconds"),
                total_logs=Count("id"),
            )
            .order_by("-total_seconds")
        )

    @staticmethod
    def _get_members_attendance(member_ids, today_start):
        today_date = today_start.date()
        return list(
            Attendance.objects.filter(
                user_id__in=member_ids,
                date=today_date,
                is_deleted=False,
            )
            .annotate(
                username=F("user__username"),
                first_name=F("user__first_name"),
            )
            .values(
                "user_id",
                "username",
                "first_name",
                "check_in",
                "check_out",
                "is_remote",
            )
        )

    @staticmethod
    def _get_project_summary(member_ids):
        project_ids = (
            ProjectMember.objects.filter(
                user_id__in=member_ids,
                is_deleted=False,
                is_active=True,
            )
            .values_list("project_id", flat=True)
            .distinct()
        )

        # Subquery for total logged seconds per project — kept separate from the
        # Count annotations to prevent cross-product row multiplication that occurs
        # when Django JOINs multiple reverse relations (members + tasks + time_logs)
        # in a single annotate call. A Subquery correlated on OuterRef('id') avoids
        # this by running an independent aggregation per project.
        time_subquery = Subquery(
            TimeLog.objects.filter(
                project_id=OuterRef("id"),
                is_deleted=False,
                is_active=False,
            )
            .values("project_id")
            .annotate(total=Sum("duration_seconds"))
            .values("total")[:1]
        )

        return list(
            Project.objects.filter(
                id__in=project_ids,
                is_deleted=False,
            )
            .annotate(
                # distinct=True prevents row multiplication when aggregating over
                # multiple FK paths (members + tasks) in one queryset.
                active_member_count=Count(
                    "members",
                    filter=Q(members__is_deleted=False, members__is_active=True),
                    distinct=True,
                ),
                total_tasks=Count(
                    "tasks",
                    filter=Q(tasks__is_deleted=False),
                    distinct=True,
                ),
                done_tasks=Count(
                    "tasks",
                    filter=Q(
                        tasks__is_deleted=False,
                        tasks__status__code__iexact="done",
                    ),
                    distinct=True,
                ),
                total_time_seconds=time_subquery,
            )
            .values(
                "id",
                "name",
                "status",
                "budget",
                "budget_currency",
                "deadline",
                "active_member_count",
                "total_tasks",
                "done_tasks",
                "total_time_seconds",
            )
        )

    @classmethod
    def _resolve_member_ids(cls, user, team_id=None) -> list:
        if team_id:
            return cls._get_team_member_user_ids(team_id)
        else:
            managed_teams = cls.get_managed_team_ids(user)
            return list(
                TeamMembership.objects.filter(
                    team_id__in=managed_teams,
                    is_deleted=False,
                )
                .values_list("user_id", flat=True)
                .distinct()
            )

    @classmethod
    def get_dashboard(cls, user, team_id=None, tz_name: str = "UTC") -> dict:
        """Compose all manager dashboard sections."""
        key_prefix = f"team_{team_id}" if team_id else f"user_{user.id}"
        version = cache.get(f"dashboard_version:mgr:{key_prefix}", 1)
        cache_key = f"reports:mgr:{key_prefix}:v{version}:tz_{tz_name}"

        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return cached_data

        member_ids = cls._resolve_member_ids(user, team_id)

        today_start, today_end = get_user_today_range(tz_name)
        week_start, week_end = get_user_week_range(tz_name)

        result = {
            "team_member_count": len(member_ids),
            "task_stats": cls._get_task_stats(member_ids),
            "overdue_summary": cls._get_overdue_tasks(member_ids, today_start),
            "work_hours": cls._get_work_hours(member_ids, week_start, week_end),
            "members_attendance": cls._get_members_attendance(member_ids, today_start),
            "project_summary": cls._get_project_summary(member_ids),
        }

        # Cache for 15 minutes (900 seconds)
        cache.set(cache_key, result, 900)
        return result

    @classmethod
    def get_members_detail(cls, user, team_id=None, tz_name: str = "UTC") -> list:
        """Detailed per-member view: tasks, hours, attendance."""
        member_ids = cls._resolve_member_ids(user, team_id)

        today_start, _ = get_user_today_range(tz_name)
        week_start, week_end = get_user_week_range(tz_name)
        today_date = today_start.date()

        from accounts.models import User

        members = (
            User.objects.filter(id__in=member_ids, is_deleted=False)
            .annotate(
                total_tasks=Count(
                    "tasks",
                    filter=Q(tasks__is_deleted=False, tasks__project__is_deleted=False),
                    distinct=True,
                ),
                done_tasks=Count(
                    "tasks",
                    filter=Q(
                        tasks__is_deleted=False,
                        tasks__project__is_deleted=False,
                        tasks__status__code__iexact="done",
                    ),
                    distinct=True,
                ),
                overdue_tasks=Count(
                    "tasks",
                    filter=Q(
                        tasks__is_deleted=False,
                        tasks__project__is_deleted=False,
                        tasks__due_date__date__lt=today_date,
                    )
                    & ~Q(tasks__status__code__iexact="done"),
                    distinct=True,
                ),
                week_seconds=Subquery(
                    TimeLog.objects.filter(
                        user_id=OuterRef("id"),
                        is_deleted=False,
                        is_active=False,
                        date__gte=week_start.date(),
                        date__lte=week_end.date(),
                        project__is_deleted=False,
                    )
                    .values("user_id")
                    .annotate(total=Sum("duration_seconds"))
                    .values("total")[:1]
                ),
            )
            .values(
                "id",
                "username",
                "first_name",
                "last_name",
                "email",
                "total_tasks",
                "done_tasks",
                "overdue_tasks",
                "week_seconds",
            )
        )

        return list(members)


class ExecutiveDashboardService:
    """Organisation-wide dashboard data for owners and admins."""

    @staticmethod
    def _get_company_overview(org_id):
        from organizations.models import OrganizationMembership

        member_count = OrganizationMembership.objects.filter(
            organization_id=org_id, is_deleted=False
        ).count()

        project_stats = Project.objects.filter(organization_id=org_id, is_deleted=False).aggregate(
            total=Count("id"),
            active=Count("id", filter=Q(status=Project.Status.ACTIVE)),
            completed=Count("id", filter=Q(status=Project.Status.COMPLETED)),
            on_hold=Count("id", filter=Q(status=Project.Status.ON_HOLD)),
        )

        task_stats = Task.objects.filter(
            project__organization_id=org_id,
            is_deleted=False,
            project__is_deleted=False,
        ).aggregate(
            total=Count("id"),
            done=Count("id", filter=Q(status__code__iexact="done")),
            # "In-progress" means actively being worked on or under review.
            # TaskStatus has no semantic category field (is_terminal, category, …),
            # so we must enumerate the known in-flight codes explicitly.
            # Default board codes are: todo | doing | review | done.
            # "todo" is NOT in-progress (work hasn't started); only doing + review are.
            # If a project adds a custom in-flight status, it must be added here too.
            # This is a known model-level gap; the long-term fix is adding a
            # TaskStatus.category field (todo / in_progress / done).
            in_progress=Count(
                "id",
                filter=Q(status__code__in=["doing", "review", "in_progress", "in_review"]),
            ),
        )

        return {
            "total_members": member_count,
            "projects": project_stats,
            "tasks": task_stats,
        }

    @staticmethod
    def _get_resource_utilization(org_id, week_start, week_end):
        from organizations.models import OrganizationMembership

        member_count = OrganizationMembership.objects.filter(
            organization_id=org_id, is_deleted=False
        ).count()

        work_data = TimeLog.objects.filter(
            project__organization_id=org_id,
            is_deleted=False,
            is_active=False,
            date__gte=week_start.date(),
            date__lte=week_end.date(),
            project__is_deleted=False,
        ).aggregate(
            total_seconds=Sum("duration_seconds"),
            active_workers=Count("user_id", distinct=True),
        )

        total_seconds = work_data["total_seconds"] or 0
        active_workers = work_data["active_workers"] or 0

        # Calculate business days in the week range
        current = week_start.date()
        end = min(week_end.date(), timezone.now().date())
        business_days = get_business_days(current, end)

        # Get expected daily hours for the organization
        setting = AttendanceSetting.objects.filter(organization_id=org_id).first()
        expected_daily_hours = float(setting.expected_daily_hours) if setting else 8.0

        # Calculate approved leave time in the week range (in seconds)
        leave_requests = TimeOffRequest.objects.filter(
            organization_id=org_id,
            status=TimeOffRequest.Status.APPROVED,
            request_type__in=[
                TimeOffRequest.Type.VACATION,
                TimeOffRequest.Type.SICK,
                TimeOffRequest.Type.HOURLY,
            ],
            is_deleted=False,
            start_datetime__lt=week_end,
            end_datetime__gt=week_start,
        ).values("start_datetime", "end_datetime")

        # Clip each leave to the week window, then merge overlapping intervals
        # before summing so that two leaves covering the same hours are only
        # deducted once (merge-intervals pattern: O(n log n)).
        clipped: list[tuple[datetime.datetime, datetime.datetime]] = []
        for req in leave_requests:
            req_start = max(req["start_datetime"], week_start)
            req_end = min(req["end_datetime"], week_end)
            if req_end > req_start:
                clipped.append((req_start, req_end))

        merged_leaves = _merge_intervals(clipped)
        leave_seconds = sum(
            (end - start).total_seconds() for start, end in merged_leaves
        )

        expected_seconds = int((member_count * business_days * expected_daily_hours * 3600) - leave_seconds)
        expected_seconds = max(expected_seconds, 0)

        return {
            "total_work_seconds": total_seconds,
            "expected_seconds": expected_seconds,
            "utilization_rate": (
                round(total_seconds / expected_seconds * 100, 1) if expected_seconds > 0 else 0.0
            ),
            "active_workers": active_workers,
            "total_members": member_count,
        }

    @staticmethod
    def _get_project_health(org_id, today_start):
        today_date = today_start.date()

        projects = (
            Project.objects.filter(
                organization_id=org_id,
                is_deleted=False,
                status=Project.Status.ACTIVE,
            )
            .annotate(
                total_tasks=Count("tasks", filter=Q(tasks__is_deleted=False)),
                done_tasks=Count(
                    "tasks",
                    filter=Q(
                        tasks__is_deleted=False,
                        tasks__status__code__iexact="done",
                    ),
                ),
                overdue_tasks=Count(
                    "tasks",
                    filter=Q(
                        tasks__is_deleted=False,
                        tasks__due_date__date__lt=today_date,
                    )
                    & ~Q(tasks__status__code__iexact="done"),
                ),
                overdue_milestones=Count(
                    "milestones",
                    filter=Q(
                        milestones__is_deleted=False,
                        milestones__project__is_deleted=False,
                        milestones__target_date__lt=today_date,
                    )
                    & ~Q(milestones__status=Milestone.Status.COMPLETED),
                ),
            )
            .values(
                "id",
                "name",
                "deadline",
                "budget",
                "budget_currency",
                "total_tasks",
                "done_tasks",
                "overdue_tasks",
                "overdue_milestones",
            )
        )

        result = []
        for p in projects:
            total = p["total_tasks"] or 0
            done = p["done_tasks"] or 0
            overdue = p["overdue_tasks"] or 0

            progress = round(done / total * 100, 1) if total > 0 else 0.0

            if overdue == 0 and p["overdue_milestones"] == 0:
                health = "on_track"
            elif overdue <= 2 and p["overdue_milestones"] <= 1:
                health = "at_risk"
            else:
                health = "delayed"

            result.append({**p, "progress": progress, "health": health})

        return result

    @staticmethod
    def _get_financial_summary(org_id):
        return (
            Project.objects.filter(
                organization_id=org_id,
                is_deleted=False,
            )
            .exclude(status=Project.Status.ARCHIVED)
            .aggregate(
                total_budget=Sum("budget", default=0),
                project_count=Count("id"),
                total_time_seconds=Sum(
                    "time_logs__duration_seconds",
                    filter=Q(
                        time_logs__is_deleted=False,
                        time_logs__is_active=False,
                    ),
                    default=0,
                ),
            )
        )

    @classmethod
    def get_dashboard(cls, user, org_id=None, tz_name: str = "UTC") -> dict:
        """Compose the executive dashboard sections."""
        if not org_id:
            from organizations.models import OrganizationMembership

            # order_by('created_at') ensures deterministic selection for multi-org users:
            # the earliest (primary) membership is always chosen, not an arbitrary row.
            membership = (
                OrganizationMembership.objects.filter(
                    user=user,
                    role__in=[
                        OrganizationMembership.Role.OWNER,
                        OrganizationMembership.Role.ADMIN,
                    ],
                    is_deleted=False,
                )
                .order_by("created_at")
                .first()
            )
            if not membership:
                from django.utils.translation import gettext_lazy as _
                from rest_framework.exceptions import NotFound

                raise NotFound(_("No organisation found for this user."))
            org_id = membership.organization_id

        version = cache.get(f"dashboard_version:exec:org_{org_id}", 1)
        cache_key = f"reports:exec:org_{org_id}:v{version}:tz_{tz_name}"
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return cached_data

        today_start, today_end = get_user_today_range(tz_name)
        week_start, week_end = get_user_week_range(tz_name)

        result = {
            "company_overview": cls._get_company_overview(org_id),
            "resource_utilization": cls._get_resource_utilization(org_id, week_start, week_end),
            "project_health": cls._get_project_health(org_id, today_start),
            "financial_summary": cls._get_financial_summary(org_id),
        }

        # Cache for 60 minutes (3600 seconds)
        cache.set(cache_key, result, 3600)
        return result

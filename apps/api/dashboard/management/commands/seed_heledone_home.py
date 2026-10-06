"""Idempotent, opt-in content for the local Heledone showcase workspace.

Run with: python manage.py seed_heledone_home --organization madaar-demo
Existing accounts, projects, and attendance are never overwritten.
"""

from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from attendance.models import Attendance, TimeLog, TimeOffRequest
from organizations.models import Organization, OrganizationMembership, Team, TeamMembership
from panel.Notification.models import Notification
from projects.models import Milestone, Project, ProjectMember
from tasks.models import Board, Task, TaskStatus


class Command(BaseCommand):
    help = "Add real, idempotent dashboard content to an existing development organization."

    def add_arguments(self, parser):
        parser.add_argument(
            "--organization", default="madaar-demo", help="Existing organization slug"
        )
        parser.add_argument(
            "--users",
            nargs="+",
            default=["admin", "demo-user"],
            help="Existing usernames to populate",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        organization = Organization.objects.filter(slug=options["organization"]).first()
        if not organization:
            raise CommandError(f"Organization {options['organization']!r} does not exist.")
        user_model = get_user_model()
        users_by_name = {
            user.username: user for user in user_model.objects.filter(username__in=options["users"])
        }
        users = [users_by_name[name] for name in options["users"] if name in users_by_name]
        found = {user.username for user in users}
        missing = set(options["users"]) - found
        if missing:
            raise CommandError(f"Unknown users: {', '.join(sorted(missing))}")
        for user in users:
            if not OrganizationMembership.objects.filter(
                organization=organization, user=user
            ).exists():
                raise CommandError(f"{user.username} is not a member of {organization.slug}.")

        now = timezone.now()
        local_today = timezone.localtime(now, ZoneInfo("Asia/Tehran")).date()
        team, _ = Team.objects.get_or_create(
            organization=organization,
            name="تیم محصول هله‌دان",
            defaults={"leader": users[0], "description": "طراحی و توسعه محصول هله‌دان"},
        )
        for user in users:
            TeamMembership.objects.get_or_create(team=team, user=user)

        projects = []
        for name, prefix, progress in (
            ("وبسایت هله‌دان", "HDW", 75),
            ("پنل مدیریت هله‌دان", "HDA", 40),
        ):
            project, _ = Project.objects.get_or_create(
                organization=organization,
                prefix=prefix,
                defaults={
                    "name": name,
                    "description": f"پروژه {name} برای کارهای تیم محصول",
                    "owner": users[0],
                    "status": Project.Status.ACTIVE,
                    "start_date": local_today - timedelta(days=20),
                    "deadline": local_today + timedelta(days=30),
                    "color": "#087F83" if progress == 75 else "#F2BA49",
                },
            )
            projects.append(project)
            for user in users:
                ProjectMember.objects.get_or_create(
                    project=project,
                    user=user,
                    defaults={
                        "specialty": "Product",
                        "allocation_percentage": 50,
                        "allocation_start_date": project.start_date,
                    },
                )
            for title, weight, status in (
                ("مرحله آماده‌شده", progress, Milestone.Status.COMPLETED),
                ("مرحله بعدی", 100 - progress, Milestone.Status.IN_PROGRESS),
            ):
                Milestone.objects.get_or_create(
                    project=project,
                    title=title,
                    defaults={
                        "weight": weight,
                        "status": status,
                        "target_date": local_today + timedelta(days=14),
                    },
                )
            board, _ = Board.objects.get_or_create(
                project=project,
                title="برد تیم محصول",
                defaults={"created_by": users[0], "order": 0},
            )
            statuses = {}
            for order, (code, label, category) in enumerate(
                (
                    ("todo", "برای انجام", TaskStatus.Category.TODO),
                    ("in_progress", "در حال انجام", TaskStatus.Category.IN_PROGRESS),
                    ("review", "در حال بررسی", TaskStatus.Category.REVIEW),
                    ("done", "انجام‌شده", TaskStatus.Category.DONE),
                )
            ):
                statuses[code], _ = TaskStatus.objects.get_or_create(
                    board=board,
                    code=code,
                    defaults={"name": label, "category": category, "order": order},
                )
            project._seed_statuses = statuses

        task_defs = (
            (0, "طراحی صفحه ورود", "in_progress", 0, 0),
            (1, "بررسی کد پرداخت", "review", 0, 1),
            (0, "تست نسخه جدید", "todo", 0, 2),
            (1, "بهبود تجربه داشبورد", "in_progress", 0, 3),
            (0, "بازبینی نسخه موبایل", "todo", 1, 4),
            (0, "آماده‌سازی راهنمای محصول", "done", 0, 5),
            (1, "رفع خطاهای گزارش", "done", 1, 6),
        )
        created_tasks = {}
        for project_index, title, code, user_index, order in task_defs:
            project = projects[project_index]
            user = users[min(user_index, len(users) - 1)]
            task, _ = Task.objects.get_or_create(
                project=project,
                title=title,
                defaults={
                    "description": "تسک تیم محصول هله‌دان",
                    "status": project._seed_statuses[code],
                    "priority": Task.Priority.MEDIUM,
                    "assignee": user,
                    "reporter": users[0],
                    "order": order,
                    "is_finished": code == "done",
                    "due_date": None if user_index == 0 else now + timedelta(days=3),
                },
            )
            created_tasks[title] = task

        for user in users:
            Attendance.objects.get_or_create(
                user=user,
                date=local_today,
                defaults={
                    "organization": organization,
                    "check_in": now - timedelta(hours=2, minutes=35),
                    "check_out": now,
                    "timezone": "Asia/Tehran",
                },
            )
            TimeOffRequest.objects.get_or_create(
                user=user,
                organization=organization,
                reason="درخواست مرخصی برنامه‌ریزی‌شده هله‌دان",
                defaults={
                    "request_type": TimeOffRequest.Type.VACATION,
                    "status": TimeOffRequest.Status.PENDING,
                    "start_datetime": datetime.combine(
                        local_today + timedelta(days=7), time(9), ZoneInfo("Asia/Tehran")
                    ),
                    "end_datetime": datetime.combine(
                        local_today + timedelta(days=8), time(17), ZoneInfo("Asia/Tehran")
                    ),
                },
            )
            timer_task = (
                created_tasks["طراحی صفحه ورود"]
                if user == users[0]
                else created_tasks["بازبینی نسخه موبایل"]
            )
            TimeLog.objects.get_or_create(
                user=user,
                task=timer_task,
                description="زمان‌سنج خانه هله‌دان",
                defaults={
                    "project": timer_task.project,
                    "date": local_today,
                    "start_time": now - timedelta(minutes=25),
                    "is_active": True,
                },
            )
            for text, link in (
                ("از همکاری شما در پروژه وبسایت هله‌دان سپاسگزاریم.", "/projects"),
                ("نسخه جدید پنل مدیریت آماده بررسی است.", "/projects"),
            ):
                Notification.objects.get_or_create(user=user, text=text, defaults={"link": link})

        self.stdout.write(
            self.style.SUCCESS(
                f"Heledone home seeded for {organization.slug}: {len(users)} users, "
                f"{len(projects)} projects, {len(created_tasks)} tasks. Existing records kept."
            )
        )

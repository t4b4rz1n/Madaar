import datetime

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from attendance.models import Attendance, TimeLog
from organizations.models import (
    Organization,
    OrganizationMembership,
    Team,
    TeamMembership,
)
from projects.models import Project, ProjectMember
from tasks.models import Board, Task, TaskStatus

User = get_user_model()


class ReportsAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        # 1. Users
        cls.org_owner = User.objects.create_user(
            username="owner",
            email="owner@test.com",
            password="password123",
            first_name="Org",
            last_name="Owner",
        )
        cls.team_lead = User.objects.create_user(
            username="lead",
            email="lead@test.com",
            password="password123",
            first_name="Team",
            last_name="Lead",
        )
        cls.employee1 = User.objects.create_user(
            username="emp1",
            email="emp1@test.com",
            password="password123",
            first_name="Emp",
            last_name="One",
        )
        cls.employee2 = User.objects.create_user(
            username="emp2",
            email="emp2@test.com",
            password="password123",
            first_name="Emp",
            last_name="Two",
        )
        cls.loner = User.objects.create_user(
            username="loner", email="loner@test.com", password="password123"
        )

        # 2. Organization & Teams
        cls.org = Organization.objects.create(
            name="Acme Corp", slug="acme", owner=cls.org_owner
        )
        cls.team_a = Team.objects.create(name="Backend", organization=cls.org)
        cls.team_b = Team.objects.create(name="Frontend", organization=cls.org)

        # Memberships
        OrganizationMembership.objects.create(
            user=cls.org_owner,
            organization=cls.org,
            role=OrganizationMembership.Role.OWNER,
        )
        OrganizationMembership.objects.create(
            user=cls.team_lead,
            organization=cls.org,
            role=OrganizationMembership.Role.TEAM_LEAD,
        )
        OrganizationMembership.objects.create(
            user=cls.employee1,
            organization=cls.org,
            role=OrganizationMembership.Role.EMPLOYEE,
        )
        OrganizationMembership.objects.create(
            user=cls.employee2,
            organization=cls.org,
            role=OrganizationMembership.Role.EMPLOYEE,
        )

        TeamMembership.objects.create(
            user=cls.team_lead, team=cls.team_a, role=TeamMembership.Role.LEAD
        )
        TeamMembership.objects.create(
            user=cls.employee1, team=cls.team_a, role=TeamMembership.Role.MEMBER
        )
        TeamMembership.objects.create(
            user=cls.employee2, team=cls.team_b, role=TeamMembership.Role.MEMBER
        )

        # 3. Projects
        cls.project = Project.objects.create(
            name="Alpha",
            organization=cls.org,
            owner=cls.org_owner,
            budget=10000,
            budget_currency="USD",
        )
        ProjectMember.objects.create(
            user=cls.employee1, project=cls.project, allocation_percentage=100
        )

        # 4. Tasks & Statuses
        cls.board = Board.objects.create(
            title="Main Board", project=cls.project, created_by=cls.org_owner
        )
        cls.status_todo = TaskStatus.objects.create(
            board=cls.board, name="To Do", code="todo", order=1
        )
        cls.status_doing = TaskStatus.objects.create(
            board=cls.board, name="In Progress", code="in_progress", order=2
        )
        cls.status_done = TaskStatus.objects.create(
            board=cls.board, name="Done", code="done", order=3
        )

        today = timezone.now()
        yesterday = today - datetime.timedelta(days=1)
        tomorrow = today + datetime.timedelta(days=1)

        # Employee 1 tasks
        cls.task1 = Task.objects.create(
            title="Task 1",
            project=cls.project,
            assignee=cls.employee1,
            status=cls.status_doing,
            due_date=today,
        )
        cls.task2 = Task.objects.create(  # Overdue
            title="Task 2",
            project=cls.project,
            assignee=cls.employee1,
            status=cls.status_todo,
            due_date=yesterday,
        )
        cls.task3 = Task.objects.create(  # Done
            title="Task 3",
            project=cls.project,
            assignee=cls.employee1,
            status=cls.status_done,
            due_date=yesterday,
        )

        # 5. TimeLogs
        TimeLog.objects.create(
            user=cls.employee1,
            task=cls.task1,
            project=cls.project,
            date=today.date(),
            start_time=today,
            duration_seconds=3600,
            is_active=False,
        )

        # 6. Attendance
        Attendance.objects.create(
            user=cls.employee1, organization=cls.org, date=today.date(), check_in=today
        )

    # -----------------------------------------------------------------------
    # Employee Dashboard Tests
    # -----------------------------------------------------------------------

    def test_employee_dashboard_access(self):
        url = reverse("reports:employee-dashboard")

        # Unauthenticated
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # User not in any org
        self.client.force_authenticate(user=self.loner)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Employee in org
        self.client.force_authenticate(user=self.employee1)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_employee_dashboard_content(self):
        url = reverse("reports:employee-dashboard")
        self.client.force_authenticate(user=self.employee1)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()["data"]

        # check today_tasks contains task1 (due today, in progress)
        self.assertEqual(len(data["today_tasks"]), 1)
        self.assertEqual(data["today_tasks"][0]["id"], str(self.task1.id))

        # check overdue_tasks contains task2
        self.assertEqual(len(data["overdue_tasks"]), 1)
        self.assertEqual(data["overdue_tasks"][0]["id"], str(self.task2.id))

        # check weekly_time
        self.assertEqual(data["weekly_time"]["total_seconds"], 3600)

        # check active projects
        self.assertEqual(len(data["active_projects"]), 1)
        self.assertEqual(data["active_projects"][0]["project__name"], "Alpha")

        # check attendance
        self.assertIsNotNone(data["attendance_today"])
        self.assertEqual(data["attendance_today"]["organization__name"], "Acme Corp")

    # -----------------------------------------------------------------------
    # Manager Dashboard Tests
    # -----------------------------------------------------------------------

    def test_manager_dashboard_access(self):
        url = reverse("reports:manager-dashboard")

        # Employee should not have access
        self.client.force_authenticate(user=self.employee1)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Team lead should have access to their team
        self.client.force_authenticate(user=self.team_lead)
        response = self.client.get(url, {"team_id": str(self.team_a.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Team lead should NOT have access to another team
        response = self.client.get(url, {"team_id": str(self.team_b.id)})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Org admin should have access to any team
        self.client.force_authenticate(user=self.org_owner)
        response = self.client.get(url, {"team_id": str(self.team_b.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_manager_dashboard_content(self):
        url = reverse("reports:manager-dashboard")
        self.client.force_authenticate(user=self.team_lead)
        response = self.client.get(url, {"team_id": str(self.team_a.id)})

        data = response.json()["data"]

        # Team A has lead + emp1 = 2 members
        self.assertEqual(data["team_member_count"], 2)

        # Task stats (emp1 has 1 todo, 1 doing, 1 done)
        stats = {item["status__code"]: item["count"] for item in data["task_stats"]}
        self.assertEqual(stats.get("todo", 0), 1)
        self.assertEqual(stats.get("in_progress", 0), 1)
        self.assertEqual(stats.get("done", 0), 1)

        # Overdue summary (emp1 has task2 overdue)
        self.assertEqual(data["overdue_summary"]["total_overdue"], 1)

    def test_manager_members_detail(self):
        url = reverse("reports:manager-members")
        self.client.force_authenticate(user=self.team_lead)
        response = self.client.get(url, {"team_id": str(self.team_a.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()["data"]
        self.assertEqual(len(data), 2)  # lead + emp1

        emp1_data = next(m for m in data if m["id"] == str(self.employee1.id))
        self.assertEqual(emp1_data["total_tasks"], 3)
        self.assertEqual(emp1_data["done_tasks"], 1)
        self.assertEqual(emp1_data["overdue_tasks"], 1)
        self.assertEqual(emp1_data["week_seconds"], 3600)

    # -----------------------------------------------------------------------
    # Executive Dashboard Tests
    # -----------------------------------------------------------------------

    def test_executive_dashboard_access(self):
        url = reverse("reports:executive-dashboard")

        # Team lead should not have access
        self.client.force_authenticate(user=self.team_lead)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Org admin should have access
        self.client.force_authenticate(user=self.org_owner)
        response = self.client.get(url)  # Should auto-select the org
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_executive_dashboard_content(self):
        url = reverse("reports:executive-dashboard")
        self.client.force_authenticate(user=self.org_owner)
        response = self.client.get(url, {"org_id": str(self.org.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()["data"]

        # Company overview
        overview = data["company_overview"]
        self.assertEqual(overview["total_members"], 4)
        # let's check setUpTestData: lead, emp1, emp2, owner(created org). By default owner is member.

        self.assertEqual(overview["projects"]["total"], 1)
        self.assertEqual(overview["tasks"]["total"], 3)
        self.assertEqual(overview["tasks"]["done"], 1)

        # Financial
        financial = data["financial_summary"]
        self.assertEqual(float(financial["total_budget"]), 10000.0)

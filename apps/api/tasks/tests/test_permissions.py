from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from organizations.models import Organization, OrganizationMembership
from projects.models import Project, ProjectMember
from tasks.models import AsyncStandup, Board, Task, TaskChecklistItem, TaskStatus

User = get_user_model()


class TasksRBACTestCase(APITestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Test Org", slug="test-org")

        self.admin = User.objects.create_user("admin_user", "admin@test.com", "Pass123!")
        OrganizationMembership.objects.create(
            user=self.admin, organization=self.org, role=OrganizationMembership.Role.ADMIN
        )

        self.lead = User.objects.create_user("lead_user", "lead@test.com", "Pass123!")
        OrganizationMembership.objects.create(
            user=self.lead, organization=self.org, role=OrganizationMembership.Role.TEAM_LEAD
        )

        self.employee = User.objects.create_user("emp_user", "emp@test.com", "Pass123!")
        OrganizationMembership.objects.create(
            user=self.employee, organization=self.org, role=OrganizationMembership.Role.EMPLOYEE
        )

        self.hr = User.objects.create_user("hr_user", "hr@test.com", "Pass123!")
        OrganizationMembership.objects.create(
            user=self.hr, organization=self.org, role=OrganizationMembership.Role.HR
        )

        self.accountant = User.objects.create_user("acc_user", "acc@test.com", "Pass123!")
        OrganizationMembership.objects.create(
            user=self.accountant, organization=self.org, role=OrganizationMembership.Role.ACCOUNTANT
        )

        self.project = Project.objects.create(name="RBAC Project", organization=self.org)
        self.board = Board.objects.create(
            title="RBAC Board", project=self.project, created_by=self.admin
        )
        self.status_todo = TaskStatus.objects.create(
            board=self.board, code="todo", name="To Do", order=1
        )

    def test_hr_accountant_read_only_tasks(self):
        """HR and Accountant roles should be read-only on tasks."""
        self.client.force_authenticate(user=self.hr)
        res = self.client.get(reverse("task-list"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.post(
            reverse("task-list"),
            {"project": self.project.id, "title": "HR Task Attempt"},
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.accountant)
        res = self.client.post(
            reverse("task-list"),
            {"project": self.project.id, "title": "Accountant Task Attempt"},
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_employee_board_creation_forbidden(self):
        """Employee role cannot create new boards."""
        self.client.force_authenticate(user=self.employee)
        res = self.client.post(
            reverse("task-board-list"),
            {"title": "Emp Board", "project": self.project.id},
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_and_lead_board_creation_allowed(self):
        """Admin and Team Lead roles can create boards."""
        self.client.force_authenticate(user=self.lead)
        res = self.client.post(
            reverse("task-board-list"),
            {"title": "Lead Board", "project": self.project.id},
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        self.client.force_authenticate(user=self.admin)
        res = self.client.post(
            reverse("task-board-list"),
            {"title": "Admin Board", "project": self.project.id},
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_checklist_security_unrelated_employee_forbidden(self):
        """Unrelated employee cannot toggle or delete another user's checklist item."""
        task = Task.objects.create(
            project=self.project,
            title="Secure Task",
            reporter=self.lead,
            assignee=self.lead,
            status=self.status_todo,
        )
        item = TaskChecklistItem.objects.create(
            task=task, description="Secret Item"
        )

        self.client.force_authenticate(user=self.employee)
        toggle_url = reverse("task-checklist-item-toggle", kwargs={"pk": item.id})
        res = self.client.post(toggle_url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        del_url = reverse("task-checklist-item-detail", kwargs={"pk": item.id})
        res = self.client.delete(del_url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_employee_standups_filtered_to_own_only(self):
        """Employee role should only see their own standup reports when listing standups."""
        AsyncStandup.objects.create(
            user=self.admin, yesterday_work="Admin Y", today_work="Admin T"
        )
        emp_standup = AsyncStandup.objects.create(
            user=self.employee, yesterday_work="Emp Y", today_work="Emp T"
        )

        self.client.force_authenticate(user=self.employee)
        res = self.client.get(reverse("task-standup-list"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], str(emp_standup.id))

        self.client.force_authenticate(user=self.admin)
        res_admin = self.client.get(reverse("task-standup-list"))
        self.assertEqual(res_admin.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_admin.data["results"]), 2)

    def test_employee_project_isolation(self):
        """Employee in Project 1 cannot create tasks in Project 2 where they are not a member."""
        project2 = Project.objects.create(name="Project 2 Isolation", organization=self.org)
        ProjectMember.objects.create(project=self.project, user=self.employee, is_active=True)

        self.client.force_authenticate(user=self.employee)

        res1 = self.client.post(
            reverse("task-list"),
            {"project": self.project.id, "title": "P1 Task Allowed"},
        )
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        res2 = self.client.post(
            reverse("task-list"),
            {"project": project2.id, "title": "P2 Task Forbidden"},
        )
        self.assertEqual(res2.status_code, status.HTTP_403_FORBIDDEN)

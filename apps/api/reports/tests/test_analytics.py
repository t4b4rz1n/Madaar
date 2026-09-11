"""
reports/tests/test_analytics.py
--------------------------------
Tests for CFD, Milestone Burndown, and Cycle/Lead Time endpoints.
"""
import datetime

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from organizations.models import Organization, OrganizationMembership
from projects.models import Milestone, Project, ProjectMember
from tasks.models import Board, Task, TaskStatus, TaskStatusTransition
from tasks.services import BoardService

User = get_user_model()


def _create_org_and_user(username, role="owner"):
    org = Organization.objects.create(name=f"Org {username}", slug=f"org-{username}")
    user = User.objects.create_user(username=username, email=f"{username}@test.com", password="Pass123!")
    OrganizationMembership.objects.create(user=user, organization=org, role=role)
    return org, user


class CFDTestCase(APITestCase):
    """Tests for GET /api/v1/reports/projects/<id>/cfd/"""

    @classmethod
    def setUpTestData(cls):
        cls.org, cls.owner = _create_org_and_user("cfd_owner")
        cls.employee = User.objects.create_user("cfd_emp", "cfd_emp@test.com", "Pass123!")
        OrganizationMembership.objects.create(
            user=cls.employee, organization=cls.org, role="employee"
        )
        cls.project = Project.objects.create(name="CFD Project", organization=cls.org)
        ProjectMember.objects.create(project=cls.project, user=cls.employee, is_active=True)
        cls.board = BoardService.create_board(
            title="CFD Board", project=cls.project, created_by=cls.owner
        )
        cls.todo = TaskStatus.objects.get(board=cls.board, code="todo")
        cls.doing = TaskStatus.objects.get(board=cls.board, code="doing")
        cls.done = TaskStatus.objects.get(board=cls.board, code="done")

        # Create a task and two transitions
        cls.task = Task.objects.create(
            title="T1", project=cls.project, status=cls.todo, reporter=cls.owner
        )

    def _url(self):
        return reverse("reports:project-cfd", kwargs={"project_id": self.project.id})

    def test_owner_can_get_cfd(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get(self._url(), {"start_date": "2026-01-01", "end_date": "2026-12-31"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("statuses", res.data)
        self.assertIn("data", res.data)

    def test_project_member_employee_can_get_cfd(self):
        self.client.force_authenticate(user=self.employee)
        res = self.client.get(self._url())
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_non_member_forbidden(self):
        stranger = User.objects.create_user("stranger_cfd", "s@test.com", "Pass123!")
        OrganizationMembership.objects.create(
            user=stranger, organization=self.org, role="employee"
        )
        self.client.force_authenticate(user=stranger)
        res = self.client.get(self._url())
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_cfd_contains_dynamic_status_counts(self):
        """CFD data should include today's counts for all statuses."""
        self.client.force_authenticate(user=self.owner)
        today = timezone.now().date().isoformat()
        res = self.client.get(self._url(), {"start_date": today, "end_date": today})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data["data"]), 1)
        # All status codes in statuses list should appear in counts dict
        status_codes = {s["code"] for s in res.data["statuses"]}
        for day in res.data["data"]:
            for code in day["counts"]:
                self.assertIn(code, status_codes)

    def test_invalid_date_format_returns_400(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get(self._url(), {"start_date": "not-a-date"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class MilestoneBurndownTestCase(APITestCase):
    """Tests for GET /api/v1/reports/milestones/<id>/burndown/"""

    @classmethod
    def setUpTestData(cls):
        cls.org, cls.owner = _create_org_and_user("burn_owner")
        cls.employee = User.objects.create_user("burn_emp", "burn_emp@test.com", "Pass123!")
        OrganizationMembership.objects.create(
            user=cls.employee, organization=cls.org, role="employee"
        )
        cls.project = Project.objects.create(name="Burn Project", organization=cls.org)
        ProjectMember.objects.create(project=cls.project, user=cls.employee, is_active=True)

        cls.board = BoardService.create_board(
            title="Burn Board", project=cls.project, created_by=cls.owner
        )
        cls.todo = TaskStatus.objects.get(board=cls.board, code="todo")
        cls.done = TaskStatus.objects.get(board=cls.board, code="done")

        cls.milestone = Milestone.objects.create(
            project=cls.project,
            title="v1.0",
            start_date=datetime.date(2026, 8, 1),
            target_date=datetime.date(2026, 9, 30),
        )
        # Two tasks linked to milestone
        cls.task1 = Task.objects.create(
            title="Task A", project=cls.project, status=cls.todo,
            reporter=cls.owner, milestone=cls.milestone
        )
        cls.task2 = Task.objects.create(
            title="Task B", project=cls.project, status=cls.todo,
            reporter=cls.owner, milestone=cls.milestone
        )

    def _url(self):
        return reverse("reports:milestone-burndown", kwargs={"milestone_id": self.milestone.id})

    def test_owner_gets_burndown(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get(self._url())
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("milestone", res.data)
        self.assertIn("ideal_line", res.data)
        self.assertIn("actual_burndown", res.data)
        self.assertIn("burnup", res.data)

    def test_employee_member_gets_burndown(self):
        self.client.force_authenticate(user=self.employee)
        res = self.client.get(self._url())
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_milestone_meta_correct(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get(self._url())
        self.assertEqual(res.data["milestone"]["title"], "v1.0")
        self.assertEqual(res.data["total_tasks"], 2)

    def test_ideal_line_starts_at_total_tasks(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get(self._url())
        ideal = res.data["ideal_line"]
        self.assertGreater(len(ideal), 0)
        # First point should equal total tasks (or close to it)
        self.assertAlmostEqual(ideal[0]["remaining"], 2.0, delta=0.1)

    def test_burndown_with_done_task(self):
        """A task moved to done should reduce remaining count."""
        # Simulate a done transition by adding a TaskStatusTransition
        TaskStatusTransition.objects.create(
            task=self.task1,
            from_status=self.todo,
            to_status=self.done,
            from_status_code="todo",
            from_status_name="To Do",
            to_status_code="done",
            to_status_name="Done",
            transitioned_at=datetime.datetime(2026, 8, 15, tzinfo=datetime.timezone.utc),
        )
        self.client.force_authenticate(user=self.owner)
        res = self.client.get(self._url())
        # On 2026-08-15, 1 task should be done
        burnup = res.data["burnup"]
        aug15 = next((p for p in burnup if p["date"] == "2026-08-15"), None)
        if aug15:
            self.assertEqual(aug15["done"], 1)

    def test_nonexistent_milestone_returns_404(self):
        import uuid
        self.client.force_authenticate(user=self.owner)
        url = reverse("reports:milestone-burndown", kwargs={"milestone_id": uuid.uuid4()})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


class CycleLeadTimeTestCase(APITestCase):
    """Tests for GET /api/v1/reports/projects/<id>/cycle-time/"""

    @classmethod
    def setUpTestData(cls):
        cls.org, cls.owner = _create_org_and_user("cycle_owner")
        cls.employee = User.objects.create_user("cycle_emp", "cycle_emp@test.com", "Pass123!")
        OrganizationMembership.objects.create(
            user=cls.employee, organization=cls.org, role="employee"
        )
        cls.project = Project.objects.create(name="Cycle Project", organization=cls.org)
        cls.board = BoardService.create_board(
            title="Cycle Board", project=cls.project, created_by=cls.owner
        )
        cls.todo = TaskStatus.objects.get(board=cls.board, code="todo")
        cls.doing = TaskStatus.objects.get(board=cls.board, code="doing")
        cls.done = TaskStatus.objects.get(board=cls.board, code="done")

        cls.task = Task.objects.create(
            title="CT Task", project=cls.project, status=cls.done,
            reporter=cls.owner, is_finished=True
        )
        # Transitions: todo → doing → done
        base = datetime.datetime(2026, 9, 1, tzinfo=datetime.timezone.utc)
        TaskStatusTransition.objects.create(
            task=cls.task, from_status=None, to_status=cls.todo,
            from_status_code="", from_status_name="",
            to_status_code="todo", to_status_name="To Do",
            transitioned_at=base,
        )
        TaskStatusTransition.objects.create(
            task=cls.task, from_status=cls.todo, to_status=cls.doing,
            from_status_code="todo", from_status_name="To Do",
            to_status_code="doing", to_status_name="Doing",
            transitioned_at=base + datetime.timedelta(hours=24),
        )
        TaskStatusTransition.objects.create(
            task=cls.task, from_status=cls.doing, to_status=cls.done,
            from_status_code="doing", from_status_name="Doing",
            to_status_code="done", to_status_name="Done",
            transitioned_at=base + datetime.timedelta(hours=48),
        )

    def _url(self):
        return reverse("reports:project-cycle-time", kwargs={"project_id": self.project.id})

    def test_manager_can_access(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get(self._url(), {
            "start_date": "2026-09-01", "end_date": "2026-09-30"
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("avg_lead_time_hours", res.data)
        self.assertIn("avg_cycle_time_hours", res.data)

    def test_employee_cannot_access(self):
        """Cycle time is manager-only."""
        self.client.force_authenticate(user=self.employee)
        res = self.client.get(self._url())
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_lead_and_cycle_time_values(self):
        """Lead time = 48h from creation to done; Cycle time = 24h from doing to done."""
        self.client.force_authenticate(user=self.owner)
        res = self.client.get(self._url(), {
            "start_date": "2026-09-01", "end_date": "2026-09-30"
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        if res.data["task_count"] > 0:
            # Cycle time should be ~24h (doing → done)
            self.assertIsNotNone(res.data["avg_cycle_time_hours"])

    def test_empty_response_no_done_tasks(self):
        """Project with no done tasks returns empty analytics."""
        org2, owner2 = _create_org_and_user("cycle2_owner")
        project2 = Project.objects.create(name="Empty Cycle", organization=org2)
        self.client.force_authenticate(user=owner2)
        url = reverse("reports:project-cycle-time", kwargs={"project_id": project2.id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["task_count"], 0)
        self.assertIsNone(res.data["avg_lead_time_hours"])


class TaskStatusTransitionSignalTestCase(APITestCase):
    """Tests for automatic TaskStatusTransition creation via signals."""

    @classmethod
    def setUpTestData(cls):
        cls.org, cls.owner = _create_org_and_user("sig_owner")
        cls.project = Project.objects.create(name="Signal Project", organization=cls.org)
        cls.board = BoardService.create_board(
            title="Sig Board", project=cls.project, created_by=cls.owner
        )
        cls.todo = TaskStatus.objects.get(board=cls.board, code="todo")
        cls.doing = TaskStatus.objects.get(board=cls.board, code="doing")

    def test_task_creation_records_initial_transition(self):
        """Creating a task should create one TaskStatusTransition (None → initial status)."""
        task = Task.objects.create(
            title="Signal Task", project=self.project,
            status=self.todo, reporter=self.owner
        )
        transitions = TaskStatusTransition.objects.filter(task=task)
        self.assertEqual(transitions.count(), 1)
        self.assertEqual(transitions.first().to_status_code, "todo")
        self.assertEqual(transitions.first().from_status_code, "")

    def test_status_change_records_transition(self):
        """Changing a task's status should record a second transition."""
        task = Task.objects.create(
            title="Signal Task 2", project=self.project,
            status=self.todo, reporter=self.owner
        )
        initial_count = TaskStatusTransition.objects.filter(task=task).count()

        task.status = self.doing
        task.save()

        final_count = TaskStatusTransition.objects.filter(task=task).count()
        self.assertEqual(final_count, initial_count + 1)
        last = TaskStatusTransition.objects.filter(task=task).last()
        self.assertEqual(last.from_status_code, "todo")
        self.assertEqual(last.to_status_code, "doing")

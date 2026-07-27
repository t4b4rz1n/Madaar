from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from projects.models import Project
from tasks.models import (
    Board,
    Task,
    TaskActivityLog,
    TaskChecklistItem,
    TaskStatus,
)

User = get_user_model()


class TaskCRUDAndProgressTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="taskuser",
            email="taskuser@example.com",
            password="Password123!",
        )
        self.assignee = User.objects.create_user(
            username="assignee",
            email="assignee@example.com",
            password="Password123!",
        )

        self.project = Project.objects.create(name="Test Project", description="Desc")
        self.project2 = Project.objects.create(name="Other Project", description="Desc")

        self.client.force_authenticate(user=self.user)
        board_res = self.client.post(
            reverse("task-board-list"),
            {"title": "Main Board", "project": self.project.id},
        )
        self.board = Board.objects.get(id=board_res.data["id"])
        self.status_todo = TaskStatus.objects.get(board=self.board, code="todo")
        self.status_done = TaskStatus.objects.get(board=self.board, code="done")

    def test_create_task_and_activity_log(self):
        """Task creation should log 'Task created' in activity log."""
        res = self.client.post(
            reverse("task-list"),
            {
                "project": self.project.id,
                "title": "Build Auth API",
                "description": "Implement JWT",
                "priority": Task.Priority.HIGH,
                "assignee": self.assignee.id,
            },
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        task = Task.objects.get(id=res.data["id"])
        self.assertEqual(task.reporter, self.user)
        activities = TaskActivityLog.objects.filter(task=task)
        self.assertTrue(activities.exists())
        self.assertIn("Task created", activities.first().action)

    def test_create_subtask(self):
        """Creating a subtask should link to parent task."""
        parent = Task.objects.create(
            project=self.project,
            title="Parent Task",
            reporter=self.user,
            status=self.status_todo,
        )
        res = self.client.post(
            reverse("task-list"),
            {
                "project": self.project.id,
                "title": "Subtask 1",
                "parent_task": parent.id,
            },
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(parent.subtasks.count(), 1)

    def test_list_subtasks_endpoint(self):
        """Subtasks endpoint should return child tasks."""
        parent = Task.objects.create(
            project=self.project,
            title="Parent",
            reporter=self.user,
            status=self.status_todo,
        )
        Task.objects.create(
            project=self.project,
            title="Sub 1",
            reporter=self.user,
            status=self.status_todo,
            parent_task=parent,
        )
        url = reverse("task-subtasks", kwargs={"pk": parent.id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    def test_move_task_status_and_order(self):
        """Moving a task across statuses should update status, order, and log it."""
        task = Task.objects.create(
            project=self.project,
            title="Move Task",
            reporter=self.user,
            status=self.status_todo,
        )
        url = reverse("task-move-task", kwargs={"pk": task.id})
        res = self.client.post(
            url,
            {
                "status_id": str(self.status_done.id),
                "order": 5,
            },
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        task.refresh_from_db()
        self.assertEqual(task.status, self.status_done)
        self.assertEqual(task.order, 5)

    def test_filter_tasks_by_project(self):
        """Tasks should be filterable by project."""
        Task.objects.create(
            project=self.project,
            title="T1",
            reporter=self.user,
            status=self.status_todo,
        )
        Task.objects.create(
            project=self.project2,
            title="T2",
            reporter=self.user,
            status=self.status_todo,
        )
        res = self.client.get(reverse("task-list"), {"project": self.project.id})
        self.assertEqual(len(res.data["results"]), 1)
        self.assertEqual(res.data["results"][0]["title"], "T1")

    def test_filter_parent_only(self):
        """parent_only=true should exclude subtasks."""
        parent = Task.objects.create(
            project=self.project,
            title="Parent",
            reporter=self.user,
            status=self.status_todo,
        )
        Task.objects.create(
            project=self.project,
            title="Child",
            reporter=self.user,
            status=self.status_todo,
            parent_task=parent,
        )
        res = self.client.get(reverse("task-list"), {"parent_only": "true"})
        titles = [t["title"] for t in res.data["results"]]
        self.assertIn("Parent", titles)
        self.assertNotIn("Child", titles)

    def test_progress_checklist_only(self):
        """Task with 4 checklist items, 1 completed → 25%."""
        task = Task.objects.create(
            project=self.project,
            title="CL Progress",
            reporter=self.user,
            status=self.status_todo,
        )
        TaskChecklistItem.objects.create(task=task, description="A", is_completed=True)
        TaskChecklistItem.objects.create(task=task, description="B", is_completed=False)
        TaskChecklistItem.objects.create(task=task, description="C", is_completed=False)
        TaskChecklistItem.objects.create(task=task, description="D", is_completed=False)
        self.assertEqual(task.progress_percent, 25.0)

    def test_progress_subtask_only(self):
        """Parent with 2 subtasks: one at 100%, one at 0% → parent 50%."""
        parent = Task.objects.create(
            project=self.project,
            title="Parent",
            reporter=self.user,
            status=self.status_todo,
        )
        sub1 = Task.objects.create(
            project=self.project,
            title="Sub1",
            reporter=self.user,
            status=self.status_todo,
            parent_task=parent,
        )
        sub2 = Task.objects.create(
            project=self.project,
            title="Sub2",
            reporter=self.user,
            status=self.status_todo,
            parent_task=parent,
        )
        TaskChecklistItem.objects.create(task=sub1, description="X", is_completed=True)
        TaskChecklistItem.objects.create(task=sub1, description="Y", is_completed=True)
        self.assertEqual(sub1.progress_percent, 100.0)
        self.assertEqual(sub2.progress_percent, 0.0)
        self.assertEqual(parent.progress_percent, 50.0)

    def test_progress_mixed_checklist_and_subtasks(self):
        """Task with own checklists (50%) + subtask (100%) → (50+100)/2 = 75%."""
        parent = Task.objects.create(
            project=self.project,
            title="Mixed",
            reporter=self.user,
            status=self.status_todo,
        )
        TaskChecklistItem.objects.create(
            task=parent, description="A", is_completed=True
        )
        TaskChecklistItem.objects.create(
            task=parent, description="B", is_completed=False
        )
        sub = Task.objects.create(
            project=self.project,
            title="Sub",
            reporter=self.user,
            status=self.status_todo,
            parent_task=parent,
        )
        TaskChecklistItem.objects.create(task=sub, description="X", is_completed=True)
        self.assertEqual(parent.progress_percent, 75.0)

    def test_progress_in_api_response(self):
        """API response should include progress_percent and checklist_stats."""
        task = Task.objects.create(
            project=self.project,
            title="API Progress",
            reporter=self.user,
            status=self.status_todo,
        )
        TaskChecklistItem.objects.create(task=task, description="A", is_completed=True)
        TaskChecklistItem.objects.create(task=task, description="B", is_completed=False)

        url = reverse("task-detail", kwargs={"pk": task.id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["progress_percent"], 50.0)
        self.assertEqual(res.data["checklist_stats"]["total"], 2)
        self.assertEqual(res.data["checklist_stats"]["done"], 1)

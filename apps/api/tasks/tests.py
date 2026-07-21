from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from projects.models import Project
from tasks.models import (
    AsyncStandup,
    Board,
    BoardColumn,
    Task,
    TaskActivityLog,
    TaskChecklistItem,
    TaskComment,
    TaskStatus,
)

User = get_user_model()


class TasksModuleTestCase(APITestCase):
    def setUp(self):
        # Create test users
        self.user = User.objects.create_user(
            username="taskuser",
            email="taskuser@example.com",
            first_name="Task",
            last_name="User",
            password="Password123!",
        )
        self.assignee = User.objects.create_user(
            username="assignee",
            email="assignee@example.com",
            first_name="Assignee",
            last_name="User",
            password="Password123!",
        )

        # Create a test project
        self.project = Project.objects.create(
            name="Test Project",
            description="Project description",
        )

        # Create default task status
        self.status_todo, _ = TaskStatus.objects.get_or_create(
            code="todo", defaults={"name": "To Do", "order": 1}
        )
        self.status_done, _ = TaskStatus.objects.get_or_create(
            code="done", defaults={"name": "Done", "order": 2}
        )

        # URLs
        self.board_list_url = reverse("task-board-list")
        self.task_list_url = reverse("task-list")
        self.standup_list_url = reverse("task-standup-list")

        # Authenticate
        self.client.force_authenticate(user=self.user)

    def test_board_creation_and_auto_columns(self):
        response = self.client.post(
            self.board_list_url,
            {"title": "Sprint 1 Board", "project": self.project.id},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        board_id = response.data["id"]

        board = Board.objects.get(id=board_id)
        self.assertEqual(board.columns.count(), 4)
        column_titles = list(board.columns.values_list("title", flat=True))
        self.assertIn("To Do", column_titles)
        self.assertIn("Done", column_titles)

    def test_create_task_and_activity_log(self):
        response = self.client.post(
            self.task_list_url,
            {
                "project": self.project.id,
                "title": "Build Authentication API",
                "description": "Implement JWT endpoints",
                "priority": Task.Priority.HIGH,
                "assignee": self.assignee.id,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        task_id = response.data["id"]

        task = Task.objects.get(id=task_id)
        self.assertEqual(task.title, "Build Authentication API")
        self.assertEqual(task.reporter, self.user)
        self.assertEqual(task.assignee, self.assignee)

        # Check Activity Log
        activities = TaskActivityLog.objects.filter(task=task)
        self.assertTrue(activities.exists())
        self.assertIn("Task created", activities.first().action)

    def test_create_subtask(self):
        parent_task = Task.objects.create(
            project=self.project,
            title="Parent Task",
            reporter=self.user,
            status=self.status_todo,
        )

        response = self.client.post(
            self.task_list_url,
            {
                "project": self.project.id,
                "title": "Subtask 1",
                "parent_task": parent_task.id,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        subtask = Task.objects.get(id=response.data["id"])
        self.assertEqual(subtask.parent_task, parent_task)
        self.assertEqual(parent_task.subtasks.count(), 1)

    def test_move_task_column_and_status(self):
        board = Board.objects.create(title="Board", project=self.project, created_by=self.user)
        col1 = BoardColumn.objects.create(board=board, title="To Do", order=1)
        col2 = BoardColumn.objects.create(board=board, title="Done", order=2)

        task = Task.objects.create(
            project=self.project,
            title="Move Task",
            reporter=self.user,
            column=col1,
            status=self.status_todo,
        )

        move_url = reverse("task-move-task", kwargs={"pk": task.id})
        response = self.client.post(
            move_url,
            {
                "column_id": str(col2.id),
                "status_id": str(self.status_done.id),
                "order": 5,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        task.refresh_from_db()
        self.assertEqual(task.column, col2)
        self.assertEqual(task.status, self.status_done)
        self.assertEqual(task.order, 5)

    def test_task_checklist_workflow(self):
        task = Task.objects.create(
            project=self.project,
            title="Checklist Task",
            reporter=self.user,
            status=self.status_todo,
        )

        checklist_url = reverse("task-add-checklist-item", kwargs={"pk": task.id})
        response = self.client.post(
            checklist_url,
            {"description": "Write Unit Tests"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        item_id = response.data["id"]

        # Toggle item
        toggle_url = reverse("task-checklist-item-toggle", kwargs={"pk": item_id})
        toggle_res = self.client.post(toggle_url)
        self.assertEqual(toggle_res.status_code, status.HTTP_200_OK)

        item = TaskChecklistItem.objects.get(id=item_id)
        self.assertTrue(item.is_completed)

    def test_task_comment_creation(self):
        task = Task.objects.create(
            project=self.project,
            title="Comment Task",
            reporter=self.user,
            status=self.status_todo,
        )

        comment_url = reverse("task-add-comment", kwargs={"pk": task.id})
        response = self.client.post(
            comment_url,
            {"content": "This is a test comment."},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.assertEqual(TaskComment.objects.filter(task=task).count(), 1)

    def test_async_standup_report(self):
        response = self.client.post(
            self.standup_list_url,
            {
                "yesterday_work": "Built tasks services and serializers",
                "today_work": "Writing unit tests for tasks app",
                "blockers": "None",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        standup = AsyncStandup.objects.get(id=response.data["id"])
        self.assertEqual(standup.user, self.user)
        self.assertEqual(standup.yesterday_work, "Built tasks services and serializers")

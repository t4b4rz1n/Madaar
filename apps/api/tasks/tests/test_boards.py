from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from projects.models import Project
from tasks.models import Board, Task, TaskStatus

User = get_user_model()


class BoardAndStatusTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="boarduser",
            email="boarduser@example.com",
            password="Password123!",
        )
        self.project = Project.objects.create(name="Project 1", description="Desc")
        self.project2 = Project.objects.create(name="Project 2", description="Desc")

        self.client.force_authenticate(user=self.user)
        board_res = self.client.post(
            reverse("task-board-list"),
            {"title": "Main Board", "project": self.project.id},
        )
        self.board = Board.objects.get(id=board_res.data["id"])
        self.status_todo = TaskStatus.objects.get(board=self.board, code="todo")

    def test_board_creation_auto_statuses(self):
        """Board creation should auto-generate 4 default Kanban statuses."""
        self.assertEqual(self.board.statuses.count(), 4)
        status_names = list(self.board.statuses.values_list("name", flat=True))
        self.assertIn("To Do", status_names)
        self.assertIn("Done", status_names)

    def test_board_creation_with_description_and_color(self):
        """Board creation via API should save custom description and background_color."""
        res = self.client.post(
            reverse("task-board-list"),
            {
                "title": "Custom Board",
                "description": "Sprint board description",
                "background_color": "#10b981",
                "project": self.project.id,
            },
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["description"], "Sprint board description")
        self.assertEqual(res.data["background_color"], "#10b981")

    def test_board_filter_by_project(self):
        """Boards should be filterable by project."""
        self.client.post(
            reverse("task-board-list"),
            {"title": "Board P2", "project": self.project2.id},
        )
        res = self.client.get(reverse("task-board-list"), {"project": self.project.id})
        self.assertEqual(len(res.data["results"]), 1)
        self.assertEqual(res.data["results"][0]["title"], "Main Board")

    def test_reorder_boards(self):
        """Board reorder endpoint should update order values."""
        board2_res = self.client.post(
            reverse("task-board-list"),
            {"title": "Second Board", "project": self.project.id},
        )
        board2 = Board.objects.get(id=board2_res.data["id"])

        self.client.post(
            reverse("task-board-reorder-boards"),
            {
                "project_id": str(self.project.id),
                "orders": [
                    {"id": str(board2.id), "order": 1},
                    {"id": str(self.board.id), "order": 2},
                ],
            },
            format="json",
        )
        self.board.refresh_from_db()
        board2.refresh_from_db()
        self.assertEqual(board2.order, 1)
        self.assertEqual(self.board.order, 2)

    def test_create_custom_status(self):
        """User should be able to create custom statuses (columns) for a board."""
        res = self.client.post(
            reverse("task-status-list"),
            {"board": self.board.id, "code": "testing", "name": "Testing"},
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.board.statuses.count(), 5)

    def test_delete_unused_status(self):
        """Deleting a status with no tasks should succeed."""
        new_status = TaskStatus.objects.create(
            board=self.board, code="staging", name="Staging", order=10
        )
        url = reverse("task-status-detail", kwargs={"pk": new_status.id})
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

    def test_delete_used_status_fails(self):
        """Deleting a status that has tasks should fail with 400."""
        Task.objects.create(
            project=self.project,
            title="Block Delete",
            reporter=self.user,
            status=self.status_todo,
        )
        url = reverse("task-status-detail", kwargs={"pk": self.status_todo.id})
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reorder_statuses(self):
        """Status reorder endpoint should update order values."""
        statuses = list(self.board.statuses.values_list("id", flat=True))
        orders = [
            {"id": str(s), "order": i + 1} for i, s in enumerate(reversed(statuses))
        ]
        res = self.client.post(
            reverse("task-status-reorder"),
            {"board_id": str(self.board.id), "orders": orders},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_filter_statuses_by_board(self):
        """Statuses should be filterable by board."""
        res = self.client.get(reverse("task-status-list"), {"board": self.board.id})
        self.assertEqual(len(res.data["results"]), 4)

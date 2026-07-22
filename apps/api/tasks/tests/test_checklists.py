from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from projects.models import Project
from tasks.models import Board, Task, TaskActivityLog, TaskChecklistItem, TaskComment, TaskStatus

User = get_user_model()


class ChecklistAndCommentTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="cluser",
            email="cluser@example.com",
            password="Password123!",
        )
        self.project = Project.objects.create(name="Project CL", description="Desc")

        self.client.force_authenticate(user=self.user)
        board_res = self.client.post(
            reverse("task-board-list"),
            {"title": "Board CL", "project": self.project.id},
        )
        self.board = Board.objects.get(id=board_res.data["id"])
        self.status_todo = TaskStatus.objects.get(board=self.board, code="todo")

        self.task = Task.objects.create(
            project=self.project,
            title="CL Task",
            reporter=self.user,
            status=self.status_todo,
        )

    def test_checklist_add_toggle_delete(self):
        """Full checklist workflow: add, toggle, delete with activity logs."""
        add_url = reverse("task-add-checklist-item", kwargs={"pk": self.task.id})
        res = self.client.post(add_url, {"description": "Write Tests"})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        item_id = res.data["id"]

        toggle_url = reverse("task-checklist-item-toggle", kwargs={"pk": item_id})
        self.client.post(toggle_url)
        item = TaskChecklistItem.objects.get(id=item_id)
        self.assertTrue(item.is_completed)

        del_url = reverse("task-checklist-item-detail", kwargs={"pk": item_id})
        res = self.client.delete(del_url)
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(TaskChecklistItem.objects.filter(id=item_id).exists())

        logs = TaskActivityLog.objects.filter(task=self.task)
        actions = [log.action for log in logs]
        self.assertTrue(any("Added checklist" in a for a in actions))
        self.assertTrue(any("Deleted checklist" in a for a in actions))

    def test_comment_creation(self):
        url = reverse("task-add-comment", kwargs={"pk": self.task.id})
        res = self.client.post(url, {"content": "Test comment."})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(TaskComment.objects.filter(task=self.task).count(), 1)

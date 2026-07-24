from django.contrib.auth import get_user_model
from django.test import TestCase

from projects.models import Project
from tasks.models import Board, Task, TaskChecklistItem, TaskComment, TaskStatus

User = get_user_model()


class TaskCascadeTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com", username="testuser", password="password"
        )
        self.project = Project.objects.create(name="Test Project", owner=self.user)
        self.board = Board.objects.create(
            title="Test Board", project=self.project, created_by=self.user
        )
        self.status = TaskStatus.objects.create(
            board=self.board, code="todo", name="To Do"
        )
        self.task = Task.objects.create(
            title="Parent Task",
            project=self.project,
            status=self.status,
            reporter=self.user,
        )
        self.subtask = Task.objects.create(
            title="Subtask",
            project=self.project,
            status=self.status,
            parent_task=self.task,
            reporter=self.user,
        )
        self.checklist_item = TaskChecklistItem.objects.create(
            task=self.task, description="Check item"
        )
        self.comment = TaskComment.objects.create(
            task=self.task, author=self.user, content="Comment test"
        )

    def test_soft_delete_and_restore_board_cascade(self):
        # Soft delete board
        self.board.is_deleted = True
        self.board.save()

        # Check cascaded soft deletion
        self.status.refresh_from_db()
        self.task.refresh_from_db()
        self.subtask.refresh_from_db()
        self.checklist_item.refresh_from_db()
        self.comment.refresh_from_db()

        self.assertTrue(self.board.is_deleted)
        self.assertTrue(self.status.is_deleted)
        self.assertTrue(self.task.is_deleted)
        self.assertTrue(self.subtask.is_deleted)
        self.assertTrue(self.checklist_item.is_deleted)
        self.assertTrue(self.comment.is_deleted)

        # Restore board
        self.board.is_deleted = False
        self.board.save()

        self.status.refresh_from_db()
        self.task.refresh_from_db()
        self.subtask.refresh_from_db()
        self.checklist_item.refresh_from_db()
        self.comment.refresh_from_db()

        self.assertFalse(self.board.is_deleted)
        self.assertFalse(self.status.is_deleted)
        self.assertFalse(self.task.is_deleted)
        self.assertFalse(self.subtask.is_deleted)
        self.assertFalse(self.checklist_item.is_deleted)
        self.assertFalse(self.comment.is_deleted)

    def test_checklist_progress_cache_signal(self):
        self.assertEqual(float(self.task.progress_cache), 0.0)

        # Complete checklist item
        self.checklist_item.is_completed = True
        self.checklist_item.save()

        self.task.refresh_from_db()
        self.assertEqual(float(self.task.progress_cache), 50.0)

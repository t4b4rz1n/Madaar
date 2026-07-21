from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from projects.models import Project
from tasks.models import (
    AsyncStandup,
    Board,
    Task,
    TaskActivityLog,
    TaskChecklistItem,
    TaskComment,
    TaskStatus,
)

User = get_user_model()


class TasksModuleTestCase(APITestCase):
    def setUp(self):
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

        self.project = Project.objects.create(
            name="Test Project",
            description="Project description",
        )
        self.project2 = Project.objects.create(
            name="Other Project",
            description="Other project description",
        )

        # Create a board (auto-generates 4 default statuses acting as Kanban columns)
        self.client.force_authenticate(user=self.user)
        board_res = self.client.post(
            reverse("task-board-list"),
            {"title": "Main Board", "project": self.project.id},
        )
        self.board = Board.objects.get(id=board_res.data["id"])
        self.status_todo = TaskStatus.objects.get(board=self.board, code="todo")
        self.status_done = TaskStatus.objects.get(board=self.board, code="done")

    # ── Board Tests ─────────────────────────────────────────────
    def test_board_creation_auto_statuses(self):
        """Board creation should auto-generate 4 default Kanban statuses (columns)."""
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

    # ── Status CRUD & Reorder Tests ──────────────────────────────
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
        orders = [{"id": str(s), "order": i + 1} for i, s in enumerate(reversed(statuses))]
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

    # ── Task Tests ──────────────────────────────────────────────
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
            {"project": self.project.id, "title": "Subtask 1", "parent_task": parent.id},
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
        """Moving a task across statuses/columns should update status, order, and log it."""
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
            project=self.project, title="T1", reporter=self.user, status=self.status_todo
        )
        Task.objects.create(
            project=self.project2, title="T2", reporter=self.user, status=self.status_todo
        )
        res = self.client.get(reverse("task-list"), {"project": self.project.id})
        self.assertEqual(len(res.data["results"]), 1)
        self.assertEqual(res.data["results"][0]["title"], "T1")

    def test_filter_parent_only(self):
        """parent_only=true should exclude subtasks."""
        parent = Task.objects.create(
            project=self.project, title="Parent", reporter=self.user, status=self.status_todo
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

    # ── Checklist Tests ─────────────────────────────────────────
    def test_checklist_add_toggle_delete(self):
        """Full checklist workflow: add, toggle, delete with activity logs."""
        task = Task.objects.create(
            project=self.project,
            title="CL Task",
            reporter=self.user,
            status=self.status_todo,
        )
        # Add
        add_url = reverse("task-add-checklist-item", kwargs={"pk": task.id})
        res = self.client.post(add_url, {"description": "Write Tests"})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        item_id = res.data["id"]

        # Toggle
        toggle_url = reverse("task-checklist-item-toggle", kwargs={"pk": item_id})
        self.client.post(toggle_url)
        item = TaskChecklistItem.objects.get(id=item_id)
        self.assertTrue(item.is_completed)

        # Delete
        del_url = reverse("task-checklist-item-detail", kwargs={"pk": item_id})
        res = self.client.delete(del_url)
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(TaskChecklistItem.objects.filter(id=item_id).exists())

        # Verify logs
        logs = TaskActivityLog.objects.filter(task=task)
        actions = [log.action for log in logs]
        self.assertTrue(any("Added checklist" in a for a in actions))
        self.assertTrue(any("Deleted checklist" in a for a in actions))

    # ── Comment Tests ───────────────────────────────────────────
    def test_comment_creation(self):
        task = Task.objects.create(
            project=self.project,
            title="Comment Task",
            reporter=self.user,
            status=self.status_todo,
        )
        url = reverse("task-add-comment", kwargs={"pk": task.id})
        res = self.client.post(url, {"content": "Test comment."})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(TaskComment.objects.filter(task=task).count(), 1)

    # ── Standup Tests ───────────────────────────────────────────
    def test_standup_creation(self):
        res = self.client.post(
            reverse("task-standup-list"),
            {
                "yesterday_work": "Built services",
                "today_work": "Writing tests",
                "blockers": "None",
            },
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        standup = AsyncStandup.objects.get(id=res.data["id"])
        self.assertEqual(standup.user, self.user)

    # ── Progress Percent Tests ──────────────────────────────────
    def test_progress_checklist_only(self):
        """Task with 4 checklist items, 1 completed → 25%."""
        task = Task.objects.create(
            project=self.project, title="CL Progress", reporter=self.user, status=self.status_todo
        )
        TaskChecklistItem.objects.create(task=task, description="A", is_completed=True)
        TaskChecklistItem.objects.create(task=task, description="B", is_completed=False)
        TaskChecklistItem.objects.create(task=task, description="C", is_completed=False)
        TaskChecklistItem.objects.create(task=task, description="D", is_completed=False)
        self.assertEqual(task.progress_percent, 25.0)

    def test_progress_subtask_only(self):
        """Parent with 2 subtasks: one at 100%, one at 0% → parent 50%."""
        parent = Task.objects.create(
            project=self.project, title="Parent", reporter=self.user, status=self.status_todo
        )
        sub1 = Task.objects.create(
            project=self.project, title="Sub1", reporter=self.user, status=self.status_todo,
            parent_task=parent,
        )
        sub2 = Task.objects.create(
            project=self.project, title="Sub2", reporter=self.user, status=self.status_todo,
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
            project=self.project, title="Mixed", reporter=self.user, status=self.status_todo
        )
        TaskChecklistItem.objects.create(task=parent, description="A", is_completed=True)
        TaskChecklistItem.objects.create(task=parent, description="B", is_completed=False)
        sub = Task.objects.create(
            project=self.project, title="Sub", reporter=self.user, status=self.status_todo,
            parent_task=parent,
        )
        TaskChecklistItem.objects.create(task=sub, description="X", is_completed=True)
        self.assertEqual(parent.progress_percent, 75.0)

    def test_progress_in_api_response(self):
        """API response should include progress_percent and checklist_stats."""
        task = Task.objects.create(
            project=self.project, title="API Progress", reporter=self.user, status=self.status_todo
        )
        TaskChecklistItem.objects.create(task=task, description="A", is_completed=True)
        TaskChecklistItem.objects.create(task=task, description="B", is_completed=False)

        url = reverse("task-detail", kwargs={"pk": task.id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["progress_percent"], 50.0)
        self.assertEqual(res.data["checklist_stats"]["total"], 2)
        self.assertEqual(res.data["checklist_stats"]["done"], 1)

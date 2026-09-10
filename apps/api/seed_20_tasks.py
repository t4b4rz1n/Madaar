import os
import random
from datetime import timedelta

import django
from django.utils import timezone

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from projects.models import Project
from tasks.models import Board, Task, TaskStatus

def run_seed_tasks():
    # Only get the 3 projects we created previously
    projects = Project.objects.filter(name__in=["Project 1", "Project 2", "Project 3"])
    if not projects.exists():
        print("No target projects found. Did you run the user/project seed script?")
        return

    print(f"Found {projects.count()} projects. Seeding tasks...")

    for proj in projects:
        print(f"Adding 20 tasks to {proj.name}...")

        # Create board and statuses
        board, _ = Board.objects.get_or_create(title=f"Sprint 1 - {proj.name}", project=proj)
        status_todo, _ = TaskStatus.objects.get_or_create(board=board, code="todo", defaults={"name": "To Do", "order": 1})
        status_doing, _ = TaskStatus.objects.get_or_create(board=board, code="doing", defaults={"name": "Doing", "order": 2})
        status_done, _ = TaskStatus.objects.get_or_create(board=board, code="done", defaults={"name": "Done", "order": 3})

        statuses = [status_todo, status_doing, status_done]

        # Get project members (users)
        proj_members = [pm.user for pm in proj.members.exclude(user__isnull=True)]

        if not proj_members:
            # Fallback to owner if no members
            proj_members = [proj.owner] if proj.owner else []

        for i in range(1, 21):
            title = f"Task {i} for {proj.name}"
            status = random.choice(statuses)
            priority = random.choice(["low", "medium", "high", "critical"])
            assignee = random.choice(proj_members) if proj_members else None

            # Random deadline between 1 and 45 days from now
            due_date = timezone.now() + timedelta(days=random.randint(1, 45), hours=random.randint(0, 23))

            Task.objects.create(
                title=title,
                project=proj,
                status=status,
                priority=priority,
                assignee=assignee,
                due_date=due_date
            )

    print("Task seeding complete!")

if __name__ == "__main__":
    run_seed_tasks()

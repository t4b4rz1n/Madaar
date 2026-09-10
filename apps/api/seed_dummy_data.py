import os
import random

import django

# Setup Django if run directly
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth import get_user_model

from organizations.models import Organization, OrganizationMembership, Team, TeamMembership
from projects.models import Project, ProjectMember
from tasks.models import Board, Task, TaskStatus

User = get_user_model()

# User defined password or default
DEFAULT_PASSWORD = "Password123!"

# 1. Create 9 Users (3x previous)
user_base_names = [
    ("john", "doe"),
    ("jane", "smith"),
    ("ali", "reza"),
    ("sara", "connor"),
    ("michael", "scott"),
    ("dwight", "schrute"),
    ("jim", "halpert"),
    ("pam", "beesly"),
    ("kevin", "malone"),
]

users = []
print("Creating Users...")
for first, last in user_base_names:
    username = f"{first}_{last}"
    email = f"{first}@example.com"
    user, created = User.objects.get_or_create(
        username=username,
        defaults={"email": email, "first_name": first.capitalize(), "last_name": last.capitalize()},
    )
    if created:
        user.set_password(DEFAULT_PASSWORD)
        user.save()
    users.append(user)

for u in users:
    print(f"- Username: {u.username} | Password: {DEFAULT_PASSWORD}")

# 2. Create 6 Organizations (3x previous)
org_names = [
    "Tech Corp",
    "Design Studio",
    "Marketing Hub",
    "DevOps Ninjas",
    "AI Research",
    "Security Pros",
]
organizations = []

print("\nCreating Organizations...")
for i, name in enumerate(org_names):
    slug = name.lower().replace(" ", "-")
    owner = users[i]  # Assign first 6 users as owners
    org, _ = Organization.objects.get_or_create(name=name, slug=slug, defaults={"owner": owner})

    # Add owner
    OrganizationMembership.objects.get_or_create(user=owner, organization=org, role="owner")

    # Add 2 random employees to each org
    random_employees = random.sample([u for u in users if u != owner], 2)
    for emp in random_employees:
        OrganizationMembership.objects.get_or_create(user=emp, organization=org, role="employee")

    organizations.append(org)

# 3. Create 6 Teams (3x previous)
team_names = ["Developers", "Designers", "Marketers", "Ops Team", "Researchers", "Hackers"]
teams = []

print("Creating Teams...")
for i, name in enumerate(team_names):
    org = organizations[i]
    team, _ = Team.objects.get_or_create(name=name, organization=org)

    # Get members of this org
    org_members = [m.user for m in org.memberships.all()]
    if org_members:
        # First member is lead
        team.leader = org_members[0]
        team.save(update_fields=["leader"])
        # Add everyone to team
        for member in org_members:
            TeamMembership.objects.get_or_create(user=member, team=team)

    teams.append(team)

# 4. Create 6 Projects (3x previous)
project_names = [
    "Madaar API",
    "Website Redesign",
    "Ad Campaign",
    "Server Migration",
    "NLP Engine",
    "Pentesting",
]
projects = []

print("Creating Projects...")
for i, name in enumerate(project_names):
    org = organizations[i]
    team = teams[i]
    owner = org.owner
    proj, _ = Project.objects.get_or_create(name=name, organization=org, defaults={"owner": owner})

    ProjectMember.objects.get_or_create(project=proj, user=owner)
    ProjectMember.objects.get_or_create(project=proj, team=team)

    projects.append(proj)

# 5. Create Boards & Task Statuses
boards = []
statuses = []
print("Creating Boards and Statuses...")
for proj in projects:
    board, _ = Board.objects.get_or_create(title=f"Sprint 1 - {proj.name}", project=proj)
    status_todo, _ = TaskStatus.objects.get_or_create(
        board=board, code="todo", defaults={"name": "To Do", "order": 1}
    )
    status_doing, _ = TaskStatus.objects.get_or_create(
        board=board, code="doing", defaults={"name": "Doing", "order": 2}
    )
    status_done, _ = TaskStatus.objects.get_or_create(
        board=board, code="done", defaults={"name": "Done", "order": 3}
    )

    boards.append(board)
    statuses.append((status_todo, status_doing, status_done))

# 6. Create 12 Tasks (3x previous)
task_titles = [
    "Setup Authentication",
    "Create User Models",
    "Design Homepage",
    "Design Dashboard",
    "SEO Optimization",
    "Social Media Plan",
    "Setup CI/CD",
    "Dockerize App",
    "Train Transformer",
    "Data Cleaning",
    "Scan Vulnerabilities",
    "Fix XSS Bug",
]

print("Creating Tasks...")
for i, title in enumerate(task_titles):
    proj = projects[i // 2]  # 2 tasks per project
    proj_members = [pm.user for pm in proj.members.exclude(user__isnull=True)]
    assignee = random.choice(proj_members) if proj_members else proj.owner

    proj_statuses = statuses[i // 2]
    status = random.choice(proj_statuses)  # Random status

    Task.objects.get_or_create(
        title=title, project=proj, defaults={"status": status, "assignee": assignee}
    )

print("\nDummy data creation complete!")

import os

import django

# Setup Django if run directly
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth import get_user_model

from organizations.models import Organization, OrganizationMembership, Team, TeamMembership
from projects.models import Project, ProjectMember

User = get_user_model()
DEFAULT_PASSWORD = "Password123!"

def run_seed():
    print("Creating 15 Users...")
    users = []
    for i in range(1, 16):
        username = f"user_{i}"
        email = f"user_{i}@example.com"
        user, created = User.objects.get_or_create(
            username=username,
            defaults={"email": email, "first_name": "User", "last_name": str(i)}
        )
        if created:
            user.set_password(DEFAULT_PASSWORD)
            user.save()
        users.append(user)

    print("Creating Organization...")
    owner = users[0]
    org, _ = Organization.objects.get_or_create(
        name="Global Organization",
        slug="global-organization",
        defaults={"owner": owner}
    )

    for user in users:
        role = "owner" if user == owner else "employee"
        OrganizationMembership.objects.get_or_create(user=user, organization=org, defaults={"role": role})

    print("Creating 5 Teams...")
    teams = []
    for i in range(1, 6):
        team, _ = Team.objects.get_or_create(name=f"Team {i}", organization=org)
        teams.append(team)

    # Divide users into 5 teams (3 users per team)
    for idx, user in enumerate(users):
        team = teams[idx % 5]
        if idx < 5:
            team.leader = user
            team.save(update_fields=["leader"])
        TeamMembership.objects.get_or_create(user=user, team=team)

    print("Creating 3 Projects...")
    projects = []
    for i in range(1, 4):
        proj, _ = Project.objects.get_or_create(
            name=f"Project {i}",
            organization=org,
            defaults={"owner": owner}
        )
        projects.append(proj)

    # Divide users into 3 projects (5 users per project)
    for idx, user in enumerate(users):
        proj = projects[idx % 3]
        ProjectMember.objects.get_or_create(project=proj, user=user)

    print("Data seeded successfully!")

if __name__ == "__main__":
    run_seed()

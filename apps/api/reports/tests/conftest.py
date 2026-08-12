import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.test_settings")
import django

django.setup()
import datetime

import pytest
from django.utils import timezone

from organizations.models import OrganizationMembership, TeamMembership

from .factories import (
    AttendanceFactory,
    BoardFactory,
    OrganizationFactory,
    OrganizationMembershipFactory,
    ProjectFactory,
    ProjectMemberFactory,
    TaskFactory,
    TaskStatusFactory,
    TeamFactory,
    TeamMembershipFactory,
    TimeLogFactory,
    UserFactory,
)


@pytest.fixture
def users():
    org_owner = UserFactory(username="owner")
    team_lead = UserFactory(username="lead")
    employee1 = UserFactory(username="emp1")
    employee2 = UserFactory(username="emp2")
    loner = UserFactory(username="loner")
    return {
        "org_owner": org_owner,
        "team_lead": team_lead,
        "employee1": employee1,
        "employee2": employee2,
        "loner": loner,
    }


@pytest.fixture
def org_data(users):
    org = OrganizationFactory(owner=users["org_owner"])
    team_a = TeamFactory(organization=org)
    team_b = TeamFactory(organization=org)

    OrganizationMembershipFactory(
        user=users["org_owner"], organization=org, role=OrganizationMembership.Role.OWNER
    )
    OrganizationMembershipFactory(
        user=users["team_lead"], organization=org, role=OrganizationMembership.Role.TEAM_LEAD
    )
    OrganizationMembershipFactory(
        user=users["employee1"], organization=org, role=OrganizationMembership.Role.EMPLOYEE
    )
    OrganizationMembershipFactory(
        user=users["employee2"], organization=org, role=OrganizationMembership.Role.EMPLOYEE
    )

    TeamMembershipFactory(user=users["team_lead"], team=team_a, role=TeamMembership.Role.LEAD)
    TeamMembershipFactory(user=users["employee1"], team=team_a, role=TeamMembership.Role.MEMBER)
    TeamMembershipFactory(user=users["employee2"], team=team_b, role=TeamMembership.Role.MEMBER)

    return {
        "org": org,
        "team_a": team_a,
        "team_b": team_b,
    }


@pytest.fixture
def project_data(users, org_data):
    project = ProjectFactory(organization=org_data["org"], owner=users["org_owner"])
    ProjectMemberFactory(user=users["employee1"], project=project)

    board = BoardFactory(project=project, created_by=users["org_owner"])
    status_todo = TaskStatusFactory(board=board, name="To Do", code="todo", order=1)
    status_doing = TaskStatusFactory(board=board, name="In Progress", code="doing", order=2)
    status_done = TaskStatusFactory(board=board, name="Done", code="done", order=3)

    today = timezone.now()
    yesterday = today - datetime.timedelta(days=1)

    task1 = TaskFactory(
        project=project, assignee=users["employee1"], status=status_doing, due_date=today
    )
    task2 = TaskFactory(
        project=project, assignee=users["employee1"], status=status_todo, due_date=yesterday
    )
    task3 = TaskFactory(
        project=project, assignee=users["employee1"], status=status_done, due_date=yesterday
    )

    TimeLogFactory(
        user=users["employee1"],
        task=task1,
        project=project,
        date=today.date(),
        start_time=today,
        duration_seconds=3600,
    )
    AttendanceFactory(
        user=users["employee1"], organization=org_data["org"], date=today.date(), check_in=today
    )

    return {
        "project": project,
        "tasks": [task1, task2, task3],
    }

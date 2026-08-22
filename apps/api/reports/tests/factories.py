import datetime
from decimal import Decimal

import factory
from django.contrib.auth import get_user_model
from django.utils import timezone

from attendance.models import Attendance, TimeLog
from organizations.models import (
    Organization,
    OrganizationMembership,
    Team,
    TeamMembership,
)
from projects.models import Milestone, Project, ProjectMember
from tasks.models import Board, Task, TaskStatus

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f"user{n}")
    email = factory.LazyAttribute(lambda o: f"{o.username}@example.com")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")


class OrganizationFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Organization

    name = factory.Sequence(lambda n: f"Organization {n}")
    slug = factory.Sequence(lambda n: f"org-{n}")
    owner = factory.SubFactory(UserFactory)


class OrganizationMembershipFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = OrganizationMembership
        django_get_or_create = ("user", "organization")

    user = factory.SubFactory(UserFactory)
    organization = factory.SubFactory(OrganizationFactory)
    role = OrganizationMembership.Role.EMPLOYEE


class TeamFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Team

    name = factory.Sequence(lambda n: f"Team {n}")
    organization = factory.SubFactory(OrganizationFactory)


class TeamMembershipFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = TeamMembership

    user = factory.SubFactory(UserFactory)
    team = factory.SubFactory(TeamFactory)
    role = TeamMembership.Role.MEMBER


class ProjectFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Project

    name = factory.Sequence(lambda n: f"Project {n}")
    organization = factory.SubFactory(OrganizationFactory)
    owner = factory.SubFactory(UserFactory)
    budget = Decimal("10000.00")
    budget_currency = "USD"
    status = Project.Status.ACTIVE


class ProjectMemberFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ProjectMember

    user = factory.SubFactory(UserFactory)
    project = factory.SubFactory(ProjectFactory)
    allocation_percentage = 100


class BoardFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Board

    title = factory.Sequence(lambda n: f"Board {n}")
    project = factory.SubFactory(ProjectFactory)
    created_by = factory.SubFactory(UserFactory)


class TaskStatusFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = TaskStatus

    board = factory.SubFactory(BoardFactory)
    name = "To Do"
    code = "todo"
    order = 1


class TaskFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Task
        skip_postgeneration_save = True

    title = factory.Sequence(lambda n: f"Task {n}")
    project = factory.SubFactory(ProjectFactory)
    assignee = factory.SubFactory(UserFactory)
    status = factory.SubFactory(TaskStatusFactory)
    due_date = factory.LazyFunction(timezone.now)

    @factory.post_generation
    def set_is_finished(obj, create, extracted, **kwargs):
        if obj.status and obj.status.code == "done":
            obj.is_finished = True
            if create:
                obj.save(update_fields=["is_finished"])


class TimeLogFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = TimeLog

    user = factory.SubFactory(UserFactory)
    task = factory.SubFactory(TaskFactory)
    project = factory.SelfAttribute("task.project")
    date = factory.LazyFunction(lambda: timezone.now().date())
    start_time = factory.LazyFunction(timezone.now)
    duration_seconds = 3600
    is_active = False


class AttendanceFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Attendance

    user = factory.SubFactory(UserFactory)
    organization = factory.SubFactory(OrganizationFactory)
    date = factory.LazyFunction(lambda: timezone.now().date())
    check_in = factory.LazyFunction(timezone.now)


class MilestoneFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Milestone

    title = factory.Sequence(lambda n: f"Milestone {n}")
    project = factory.SubFactory(ProjectFactory)
    target_date = factory.LazyFunction(lambda: timezone.now().date() + datetime.timedelta(days=7))
    status = Milestone.Status.PENDING


class AttendanceSettingFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = "attendance.AttendanceSetting"

    organization = factory.SubFactory(OrganizationFactory)
    expected_daily_hours = 8.00


class TimeOffRequestFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = "attendance.TimeOffRequest"

    user = factory.SubFactory(UserFactory)
    organization = factory.SubFactory(OrganizationFactory)
    request_type = "vacation"
    start_datetime = factory.LazyFunction(timezone.now)
    end_datetime = factory.LazyFunction(lambda: timezone.now() + datetime.timedelta(hours=8))
    status = "pending"

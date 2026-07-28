from django.test import TestCase
from django.contrib.auth import get_user_model
from organizations.models import Organization, OrganizationMembership, Team, TeamMembership
from projects.models import Project
from tasks.models import Task
from attendance.models import Attendance, TimeLog, TimeOffRequest, Holiday, AttendanceSetting

User = get_user_model()

class AttendanceBaseTestCase(TestCase):
    def setUp(self):
        # Create users
        self.owner = User.objects.create_user(username="owner", email="owner@example.com", password="password")
        self.admin = User.objects.create_user(username="admin", email="admin@example.com", password="password")
        self.lead = User.objects.create_user(username="lead", email="lead@example.com", password="password")
        self.employee = User.objects.create_user(username="employee", email="employee@example.com", password="password")
        self.other_employee = User.objects.create_user(username="other", email="other@example.com", password="password")

        # Create Organization
        self.org = Organization.objects.create(name="Test Org", slug="test-org")
        self.other_org = Organization.objects.create(name="Other Org", slug="other-org")

        # Memberships
        OrganizationMembership.objects.create(user=self.owner, organization=self.org, role="owner")
        OrganizationMembership.objects.create(user=self.admin, organization=self.org, role="admin")
        OrganizationMembership.objects.create(user=self.lead, organization=self.org, role="employee")
        OrganizationMembership.objects.create(user=self.employee, organization=self.org, role="employee")
        OrganizationMembership.objects.create(user=self.other_employee, organization=self.other_org, role="employee")

        # Teams
        self.team = Team.objects.create(name="Dev Team", organization=self.org)
        TeamMembership.objects.create(user=self.lead, team=self.team, role="lead")
        TeamMembership.objects.create(user=self.employee, team=self.team, role="member")

        # Projects and Tasks
        self.project = Project.objects.create(name="Test Project", organization=self.org, owner=self.owner)
        self.task = Task.objects.create(title="Test Task", project=self.project, assignee=self.employee, reporter=self.lead)

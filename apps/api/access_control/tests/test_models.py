from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase

from access_control.models import Permission, Role
from organizations.models import Organization, OrganizationMembership, Team, TeamMembership

User = get_user_model()


class AccessControlModelsTestCase(TestCase):
    def setUp(self):
        self.organization = Organization.objects.create(name="Org", slug="org")
        self.other_organization = Organization.objects.create(name="Other", slug="other")
        self.permission = Permission.objects.create(
            code="users.view_user", name="View User", module="users", group="Users"
        )

    def test_role_codes_are_unique_per_organization(self):
        first = Role.objects.create(
            organization=self.organization, name="Engineer", code="engineer"
        )
        second = Role.objects.create(
            organization=self.other_organization, name="Engineer", code="engineer"
        )
        self.assertNotEqual(first.pk, second.pk)

    def test_membership_role_must_belong_to_its_organization(self):
        user = User.objects.create_user(
            username="user", email="user@test.com", password="Password123!"
        )
        foreign_role = Role.objects.create(
            organization=self.other_organization, name="Engineer", code="engineer"
        )
        membership = OrganizationMembership(
            user=user, organization=self.organization, role=foreign_role
        )
        with self.assertRaises(ValidationError):
            membership.full_clean()

    def test_role_deletion_is_forbidden(self):
        role = Role.objects.create(organization=self.organization, name="Engineer", code="engineer")
        with self.assertRaises(ValidationError):
            role.delete()

    def test_team_membership_requires_team_scoped_role_and_org_membership(self):
        user = User.objects.create_user(
            username="team-user", email="team-user@test.com", password="Password123!"
        )
        team = Team.objects.create(organization=self.organization, name="Engineering")
        organization_role = Role.objects.create(
            organization=self.organization,
            name="Employee",
            code="employee",
            assignment_scope=Role.AssignmentScope.ORGANIZATION,
        )
        team_role = Role.objects.create(
            organization=self.organization,
            name="Member",
            code="member",
            assignment_scope=Role.AssignmentScope.TEAM,
        )

        membership = TeamMembership(user=user, team=team, role=organization_role)
        with self.assertRaises(ValidationError):
            membership.full_clean()

        membership.role = team_role
        with self.assertRaises(ValidationError):
            membership.full_clean()

        OrganizationMembership.objects.create(
            user=user,
            organization=self.organization,
            role=organization_role,
        )
        membership.full_clean()

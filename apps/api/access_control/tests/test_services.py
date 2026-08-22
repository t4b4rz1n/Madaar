from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase

from access_control.models import Permission, Role
from access_control.services import (
    create_role,
    disable_role,
    get_user_effective_permissions,
    get_user_permission_breakdown,
    has_permission,
    seed_default_roles_and_permissions,
    update_role,
)
from organizations.models import Organization, OrganizationMembership

User = get_user_model()


class AccessControlServicesTestCase(TestCase):
    def setUp(self):
        self.organization = Organization.objects.create(name="Org", slug="org")
        self.other_organization = Organization.objects.create(name="Other", slug="other")
        seed_default_roles_and_permissions(self.organization)
        seed_default_roles_and_permissions(self.other_organization)
        self.user = User.objects.create_user(
            username="ali", email="ali@example.com", password="Password123!"
        )
        self.employee = Role.objects.get(organization=self.organization, code="employee")
        OrganizationMembership.objects.create(
            user=self.user, organization=self.organization, role=self.employee
        )

    def test_permissions_come_only_from_organization_membership_role(self):
        self.assertTrue(has_permission(self.user, "users.view_user", self.organization.id))
        self.assertFalse(has_permission(self.user, "users.view_user", self.other_organization.id))

        update_role(self.employee, permission_codes=["users.create_user"])
        self.assertTrue(has_permission(self.user, "users.create_user", self.organization.id))
        self.assertFalse(has_permission(self.user, "users.view_user", self.organization.id))

    def test_effective_permission_breakdown_has_one_membership_role(self):
        breakdown = get_user_permission_breakdown(self.user, self.organization.id)
        self.assertEqual(breakdown["roles"][0]["role_code"], "employee")
        self.assertIn("users.view_user", breakdown["effective_permissions"])

    def test_disabling_role_removes_membership_access(self):
        disable_role(self.employee)
        self.assertEqual(get_user_effective_permissions(self.user, self.organization.id), set())

    def test_seed_syncs_system_role_permissions(self):
        permission = Permission.objects.get(code="users.view_user")
        self.employee.permissions.remove(permission)
        seed_default_roles_and_permissions(self.organization)
        self.employee.refresh_from_db()
        self.assertTrue(self.employee.permissions.filter(pk=permission.pk).exists())

    def test_seed_creates_team_scoped_roles(self):
        member = Role.objects.get(organization=self.organization, code="member")
        lead = Role.objects.get(organization=self.organization, code="lead")

        self.assertEqual(member.assignment_scope, Role.AssignmentScope.TEAM)
        self.assertEqual(lead.assignment_scope, Role.AssignmentScope.TEAM)
        self.assertTrue(member.permissions.filter(code="team_members.view").exists())
        self.assertTrue(lead.permissions.filter(code="team_members.change_role").exists())

    def test_unknown_permission_codes_are_rejected(self):
        with self.assertRaises(ValidationError):
            create_role(
                organization=self.organization,
                name="Invalid",
                code="invalid",
                permission_codes=["does.not.exist"],
            )

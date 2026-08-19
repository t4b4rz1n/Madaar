from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.test import RequestFactory, TestCase
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory

from access_control.models import Role
from access_control.permissions import HasPermission, permission_required, set_resolver
from access_control.services import seed_default_roles_and_permissions, update_role
from organizations.models import Organization, OrganizationMembership, Team, TeamMembership
from organizations.permissions import OrganizationPermissions, TeamMemberPermissions
from organizations.permissions.bootstrap import get_organization_resolver

User = get_user_model()


class DatabaseRbacTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="admin", email="admin@test.com", password="123456"
        )
        self.organization = Organization.objects.create(
            name="Test Organization", slug="test-organization"
        )
        seed_default_roles_and_permissions(self.organization)
        self.admin_role = Role.objects.get(organization=self.organization, code="admin")
        self.employee_role = Role.objects.get(organization=self.organization, code="employee")
        self.membership = OrganizationMembership.objects.create(
            user=self.user,
            organization=self.organization,
            role=self.admin_role,
        )
        self.resolver = get_organization_resolver()
        set_resolver(self.resolver)

    def test_organization_role_is_resolved_from_database(self):
        self.assertTrue(
            self.resolver.has_permission(
                self.user,
                OrganizationPermissions.DELETE,
                {"organization_id": self.organization.id},
            )
        )

    def test_role_permission_changes_apply_live(self):
        self.membership.role = self.employee_role
        self.membership.save(update_fields=["role"])
        self.assertFalse(
            self.resolver.has_permission(
                self.user,
                OrganizationPermissions.UPDATE,
                {"organization_id": self.organization.id},
            )
        )

        update_role(
            self.employee_role,
            permission_codes=[OrganizationPermissions.VIEW, OrganizationPermissions.UPDATE],
        )
        self.assertTrue(
            self.resolver.has_permission(
                self.user,
                OrganizationPermissions.UPDATE,
                {"organization_id": self.organization.id},
            )
        )

    def test_unknown_permission_is_denied(self):
        self.assertFalse(
            self.resolver.has_permission(
                self.user,
                "unknown.permission",
                {"organization_id": self.organization.id},
            )
        )

    def test_unauthenticated_user_is_denied(self):
        self.assertFalse(
            self.resolver.has_permission(
                AnonymousUser(),
                OrganizationPermissions.VIEW,
                {"organization_id": self.organization.id},
            )
        )

    def test_team_role_permissions_are_limited_to_requested_team(self):
        self.membership.role = self.employee_role
        self.membership.save(update_fields=["role"])
        team = Team.objects.create(organization=self.organization, name="Backend")
        other_team = Team.objects.create(organization=self.organization, name="Frontend")
        lead_role = Role.objects.get(
            organization=self.organization,
            code="lead",
            assignment_scope=Role.AssignmentScope.TEAM,
        )
        TeamMembership.objects.create(user=self.user, team=team, role=lead_role)

        self.assertTrue(
            self.resolver.has_permission(
                self.user,
                TeamMemberPermissions.CHANGE_ROLE,
                {"organization_id": self.organization.id, "team_id": team.id},
            )
        )
        self.assertFalse(
            self.resolver.has_permission(
                self.user,
                TeamMemberPermissions.CHANGE_ROLE,
                {"organization_id": self.organization.id, "team_id": other_team.id},
            )
        )


class PermissionIntegrationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="employee", email="employee@test.com", password="123456"
        )
        self.organization = Organization.objects.create(name="Org", slug="org")
        seed_default_roles_and_permissions(self.organization)
        employee = Role.objects.get(organization=self.organization, code="employee")
        OrganizationMembership.objects.create(
            user=self.user,
            organization=self.organization,
            role=employee,
        )
        set_resolver(get_organization_resolver())

    def test_drf_permission_uses_view_organization_context(self):
        request = APIRequestFactory().get("/")
        request.user = self.user
        view = type("View", (), {"required_permission": OrganizationPermissions.VIEW})()
        view.kwargs = {"organization_id": self.organization.id}
        self.assertTrue(HasPermission().has_permission(request, view))

    def test_decorator_uses_database_roles(self):
        @permission_required(OrganizationPermissions.VIEW)
        def view(request, *args, **kwargs):
            return Response({"success": True})

        request = RequestFactory().get("/")
        request.user = self.user
        response = view(request, organization_id=self.organization.id)
        self.assertEqual(response.status_code, 200)

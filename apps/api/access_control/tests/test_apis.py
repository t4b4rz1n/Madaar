from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from access_control.models import Role
from access_control.services import seed_default_roles_and_permissions
from organizations.models import Organization, OrganizationMembership

User = get_user_model()


class AccessControlAPITestCase(APITestCase):
    def setUp(self):
        self.organization = Organization.objects.create(name="Org", slug="org")
        self.other_organization = Organization.objects.create(name="Other", slug="other")
        seed_default_roles_and_permissions(self.organization)
        seed_default_roles_and_permissions(self.other_organization)
        self.admin = User.objects.create_user(
            username="admin", email="admin@example.com", password="Password123!"
        )
        self.member = User.objects.create_user(
            username="member", email="member@example.com", password="Password123!"
        )
        admin_role = Role.objects.get(organization=self.organization, code="admin")
        employee_role = Role.objects.get(organization=self.organization, code="employee")
        OrganizationMembership.objects.create(
            user=self.admin, organization=self.organization, role=admin_role
        )
        OrganizationMembership.objects.create(
            user=self.member, organization=self.organization, role=employee_role
        )
        self.client.force_authenticate(user=self.admin)

    def test_role_api_is_organization_scoped(self):
        url = reverse(
            "access_control:role-list-create",
            kwargs={"organization_id": self.organization.id},
        )
        response = self.client.post(
            url,
            {
                "name": "Frontend A",
                "code": "frontend",
                "permission_codes": ["users.view_user"],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(response.data["organization"]), str(self.organization.id))
        self.assertFalse(
            Role.objects.filter(organization=self.other_organization, code="frontend").exists()
        )

    def test_role_change_updates_member_access_live(self):
        role = Role.objects.get(organization=self.organization, code="employee")
        role_url = reverse(
            "access_control:role-detail-update",
            kwargs={"organization_id": self.organization.id, "pk": role.id},
        )
        response = self.client.patch(
            role_url, {"permission_codes": ["users.create_user"]}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        effective_url = reverse(
            "access_control:member-effective-permissions",
            kwargs={"organization_id": self.organization.id, "user_id": self.member.id},
        )
        response = self.client.get(effective_url)
        self.assertIn("users.create_user", response.data["effective_permissions"])
        self.assertNotIn("users.view_user", response.data["effective_permissions"])

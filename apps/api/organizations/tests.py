from django.test import TestCase


class OrganizationPermissionTests(TestCase):
    """Test organization creation permissions."""

    def setUp(self):
        from accounts.models import User

        # Regular employee user
        self.employee = User.objects.create_user(
            username="employee", email="employee@test.com", password="pass123"
        )

        self.staff = User.objects.create_user(
            username="staff", email="staff@test.com", password="pass123", is_staff=True
        )

        from organizations.models import Organization, OrganizationMembership

        self.org = Organization.objects.create(name="Test Org", slug="test-org", owner=self.staff)
        OrganizationMembership.objects.create(
            user=self.employee, organization=self.org, role=OrganizationMembership.Role.EMPLOYEE
        )

    def test_employee_cannot_create_organization(self):
        """Regular employees should NOT be able to create organizations."""
        from rest_framework.test import APIClient

        client = APIClient()
        client.force_authenticate(user=self.employee)

        response = client.post(
            "/api/v1/organizations/",
            {"name": "Test Org 2", "slug": "test-org-2", "description": "Test"},
            format="json",
        )

        # Should be denied
        self.assertEqual(response.status_code, 403)
        self.assertIn("permission", str(response.data).lower())

    def test_staff_can_create_organization(self):
        """Staff users should be able to create organizations."""
        from rest_framework.test import APIClient

        client = APIClient()
        client.force_authenticate(user=self.staff)

        response = client.post(
            "/api/v1/organizations/",
            {"name": "Test Org 3", "slug": "test-org-3", "description": "Test"},
            format="json",
        )

        # Should succeed
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["name"], "Test Org 3")

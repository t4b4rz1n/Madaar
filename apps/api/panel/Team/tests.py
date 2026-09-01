from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from organizations.models import Organization, Team

User = get_user_model()


class PanelTeamTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="teamuser",
            email="teamuser@example.com",
            password="Strongpassword123",
        )
        self.org = Organization.objects.create(name="Test Org", slug="test-org", owner=self.user)
        self.team = Team.objects.create(name="Backend Devs", organization=self.org)
        self.client.force_authenticate(user=self.user)

    def test_list_teams_success(self):
        url = reverse("staff-teams-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        json_data = response.json()
        self.assertTrue(json_data["status"])
        self.assertIn("results", json_data["data"])
        self.assertEqual(json_data["data"]["results"][0]["name"], self.team.name)

    def test_create_team(self):
        url = reverse("staff-teams-list")
        payload = {
            "name": "Frontend Devs",
            "description": "React & UI Team",
            "organization": str(self.org.id),
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Team.objects.filter(name="Frontend Devs").exists())

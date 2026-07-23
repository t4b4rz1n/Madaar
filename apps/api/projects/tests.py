import datetime

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from organizations.models import Organization, OrganizationMembership, Team
from projects.models import Milestone, Project, ProjectActivity, ProjectMember
from projects.services import MilestoneService, ProjectMemberService, ProjectService

User = get_user_model()


class ProjectModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="owner@example.com",
            username="owner",
            first_name="Project",
            last_name="Owner",
            password="password123",
        )
        self.org = Organization.objects.create(
            name="Test Org", slug="test-org", owner=self.user
        )
        self.team = Team.objects.create(name="Dev Team", organization=self.org)

    def test_project_str_and_creation(self):
        project = Project.objects.create(
            name="Alpha Project",
            organization=self.org,
            owner=self.user,
            team=self.team,
        )
        self.assertEqual(str(project), "Alpha Project")
        self.assertEqual(project.status, Project.Status.DRAFT)

    def test_project_member_str_handles_user_and_team_and_none(self):
        project = Project.objects.create(name="Beta Project", organization=self.org)

        # User member
        member1 = ProjectMember.objects.create(
            project=project, user=self.user, allocation_percentage=80
        )
        self.assertIn("Beta Project", str(member1))
        self.assertIn("owner@example.com", str(member1))

        # Team member (user is None)
        member2 = ProjectMember.objects.create(
            project=project, team=self.team, allocation_percentage=50
        )
        self.assertIn("Beta Project", str(member2))
        self.assertIn("Dev Team", str(member2))

        # Member without user or team or project (unassigned edge case)
        empty_member = ProjectMember(allocation_percentage=10)
        self.assertIn("No project", str(empty_member))
        self.assertIn("Unassigned", str(empty_member))

    def test_milestone_str(self):
        project = Project.objects.create(name="Gamma Project", organization=self.org)
        milestone = Milestone.objects.create(
            project=project, title="Phase 1", target_date=datetime.date.today()
        )
        self.assertEqual(str(milestone), "Gamma Project – Phase 1")


class ProjectServicesTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="admin@example.com",
            username="admin",
            first_name="Admin",
            last_name="User",
            password="password123",
        )
        self.org = Organization.objects.create(
            name="Service Org", slug="service-org", owner=self.user
        )

    def test_project_service_lifecycle_and_activities(self):
        # Create
        project = ProjectService.create(
            actor=self.user,
            validated_data={
                "name": "Service Project",
                "organization": self.org,
                "owner": self.user,
            },
        )
        self.assertEqual(project.name, "Service Project")
        self.assertTrue(hasattr(project, "member_count"))
        self.assertTrue(hasattr(project, "task_count"))

        # Check creation activity
        act = ProjectActivity.objects.get(
            project=project, event_type=ProjectActivity.EventType.PROJECT_CREATED
        )
        self.assertEqual(act.actor, self.user)

        # Update to completed
        updated = ProjectService.update(
            project=project,
            actor=self.user,
            validated_data={"status": Project.Status.COMPLETED},
        )
        self.assertEqual(updated.status, Project.Status.COMPLETED)
        self.assertIsNotNone(updated.completed_at)

        # Delete
        ProjectService.delete(project=project, actor=self.user)
        project.refresh_from_db()
        self.assertTrue(project.is_deleted)

        # Check deletion activity was logged
        delete_act = ProjectActivity.objects.get(
            project=project, event_type=ProjectActivity.EventType.PROJECT_DELETED
        )
        self.assertEqual(delete_act.actor, self.user)

    def test_member_and_milestone_services(self):
        project = ProjectService.create(
            actor=self.user,
            validated_data={"name": "Sub Service Proj", "organization": self.org},
        )

        # Add member
        member = ProjectMemberService.add(
            project=project,
            actor=self.user,
            validated_data={"user": self.user, "allocation_percentage": 100},
        )
        self.assertEqual(member.user, self.user)
        self.assertIsNotNone(member.user.email)

        # Update member
        updated_member = ProjectMemberService.update(
            member=member,
            actor=self.user,
            validated_data={"allocation_percentage": 50},
        )
        self.assertEqual(updated_member.allocation_percentage, 50)

        # Create milestone
        milestone = MilestoneService.create(
            project=project,
            actor=self.user,
            validated_data={
                "title": "M1",
                "target_date": datetime.date.today() + datetime.timedelta(days=10),
            },
        )
        self.assertEqual(milestone.title, "M1")
        self.assertTrue(hasattr(milestone, "task_count"))

        # Delete milestone
        MilestoneService.delete(milestone=milestone, actor=self.user)
        milestone.refresh_from_db()
        self.assertTrue(milestone.is_deleted)
        self.assertTrue(
            ProjectActivity.objects.filter(
                project=project, event_type=ProjectActivity.EventType.MILESTONE_DELETED
            ).exists()
        )


class ProjectAPITests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@madaar.io",
            username="admin_user",
            first_name="Admin",
            last_name="Madaar",
            password="Password123!",
            is_staff=True,
        )
        self.member_user = User.objects.create_user(
            email="member@madaar.io",
            username="member_user",
            first_name="Member",
            last_name="User",
            password="Password123!",
        )
        self.outside_user = User.objects.create_user(
            email="outside@madaar.io",
            username="outside_user",
            first_name="Outside",
            last_name="User",
            password="Password123!",
        )

        self.org = Organization.objects.create(
            name="Madaar Org", slug="madaar-org", owner=self.admin
        )
        OrganizationMembership.objects.create(
            user=self.admin,
            organization=self.org,
            role=OrganizationMembership.Role.OWNER,
        )
        OrganizationMembership.objects.create(
            user=self.member_user,
            organization=self.org,
            role=OrganizationMembership.Role.EMPLOYEE,
        )

        self.project = ProjectService.create(
            actor=self.admin,
            validated_data={
                "name": "Madaar Core",
                "organization": self.org,
                "owner": self.admin,
                "status": Project.Status.ACTIVE,
            },
        )

    def test_list_projects(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/v1/projects/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_project_api(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            "name": "New Web App",
            "description": "Next.js + Django",
            "organization_id": str(self.org.id),
            "status": "draft",
        }
        response = self.client.post("/api/v1/projects/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "New Web App")

    def test_add_duplicate_member_returns_field_error(self):
        self.client.force_authenticate(user=self.admin)

        # First addition
        url = f"/api/v1/projects/{self.project.id}/members/"
        payload = {"user_id": str(self.member_user.id), "allocation_percentage": 100}
        resp1 = self.client.post(url, payload, format="json")
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)

        # Duplicate addition
        resp2 = self.client.post(url, payload, format="json")
        self.assertEqual(resp2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_member_without_user_or_team_returns_field_error(self):
        self.client.force_authenticate(user=self.admin)
        url = f"/api/v1/projects/{self.project.id}/members/"
        payload = {"allocation_percentage": 100}
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("user_id", response.data)

    def test_milestone_crud_api(self):
        self.client.force_authenticate(user=self.admin)
        url = f"/api/v1/projects/{self.project.id}/milestones/"
        payload = {
            "title": "MVP Launch",
            "target_date": str(datetime.date.today() + datetime.timedelta(days=30)),
        }
        create_resp = self.client.post(url, payload, format="json")
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        milestone_id = create_resp.data["id"]

        # List
        list_resp = self.client.get(url)
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)

        # Delete
        del_resp = self.client.delete(f"{url}{milestone_id}/")
        self.assertEqual(del_resp.status_code, status.HTTP_204_NO_CONTENT)

    def test_activity_feed_api(self):
        self.client.force_authenticate(user=self.admin)
        url = f"/api/v1/projects/{self.project.id}/activities/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

@pytest.fixture
def api_client():
    return APIClient()

@pytest.mark.django_db
class TestEmployeeDashboardAPI:
    def test_employee_dashboard_access(self, api_client, users, project_data):
        url = reverse("reports:employee-dashboard")

        # Unauthenticated
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

        # User not in any org
        api_client.force_authenticate(user=users["loner"])
        response = api_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

        # Employee in org
        api_client.force_authenticate(user=users["employee1"])
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_employee_dashboard_content(self, api_client, users, project_data):
        url = reverse("reports:employee-dashboard")
        api_client.force_authenticate(user=users["employee1"])
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK

        data = response.json()["data"]

        assert len(data["today_tasks"]) == 1
        assert data["today_tasks"][0]["id"] == str(project_data["tasks"][0].id)

        assert len(data["overdue_tasks"]) == 1
        assert data["overdue_tasks"][0]["id"] == str(project_data["tasks"][1].id)

        assert data["weekly_time"]["total_seconds"] == 3600

        assert len(data["active_projects"]) == 1
        assert data["active_projects"][0]["project__name"] == project_data["project"].name

        assert data["attendance_today"] is not None
        assert data["attendance_today"]["organization__name"] == project_data["project"].organization.name

    def test_employee_dashboard_soft_delete(self, api_client, users, project_data):
        url = reverse("reports:employee-dashboard")
        api_client.force_authenticate(user=users["employee1"])
        
        project = project_data["project"]
        project.is_deleted = True
        project.save()
        
        response = api_client.get(url)
        data = response.json()["data"]
        
        assert len(data["today_tasks"]) == 0
        assert len(data["overdue_tasks"]) == 0
        assert data["weekly_time"]["total_seconds"] == 0
        assert len(data["active_projects"]) == 0

@pytest.mark.django_db
class TestManagerDashboardAPI:
    def test_manager_dashboard_access(self, api_client, users, org_data):
        url = reverse("reports:manager-dashboard")

        # Employee should not have access
        api_client.force_authenticate(user=users["employee1"])
        response = api_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

        # Team lead should have access to their team
        api_client.force_authenticate(user=users["team_lead"])
        response = api_client.get(url, {"team_id": str(org_data["team_a"].id)})
        assert response.status_code == status.HTTP_200_OK

        # Team lead should NOT have access to another team
        response = api_client.get(url, {"team_id": str(org_data["team_b"].id)})
        assert response.status_code == status.HTTP_403_FORBIDDEN

        # Org admin should have access to any team
        api_client.force_authenticate(user=users["org_owner"])
        response = api_client.get(url, {"team_id": str(org_data["team_b"].id)})
        assert response.status_code == status.HTTP_200_OK

    def test_manager_dashboard_content(self, api_client, users, org_data, project_data):
        url = reverse("reports:manager-dashboard")
        api_client.force_authenticate(user=users["team_lead"])
        response = api_client.get(url, {"team_id": str(org_data["team_a"].id)})

        data = response.json()["data"]
        assert data["team_member_count"] == 2

        stats = {item["status__code"]: item["count"] for item in data["task_stats"]}
        assert stats.get("todo", 0) == 1
        assert stats.get("in_progress", 0) == 1
        assert stats.get("done", 0) == 1

        assert data["overdue_summary"]["total_overdue"] == 1

    def test_manager_members_detail(self, api_client, users, org_data, project_data):
        url = reverse("reports:manager-members")
        api_client.force_authenticate(user=users["team_lead"])
        response = api_client.get(url, {"team_id": str(org_data["team_a"].id)})
        assert response.status_code == status.HTTP_200_OK

        data = response.json()["data"]
        assert len(data) == 2

        emp1_data = next(m for m in data if m["id"] == str(users["employee1"].id))
        assert emp1_data["total_tasks"] == 3
        assert emp1_data["done_tasks"] == 1
        assert emp1_data["overdue_tasks"] == 1
        assert emp1_data["week_seconds"] == 3600

    def test_manager_dashboard_soft_delete(self, api_client, users, org_data, project_data):
        url = reverse("reports:manager-dashboard")
        api_client.force_authenticate(user=users["team_lead"])
        
        project = project_data["project"]
        project.is_deleted = True
        project.save()
        
        response = api_client.get(url, {"team_id": str(org_data["team_a"].id)})
        data = response.json()["data"]
        
        stats = {item["status__code"]: item["count"] for item in data["task_stats"]}
        assert stats.get("todo", 0) == 0
        assert stats.get("in_progress", 0) == 0
        assert stats.get("done", 0) == 0
        assert data["overdue_summary"]["total_overdue"] == 0
        
        url_members = reverse("reports:manager-members")
        response_members = api_client.get(url_members, {"team_id": str(org_data["team_a"].id)})
        data_members = response_members.json()["data"]
        emp1_data = next(m for m in data_members if m["id"] == str(users["employee1"].id))
        assert emp1_data["total_tasks"] == 0
        assert emp1_data["done_tasks"] == 0
        assert emp1_data["overdue_tasks"] == 0
        assert emp1_data["week_seconds"] in (0, None)

@pytest.mark.django_db
class TestExecutiveDashboardAPI:
    def test_executive_dashboard_access(self, api_client, users, org_data):
        url = reverse("reports:executive-dashboard")

        # Team lead should not have access
        api_client.force_authenticate(user=users["team_lead"])
        response = api_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

        # Org admin should have access
        api_client.force_authenticate(user=users["org_owner"])
        response = api_client.get(url)  # Should auto-select the org
        assert response.status_code == status.HTTP_200_OK

    def test_executive_dashboard_content(self, api_client, users, org_data, project_data):
        url = reverse("reports:executive-dashboard")
        api_client.force_authenticate(user=users["org_owner"])
        response = api_client.get(url, {"org_id": str(org_data["org"].id)})
        assert response.status_code == status.HTTP_200_OK

        data = response.json()["data"]

        # Overview
        overview = data["company_overview"]
        assert overview["total_members"] == 4
        assert overview["projects"]["total"] == 1
        assert overview["tasks"]["total"] == 3
        assert overview["tasks"]["done"] == 1

        # Financial
        financial = data["financial_summary"]
        assert float(financial["total_budget"]) == 10000.0

    def test_executive_dashboard_soft_delete(self, api_client, users, org_data, project_data):
        url = reverse("reports:executive-dashboard")
        api_client.force_authenticate(user=users["org_owner"])
        
        project = project_data["project"]
        project.is_deleted = True
        project.save()

        response = api_client.get(url, {"org_id": str(org_data["org"].id)})
        data = response.json()["data"]
        overview = data["company_overview"]

        assert overview["projects"]["total"] == 0
        assert overview["tasks"]["total"] == 0
        assert overview["tasks"]["done"] == 0

        financial = data["financial_summary"]
        assert float(financial["total_budget"]) == 0.0

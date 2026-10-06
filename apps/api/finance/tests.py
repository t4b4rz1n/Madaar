from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.test import TestCase

from finance.views import _get_user_org
from organizations.models import Organization, OrganizationMembership
from projects.models import Project, ProjectMember


class FinanceOrganizationSelectionTests(TestCase):
    def test_prefers_org_with_project_but_respects_requested_membership(self):
        user = get_user_model().objects.create_user(
            username="finance-org-user", email="finance@example.com", password="password"
        )
        empty_org = Organization.objects.create(name="Empty", slug="finance-empty", owner=user)
        project_org = Organization.objects.create(
            name="Project", slug="finance-project", owner=user
        )
        outsider_org = Organization.objects.create(name="Outsider", slug="finance-outsider")
        for organization in (empty_org, project_org):
            OrganizationMembership.objects.get_or_create(user=user, organization=organization)
        project = Project.objects.create(organization=project_org, name="Work", owner=user)
        ProjectMember.objects.create(project=project, user=user)

        request = SimpleNamespace(user=user, query_params={}, headers={})
        self.assertEqual(_get_user_org(request)[1], project_org)

        request.query_params = {"organization_id": str(empty_org.id)}
        self.assertEqual(_get_user_org(request)[1], empty_org)

        request.query_params = {"organization_id": str(outsider_org.id)}
        self.assertIsNone(_get_user_org(request)[1])

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import WorkStyleProfile
from automations.catalog import AUTOMATION_EVENT_CATALOG, Recipient
from automations.models import AutomationRule
from automations.rules import process_rules_for_event
from organizations.models import Organization
from projects.models import Project

User = get_user_model()


class AutomationCatalogApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="owner@example.com",
            username="owner",
            first_name="Project",
            last_name="Owner",
            password="password123",
        )
        self.organization = Organization.objects.create(
            name="Automation Org", slug="automation-org", owner=self.owner
        )
        self.project = Project.objects.create(
            name="Automation Project", organization=self.organization, owner=self.owner
        )
        self.client.force_authenticate(self.owner)

    def test_catalog_exposes_all_supported_events_with_defaults(self):
        response = self.client.get(
            f"/api/v1/automations/catalog/?organization={self.organization.id}"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.data.get("data", response.data)
        self.assertEqual(len(payload["events"]), 15)
        self.assertEqual(
            {event["code"] for event in payload["events"]},
            {event["code"] for event in AUTOMATION_EVENT_CATALOG},
        )
        self.assertTrue(payload["events"][0]["default_recipients"])

    def test_rule_creation_is_limited_to_a_single_event_per_organization(self):
        rule = {
            "organization": str(self.organization.id),
            "event_type": "task_assigned",
            "action_type": "email",
            "message_template": "{{task_title}}",
            "recipients": [Recipient.ASSIGNEE],
            "is_active": True,
        }
        self.assertEqual(
            self.client.post("/api/v1/automations/rules/", rule, format="json").status_code,
            status.HTTP_201_CREATED,
        )
        duplicate = self.client.post("/api/v1/automations/rules/", rule, format="json")
        self.assertEqual(duplicate.status_code, status.HTTP_400_BAD_REQUEST)


class AutomationRuleProcessingTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="owner2@example.com", username="owner2", first_name="Owner", last_name="Two"
        )
        self.assignee = User.objects.create_user(
            email="assignee@example.com",
            username="assignee",
            first_name="Assigned",
            last_name="User",
        )
        self.organization = Organization.objects.create(
            name="Rules Org", slug="rules-org", owner=self.owner
        )
        self.project = Project.objects.create(
            name="Rules Project", organization=self.organization, owner=self.owner
        )
        WorkStyleProfile.objects.create(user=self.owner, notify_via_email=True)
        WorkStyleProfile.objects.create(user=self.assignee, notify_via_email=True)

    @patch("automations.rules.send_email_notification")
    def test_organization_rule_overrides_catalog_recipients_and_template(self, send_email):
        AutomationRule.objects.create(
            organization=self.organization,
            event_type="task_assigned",
            action_type=AutomationRule.ActionType.EMAIL,
            message_template="Assigned: {{task_title}}",
            recipients=[Recipient.PROJECT_OWNER],
        )

        process_rules_for_event(
            "task_assigned",
            {
                "project_id": str(self.project.id),
                "assignee_id": str(self.assignee.id),
                "task_title": "Implement workflow",
            },
        )

        send_email.assert_called_once()
        self.assertEqual(send_email.call_args.args[0], self.owner.email)
        self.assertEqual(send_email.call_args.args[2], "Assigned: Implement workflow")

    @patch("automations.rules.send_email_notification")
    def test_disabled_rule_suppresses_catalog_default(self, send_email):
        AutomationRule.objects.create(
            organization=self.organization,
            event_type="task_assigned",
            action_type=AutomationRule.ActionType.EMAIL,
            message_template="{{task_title}}",
            recipients=[Recipient.ASSIGNEE],
            is_active=False,
        )

        process_rules_for_event(
            "task_assigned",
            {
                "project_id": str(self.project.id),
                "assignee_id": str(self.assignee.id),
                "task_title": "Implement workflow",
            },
        )

        send_email.assert_not_called()

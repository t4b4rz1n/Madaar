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
        self.assertEqual(len(payload["events"]), len(AUTOMATION_EVENT_CATALOG))
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

        send_email.delay.assert_called_once()
        self.assertEqual(send_email.delay.call_args.args[0], self.owner.email)
        self.assertEqual(send_email.delay.call_args.args[2], "Assigned: Implement workflow")

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

        send_email.delay.assert_not_called()


class TelegramBotLocalizationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            email="admin@example.com",
            username="admin",
            first_name="Admin",
            last_name="User",
            password="password123",
        )
        self.wsp = WorkStyleProfile.objects.create(
            user=self.user,
            telegram_chat_id="999999",
            telegram_language="fa",
            has_set_language_manually=True,
            notify_via_telegram=True,
            notify_via_email=True,
        )
        self.org = Organization.objects.create(
            name="Tabarzin",
            slug="tabarzin",
            owner=self.user,
        )

    @patch("automations.services.TelegramBotService._send_or_edit")
    def test_telegram_bot_handlers_farsi_localization(self, mock_send_or_edit):
        from automations.services import TelegramBotService

        # 1. Main Menu
        TelegramBotService._handle_main_menu("999999", "fa")
        mock_send_or_edit.assert_called()
        args, kwargs = mock_send_or_edit.call_args
        msg = args[1]
        markup = kwargs.get("reply_markup") or (args[2] if len(args) > 2 else {})
        self.assertIn("منوی اصلی ربات مدار", msg)
        self.assertIn("سلام", msg)
        btn_texts = [btn["text"] for row in markup["inline_keyboard"] for btn in row]
        self.assertIn(" پروژه‌های من", btn_texts)
        self.assertIn(" تسک‌های من", btn_texts)
        self.assertIn(" پنل ادمین کل سیستم", btn_texts)

        # 2. Status
        TelegramBotService._handle_status("999999", "fa")
        msg = mock_send_or_edit.call_args[0][1]
        self.assertIn("وضعیت حساب کاربری", msg)
        self.assertIn("فعال", msg)
        self.assertNotIn("Active", msg)

        # 3. Help
        TelegramBotService._handle_help("999999", "fa")
        msg = mock_send_or_edit.call_args[0][1]
        self.assertIn("راهنمای ربات مدار", msg)
        self.assertIn("اتصال حساب کاربری", msg)

        # 4. Superadmin Menu
        TelegramBotService._handle_superadmin_menu("999999", "fa")
        msg = mock_send_or_edit.call_args[0][1]
        self.assertIn("پنل ادمین کل سیستم", msg)
        self.assertIn("آمار کل سیستم", msg)

        # 5. Org Admin Menu
        TelegramBotService._handle_org_admin_menu("999999", "fa")
        msg = mock_send_or_edit.call_args[0][1]
        self.assertIn("پنل مدیریت سازمان", msg)
        self.assertIn("وضعیت کلان سازمان", msg)

        # 6. Org Dashboard
        TelegramBotService._handle_org_dashboard("999999", "fa")
        msg = mock_send_or_edit.call_args[0][1]
        self.assertIn("داشبورد کلان سازمان", msg)
        self.assertIn("تعداد پرسنل", msg)

        # 7. Org Tasks Status
        TelegramBotService._handle_org_tasks_status("999999", "fa")
        msg = mock_send_or_edit.call_args[0][1]
        self.assertIn("وضعیت تسک‌های سازمان", msg)
        self.assertIn("انجام شده", msg)

        # 8. My Projects (empty)
        TelegramBotService._handle_my_projects("999999", "fa")
        msg = mock_send_or_edit.call_args[0][1]
        self.assertIn("پروژه‌های من", msg)
        self.assertIn("شما در حال حاضر عضو هیچ پروژه فعالی نیستید", msg)

        # 9. My Tasks (empty)
        TelegramBotService._handle_my_tasks("999999", "fa")
        msg = mock_send_or_edit.call_args[0][1]
        self.assertIn("تسک‌های من", msg)
        self.assertIn("هیچ تسک باز و ناتمامی ندارید", msg)

        # 10. My Org
        TelegramBotService._handle_my_org("999999", "fa")
        msg = mock_send_or_edit.call_args[0][1]
        self.assertIn("سازمان‌های مرتبط با من", msg)
        self.assertIn("شما مالک سازمان", msg)

    @patch("automations.services.send_telegram_notification.delay")
    def test_telegram_bot_unknown_command_localization(self, mock_send_notification):
        from automations.services import TelegramBotService

        # Known user sends unknown command in fa
        TelegramBotService._handle_unknown("999999", "fa")
        mock_send_notification.assert_called()
        msg = mock_send_notification.call_args[0][1]
        self.assertIn("دستور نامعتبر", msg)
        self.assertIn("متوجه نشدم", msg)

        # In en
        TelegramBotService._handle_unknown("999999", "en")
        msg = mock_send_notification.call_args[0][1]
        self.assertIn("Invalid command", msg)

    @patch("automations.services.TelegramBotService._send_or_edit")
    def test_telegram_bot_handlers_english_localization(self, mock_send_or_edit):
        from automations.services import TelegramBotService

        self.wsp.telegram_language = "en"
        self.wsp.save(update_fields=["telegram_language"])

        # 1. Main Menu
        TelegramBotService._handle_main_menu("999999", "en")
        args, kwargs = mock_send_or_edit.call_args
        msg = args[1]
        markup = kwargs.get("reply_markup") or (args[2] if len(args) > 2 else {})
        self.assertIn("Madaar Bot Main Menu", msg)
        btn_texts = [btn["text"] for row in markup["inline_keyboard"] for btn in row]
        self.assertIn(" My Projects", btn_texts)

        # 2. Status
        TelegramBotService._handle_status("999999", "en")
        msg = mock_send_or_edit.call_args[0][1]
        self.assertIn("User Account Status", msg)
        self.assertIn("Active", msg)

        # 3. Help
        TelegramBotService._handle_help("999999", "en")
        msg = mock_send_or_edit.call_args[0][1]
        self.assertIn("Madaar Bot Help", msg)

        # 4. My Projects
        TelegramBotService._handle_my_projects("999999", "en")
        msg = mock_send_or_edit.call_args[0][1]
        self.assertIn("My Projects", msg)
        self.assertIn("You are currently not a member of any active project", msg)

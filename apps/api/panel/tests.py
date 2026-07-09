from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from billing.models import DiscountCode
from panel.Ticketing.models import Attachment, Message, Ticket, TicketType
from panel.Ticketing.validators import validate_attachment_extension

User = get_user_model()


class PanelBillingAndTicketingTestCase(APITestCase):
    def setUp(self):
        # Create users
        self.admin_user = User.objects.create_superuser(
            username="adminuser", email="admin@example.com", password="adminpassword123"
        )
        self.regular_user = User.objects.create_user(
            username="regularuser", email="user@example.com", password="userpassword123"
        )

        # Create a ticket type
        self.ticket_type = TicketType.objects.create(name="Technical Support")

        # Create a ticket owned by regular_user
        self.ticket = Ticket.objects.create(
            user=self.regular_user,
            title="Service Downtime issue",
            ticket_type=self.ticket_type,
            priority=Ticket.Priority.HIGH,
            status=Ticket.Status.OPEN,
        )

        # Dashboard URLs (User facing)
        self.user_ticket_list_url = reverse("ticket-list")
        self.user_ticket_detail_url = reverse("ticket-detail", kwargs={"id": self.ticket.id})
        self.user_messages_url = reverse(
            "ticket-messages-list-create", kwargs={"id": self.ticket.id}
        )

        # Staff URLs (Admin facing)
        self.staff_ticket_list_url = reverse("staff-ticket-list")
        self.staff_ticket_detail_url = reverse("staff-ticket-detail", kwargs={"id": self.ticket.id})
        self.staff_messages_url = reverse("staff-ticket-messages", kwargs={"id": self.ticket.id})
        self.staff_discount_list_url = reverse("staff-discount-list")

    # --- Ticketing Tests ---

    def test_regular_user_can_create_ticket(self):
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.post(
            self.user_ticket_list_url,
            {
                "title": "Cannot login on mobile app",
                "ticket_type": self.ticket_type.id,
                "priority": Ticket.Priority.MEDIUM,
                "text": "I get a timeout error on my mobile application.",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        json_data = response.json()
        self.assertTrue(json_data["status"])
        self.assertEqual(json_data["data"]["title"], "Cannot login on mobile app")

    def test_regular_user_can_post_message(self):
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.post(
            self.user_messages_url, {"text": "Any updates on this downtime?"}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify message count in database
        self.assertEqual(Message.objects.filter(ticket=self.ticket).count(), 1)

    def test_regular_user_cannot_upload_disallowed_ticket_attachment_extension(self):
        self.client.force_authenticate(user=self.regular_user)
        upload = SimpleUploadedFile(
            "malware.exe", b"not really an executable", content_type="application/octet-stream"
        )
        response = self.client.post(
            self.user_messages_url,
            {"text": "Please check this attachment.", "attachments": [upload]},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Attachment.objects.count(), 0)

    def test_ticket_attachment_validator_blocks_executable_extensions_with_code(self):
        upload = SimpleUploadedFile(
            "deploy.cmd", b"not really a command", content_type="application/octet-stream"
        )

        with self.assertRaisesMessage(
            Exception,
            "Files with the .cmd extension are not allowed.",
        ) as exc:
            validate_attachment_extension(upload)

        self.assertEqual(exc.exception.get_codes(), ["blocked_attachment_extension"])

    def test_staff_can_view_all_tickets_and_update(self):
        self.client.force_authenticate(user=self.admin_user)

        # View tickets list
        response = self.client.get(self.staff_ticket_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Update ticket status/priority
        response = self.client.patch(
            self.staff_ticket_detail_url,
            {"status": Ticket.Status.IN_PROGRESS, "priority": Ticket.Priority.URGENT},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify changes in DB
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.status, Ticket.Status.IN_PROGRESS)
        self.assertEqual(self.ticket.priority, Ticket.Priority.URGENT)

    def test_staff_can_reply_to_ticket(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            self.staff_messages_url, {"text": "We are investigating the database cluster now."}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify status automatically changed to answered
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.status, Ticket.Status.ANSWERED)

    # --- Discount Code Tests ---

    def test_staff_can_create_discount_code(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            self.staff_discount_list_url,
            {
                "code": "SUMMER50",
                "percent": 50,
                "max_usage": 100,
                "expiration_date": (timezone.now() + timezone.timedelta(days=30)).isoformat(),
                "description": "Summer sale discount",
                "is_active": True,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify discount code created in DB
        self.assertTrue(DiscountCode.objects.filter(code="SUMMER50").exists())
        discount = DiscountCode.objects.get(code="SUMMER50")
        self.assertTrue(discount.is_valid)

    def test_regular_user_cannot_create_discount_code(self):
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.post(
            self.staff_discount_list_url, {"code": "WINTER20", "percent": 20}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

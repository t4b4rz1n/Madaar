from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from gamification.models import PointLedger, UserPointBalance
from gamification.services import award_points, send_kudos

User = get_user_model()


class GamificationTests(APITestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(username="user1", email="user1@example.com", password="testpassword123")
        self.user2 = User.objects.create_user(username="user2", email="user2@example.com", password="testpassword123")
        self.admin = User.objects.create_superuser(username="admin", email="admin@example.com", password="testpassword123")

        # Initialize balances
        UserPointBalance.objects.create(user=self.user1, kudos_budget=100)
        UserPointBalance.objects.create(user=self.user2, kudos_budget=100)

    def test_award_points_service(self):
        # Award 50 points
        award_points(self.user1, 50, PointLedger.SourceChoices.SYSTEM)
        balance = UserPointBalance.objects.get(user=self.user1)
        self.assertEqual(balance.total_points, 50)
        self.assertEqual(balance.spendable_points, 50)

        # Deduct 20 points
        award_points(self.user1, -20, PointLedger.SourceChoices.STORE)
        balance.refresh_from_db()
        self.assertEqual(balance.total_points, 50)  # total points do not decrease
        self.assertEqual(balance.spendable_points, 30)

        self.assertEqual(PointLedger.objects.filter(user=self.user1).count(), 2)

    def test_send_kudos_service(self):
        kudos = send_kudos(self.user1, self.user2, 30, "Great work!")

        balance1 = UserPointBalance.objects.get(user=self.user1)
        balance2 = UserPointBalance.objects.get(user=self.user2)

        self.assertEqual(balance1.kudos_budget, 70)
        self.assertEqual(balance2.total_points, 30)
        self.assertEqual(balance2.spendable_points, 30)
        self.assertEqual(kudos.amount, 30)

    def test_api_leaderboard(self):
        award_points(self.user1, 100, PointLedger.SourceChoices.SYSTEM)
        award_points(self.user2, 50, PointLedger.SourceChoices.SYSTEM)

        self.client.force_authenticate(user=self.user1)
        response = self.client.get("/api/v1/gamification/leaderboard/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        results = response.data.get("results", response.data)
        self.assertEqual(results[0]["user"]["username"], "user1")

    def test_api_send_kudos(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.post("/api/v1/gamification/kudos/", {
            "receiver_id": self.user2.id,
            "amount": 20,
            "message": "Thanks for help"
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        balance1 = UserPointBalance.objects.get(user=self.user1)
        self.assertEqual(balance1.kudos_budget, 80)

    def test_api_bug_bounty(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.post("/api/v1/gamification/bug-bounty/", {
            "title": "Bug found",
            "description": "App crashes on login"
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        bounty_id = response.data["id"]

        # User cannot resolve
        response = self.client.post(f"/api/v1/gamification/bug-bounty/{bounty_id}/resolve/", {
            "is_approved": True,
            "awarded_points": 50
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Admin can resolve
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f"/api/v1/gamification/bug-bounty/{bounty_id}/resolve/", {
            "is_approved": True,
            "awarded_points": 100
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        balance1 = UserPointBalance.objects.get(user=self.user1)
        self.assertEqual(balance1.total_points, 100)

    def test_store_purchase_service(self):
        from gamification.models import StoreItem
        from gamification.services import purchase_store_item

        item = StoreItem.objects.create(name={"en": "Mug"}, cost=20, stock=1)
        award_points(self.user1, 50, PointLedger.SourceChoices.SYSTEM)

        purchase = purchase_store_item(self.user1, item)
        self.assertEqual(purchase.cost_at_purchase, 20)

        balance = UserPointBalance.objects.get(user=self.user1)
        self.assertEqual(balance.spendable_points, 30)

        item.refresh_from_db()
        self.assertEqual(item.stock, 0)

        # Test out of stock
        with self.assertRaises(Exception):  # noqa: B017
            purchase_store_item(self.user2, item)

    def test_monthly_kudos_reset_task(self):
        from gamification.tasks import reset_monthly_kudos_budget

        balance = UserPointBalance.objects.get(user=self.user1)
        balance.kudos_budget = 10
        balance.save()

        reset_monthly_kudos_budget()

        balance.refresh_from_db()
        self.assertEqual(balance.kudos_budget, 100)

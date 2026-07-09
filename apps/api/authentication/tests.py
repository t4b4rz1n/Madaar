from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken

User = get_user_model()


class AuthenticationTestCase(APITestCase):
    def setUp(self):
        self.register_url = reverse("auth_register")
        self.login_url = reverse("auth_login")
        self.refresh_url = reverse("auth_refresh")
        self.logout_url = reverse("auth_logout")

        self.user_data = {
            "username": "authuser",
            "email": "authuser@example.com",
            "password": "strongpassword123",
            "password_confirm": "strongpassword123",
            "first_name": "Auth",
            "last_name": "User",
        }

    def test_user_registration_success(self):
        response = self.client.post(self.register_url, self.user_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify user was created in DB
        self.assertTrue(User.objects.filter(username=self.user_data["username"]).exists())

        # Verify response formatting
        json_data = response.json()
        self.assertTrue(json_data["status"])
        self.assertEqual(json_data["message"], "The operation was successful")
        self.assertEqual(json_data["data"]["username"], self.user_data["username"])

    def test_user_registration_password_mismatch(self):
        bad_data = self.user_data.copy()
        bad_data["password_confirm"] = "differentpassword"

        response = self.client.post(self.register_url, bad_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        json_data = response.json()
        self.assertFalse(json_data["status"])
        self.assertIn("password", json_data["errors"])

    def test_user_login_success(self):
        # First, create the user
        User.objects.create_user(
            username=self.user_data["username"],
            email=self.user_data["email"],
            password=self.user_data["password"],
        )

        # Post to login
        response = self.client.post(
            self.login_url,
            {"username": self.user_data["username"], "password": self.user_data["password"]},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        json_data = response.json()
        self.assertTrue(json_data["status"])
        self.assertIn("access", json_data["data"])
        self.assertIn("refresh", json_data["data"])
        self.assertEqual(json_data["data"]["user"]["username"], self.user_data["username"])

    def test_user_login_invalid_credentials(self):
        response = self.client.post(
            self.login_url, {"username": "nonexistent", "password": "wrongpassword"}
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        json_data = response.json()
        self.assertFalse(json_data["status"])

    def test_token_refresh(self):
        # Create user & login to get refresh token
        User.objects.create_user(
            username=self.user_data["username"],
            email=self.user_data["email"],
            password=self.user_data["password"],
        )
        login_response = self.client.post(
            self.login_url,
            {"username": self.user_data["username"], "password": self.user_data["password"]},
        )
        refresh_token = login_response.json()["data"]["refresh"]

        # Post to refresh
        response = self.client.post(self.refresh_url, {"refresh": refresh_token})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        json_data = response.json()
        self.assertTrue(json_data["status"])
        self.assertIn("access", json_data["data"])

    def test_user_logout_blacklists_token(self):
        # Create user & login
        User.objects.create_user(
            username=self.user_data["username"],
            email=self.user_data["email"],
            password=self.user_data["password"],
        )
        login_response = self.client.post(
            self.login_url,
            {"username": self.user_data["username"], "password": self.user_data["password"]},
        )
        access_token = login_response.json()["data"]["access"]
        refresh_token = login_response.json()["data"]["refresh"]

        # Authenticate with JWT token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        # Logout
        response = self.client.post(self.logout_url, {"refresh": refresh_token})
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Verify refresh token is blacklisted in database
        self.assertTrue(BlacklistedToken.objects.exists())

    def test_user_logout_requires_refresh_token(self):
        user = User.objects.create_user(
            username=self.user_data["username"],
            email=self.user_data["email"],
            password=self.user_data["password"],
        )
        self.client.force_authenticate(user=user)

        response = self.client.post(self.logout_url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("refresh", response.json()["errors"])

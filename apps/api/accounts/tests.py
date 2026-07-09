from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError
from django.test import SimpleTestCase, TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from config.exception_handler import custom_exception_handler

from .validators import profile_picture_validator

User = get_user_model()

class UserProfileUpdateViewTestCase(TestCase):
    def setUp(self):
        self.url = reverse("profile")
        self.user_password = "strongpassword123"
        self.user = User.objects.create_user(
            username="testuser",
            email="testuser@example.com",
            password=self.user_password,
            first_name="Test",
            last_name="User",
        )
        self.client = APIClient()

    def test_unauthenticated_user_cannot_update_profile(self):
        response = self.client.patch(self.url, {"first_name": "NewName"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_view_profile(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse("profile"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["data"]["first_name"], self.user.first_name)

    def test_authenticated_user_can_update_profile_fields(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            self.url, {"first_name": "UpdatedFirst", "last_name": "UpdatedLast"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Reload user from DB
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "UpdatedFirst")
        self.assertEqual(self.user.last_name, "UpdatedLast")

    def test_user_can_change_password(self):
        self.client.force_authenticate(user=self.user)
        new_password = "newstrongpassword456"
        response = self.client.patch(
            self.url, {"password": new_password, "password_confirm": new_password}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Reload user from DB and verify password change
        self.user.refresh_from_db()
        self.assertFalse(self.user.check_password(self.user_password))
        self.assertTrue(self.user.check_password(new_password))

    def test_password_change_validation_fails_on_mismatch(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            self.url, {"password": "newpassword1", "password_confirm": "newpassword2"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Parse JSON from fully rendered response content
        json_data = response.json()
        self.assertFalse(json_data["status"])
        self.assertIn("password", json_data["errors"])


class ProfilePictureValidatorTestCase(SimpleTestCase):
    def test_profile_picture_validator_accepts_valid_extension(self):
        uploaded_file = SimpleUploadedFile(
            "avatar.jpg",
            b"dummycontent",
            content_type="image/jpeg",
        )

        profile_picture_validator(uploaded_file)

    def test_profile_picture_validator_accepts_uppercase_extension(self):
        uploaded_file = SimpleUploadedFile(
            "avatar.JPG",
            b"dummycontent",
            content_type="image/jpeg",
        )

        profile_picture_validator(uploaded_file)

    def test_profile_picture_validator_rejects_invalid_extension(self):
        uploaded_file = SimpleUploadedFile(
            "avatar.gif",
            b"dummycontent",
            content_type="image/gif",
        )

        with self.assertRaises(DjangoValidationError) as ctx:
            profile_picture_validator(uploaded_file)

        self.assertEqual(ctx.exception.code, "invalid_extension")
        self.assertIn("png, jpg or jpeg", str(ctx.exception))

    def test_profile_picture_validator_rejects_files_exceeding_size_limit(self):
        uploaded_file = SimpleUploadedFile(
            "avatar.jpg",
            b"a" * (5 * 1024 * 1024 + 1),
            content_type="image/jpeg",
        )

        with self.assertRaises(DjangoValidationError) as ctx:
            profile_picture_validator(uploaded_file)

        self.assertEqual(ctx.exception.code, "file_too_large")
        self.assertIn("must not exceed 5MB", str(ctx.exception))


class CustomExceptionHandlerTestCase(SimpleTestCase):
    def test_drf_standard_exception_is_handled(self):
        # We raise a DRF ValidationError and verify the central handler captures it
        exc = ValidationError({"field": ["Some field error"]})
        response = custom_exception_handler(exc, {})
        self.assertIsNotNone(response)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("field", response.data)

    def test_database_integrity_error_returns_409_conflict(self):
        # Raise standard IntegrityError
        exc = IntegrityError("UNIQUE CONSTRAINT failed: accounts_user.username")
        response = custom_exception_handler(exc, {})
        self.assertIsNotNone(response)
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["detail"], "Database constraint violation or conflict.")

    def test_generic_python_exception_returns_500_server_error(self):
        # Raise generic python exception
        exc = ValueError("Fatal conversion error")
        response = custom_exception_handler(exc, {})
        self.assertIsNotNone(response)
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn("A server error occurred", response.data["detail"])

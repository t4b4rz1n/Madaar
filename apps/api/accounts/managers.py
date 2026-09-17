from django.contrib.auth.base_user import BaseUserManager
from django.utils.translation import gettext_lazy as _


class UserManager(BaseUserManager):
    """
    Custom user manager for User model with email as the unique identifier.
    """

    def create_user(
        self,
        email,
        username,
        first_name="",
        last_name="",
        password=None,
        **extra_fields,
    ):
        if not email:
            raise ValueError(_("The Email field must be set"))
        if not username:
            raise ValueError(_("The Username field must be set"))

        email = self.normalize_email(email)
        user = self.model(
            email=email,
            username=username,
            first_name=first_name,
            last_name=last_name,
            **extra_fields,
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(
        self, email, username, first_name="Admin", last_name="User", password=None, **extra_fields
    ):
        """
        Create and save a superuser with the given credentials.
        """
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError(_("Superuser must have is_staff=True."))
        if extra_fields.get("is_superuser") is not True:
            raise ValueError(_("Superuser must have is_superuser=True."))

        return self.create_user(
            email=email,
            username=username,
            first_name=first_name,
            last_name=last_name,
            password=password,
            **extra_fields,
        )

from django.contrib.auth import get_user_model
from django.db import transaction

from .models import UserProfile

User = get_user_model()


def create_user_with_profile(user_data: dict, profile_data: dict = None) -> User:
    """
    Service layer function to create a User along with their Employee Profile.
    """
    with transaction.atomic():
        password = user_data.pop("password", None)
        user = User.objects.create_user(password=password, **user_data)

        if profile_data:
            UserProfile.objects.create(user=user, **profile_data)
        else:
            UserProfile.objects.create(user=user)

        return user


def create_organization_user(organization, user_data: dict, role_code: str) -> User:
    """Create a user and active organization membership as one transaction."""
    from organizations.services import add_member

    with transaction.atomic():
        profile_data = user_data.pop("profile", None)
        user = create_user_with_profile(user_data, profile_data)
        add_member(
            organization=organization,
            user=user,
            role_code=role_code,
        )
    return user


def soft_delete_user(user: User) -> None:
    """
    Soft delete user account.
    """
    user.is_deleted = True
    user.is_active = False
    user.save(update_fields=["is_deleted", "is_active"])

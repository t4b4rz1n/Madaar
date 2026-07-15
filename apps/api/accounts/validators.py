import re
from pathlib import Path

from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _


class ContainsUppercaseValidator:
    def validate(self, password, user=None):
        if not re.search(r"[A-Z]", password):
            raise ValidationError(
                _("Password must contain at least one uppercase letter."),
                code="password_no_uppercase",
            )

    def get_help_text(self):
        return _("Your password must contain at least one uppercase letter.")


def username_validator(value):
    allowed_characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_"
    for char in value:
        if char not in allowed_characters:
            raise ValidationError(
                _(
                    "Invalid character in the username. Only English letters, numbers, hyphens, and underscores are allowed."
                ),
                code="invalid_username",
            )


def profile_picture_validator(value):
    extension = Path(value.name).suffix.lower()
    allowed_extensions = {".png", ".jpg", ".jpeg"}

    if extension not in allowed_extensions:
        raise ValidationError(
    _("The type of entered file must be png, jpg or jpeg."),
    code="invalid_extension",
)

    max_size = 5 * 1024 * 1024
    if value.size > max_size:
        raise ValidationError(
    _("Profile picture size must not exceed 5MB."),
    code="file_too_large",
)

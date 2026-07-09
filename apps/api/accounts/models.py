from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _

from .validators import profile_picture_validator, username_validator


class User(AbstractUser):
    username = models.CharField(
        _("username"),
        max_length=150,
        unique=True,
        help_text=_("Required. 150 characters or fewer. Letters, digits and -/_ only."),
        validators=[username_validator],
        error_messages={
            "unique": _("A user with that username already exists."),
        },
    )

    profile_image = models.ImageField(
        upload_to="profile_pics/", null=True, blank=True, validators=[profile_picture_validator]
    )

    def __str__(self):
        return self.username

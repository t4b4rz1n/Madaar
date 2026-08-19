from django.contrib.auth.models import AbstractUser
from django.db import models

from accounts.validators import profile_picture_validator
from common.models import BaseModel

from .managers import UserManager


class User(AbstractUser, BaseModel):
    email = models.EmailField(
        unique=True,
        db_index=True,
    )

    username = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
    )

    first_name = models.CharField(
        max_length=100,
    )

    last_name = models.CharField(
        max_length=100,
    )

    phone_number = models.CharField(
        max_length=20,
        unique=True,
        null=True,
        blank=True,
    )

    avatar = models.ImageField(
        upload_to="avatars/", null=True, blank=True, validators=[profile_picture_validator]
    )

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "first_name", "last_name"]

    class Meta:
        db_table = "users"
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return self.email

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self):
        return self.first_name


class WorkStyleProfile(BaseModel):
    """
    Work style preferences for a user.
    Used to guide how team members interact with each other.
    """

    class CommunicationPreference(models.TextChoices):
        TEXT = "text", "Text"
        CALL = "call", "Call"
        MEETING = "meeting", "Meeting"

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="work_style_profile",
    )

    communication_preference = models.CharField(
        max_length=20,
        choices=CommunicationPreference.choices,
        default=CommunicationPreference.TEXT,
        help_text="Preferred communication channel",
    )

    preferred_working_hours_start = models.TimeField(
        null=True,
        blank=True,
        help_text="Preferred start time for working hours",
    )

    preferred_working_hours_end = models.TimeField(
        null=True,
        blank=True,
        help_text="Preferred end time for working hours",
    )

    disc_result = models.CharField(
        max_length=50,
        blank=True,
        help_text="DISC personality assessment result",
    )

    neo_result = models.CharField(
        max_length=50,
        blank=True,
        help_text="NEO personality assessment result",
    )

    notes = models.TextField(
        blank=True,
        help_text="Additional notes about work style preferences",
    )

    class Meta:
        db_table = "work_style_profiles"
        verbose_name = "Work Style Profile"
        verbose_name_plural = "Work Style Profiles"

    def __str__(self):
        return f"WorkStyle({self.user_id})"


class UserProfile(BaseModel):
    """
    Extensible employee profile information.
    """

    class EmploymentType(models.TextChoices):
        FULL_TIME = "full_time", "Full Time"
        PART_TIME = "part_time", "Part Time"
        CONTRACT = "contract", "Contract"
        INTERN = "intern", "Intern"

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    job_title = models.CharField(max_length=100, blank=True)
    department = models.CharField(max_length=100, blank=True)
    employee_id = models.CharField(max_length=50, blank=True, null=True, unique=True)
    employment_type = models.CharField(
        max_length=20,
        choices=EmploymentType.choices,
        default=EmploymentType.FULL_TIME,
    )
    hire_date = models.DateField(null=True, blank=True)
    bio = models.TextField(blank=True)

    # Professional & Extensible information
    skills = models.JSONField(default=list, blank=True)
    experience_history = models.JSONField(default=list, blank=True)
    github_url = models.URLField(blank=True)
    linkedin_url = models.URLField(blank=True)

    class Meta:
        db_table = "user_profiles"
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"

    def __str__(self):
        return f"Profile({self.user.email})"

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


class CustomUserAdmin(UserAdmin):
    fieldsets = (
        *UserAdmin.fieldsets,
        (
            "Custom Fields",
            {
                "fields": ("profile_image",),
            },
        ),
    )

    list_display = ("username", "email", "first_name", "last_name", "is_staff")


admin.site.register(User, CustomUserAdmin)

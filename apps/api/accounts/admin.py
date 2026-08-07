from django.contrib import admin
from django.contrib import messages
from django.contrib.auth.admin import UserAdmin

from .models import User, WorkStyleProfile


class CustomUserAdmin(UserAdmin):
    fieldsets = (
        *UserAdmin.fieldsets,
        (
            "Custom Fields",
            {
                "fields": ("avatar", "phone_number"),
            },
        ),
        (
            "Telegram & Notifications",
            {
                "fields": (
                    "telegram_chat_id",
                    "telegram_connect_token",
                    "notify_via_email",
                    "notify_via_telegram",
                ),
            },
        ),
    )

    list_display = ("username", "email", "first_name", "last_name", "phone_number", "is_staff")
    search_fields = ("username", "email", "first_name", "last_name", "phone_number")
    actions = ["generate_telegram_link"]

    @admin.action(description="Generate Telegram connect link")
    def generate_telegram_link(self, request, queryset):
        for user in queryset:
            link = user.telegram_connect_link()
            self.message_user(
                request,
                f"Telegram connect link for {user.email}: {link}",
                level=messages.INFO,
            )


@admin.register(WorkStyleProfile)
class WorkStyleProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "communication_preference", "preferred_working_hours_start", "preferred_working_hours_end")
    list_filter = ("communication_preference",)
    search_fields = ("user__username", "user__email", "disc_result", "neo_result")
    raw_id_fields = ("user",)


admin.site.register(User, CustomUserAdmin)

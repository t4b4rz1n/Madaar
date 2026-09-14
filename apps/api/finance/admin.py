from django.contrib import admin

from finance.models import SalaryConfig


@admin.register(SalaryConfig)
class SalaryConfigAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "organization",
        "project",
        "payment_type",
        "rate",
        "currency",
        "is_active",
        "created_at",
    )
    list_filter = ("payment_type", "is_active", "currency")
    search_fields = ("user__username", "user__email", "organization__name")
    raw_id_fields = ("user", "organization", "project")

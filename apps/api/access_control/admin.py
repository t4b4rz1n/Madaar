from django.contrib import admin

from .models import Permission, Role


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "module", "group", "created_at")
    list_filter = ("module", "group", "is_deleted")
    search_fields = ("code", "name", "description")


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "code",
        "assignment_scope",
        "organization",
        "is_active",
        "is_system_role",
        "created_at",
    )
    list_filter = ("organization", "assignment_scope", "is_active", "is_system_role")
    search_fields = ("name", "code", "description")
    filter_horizontal = ("permissions",)

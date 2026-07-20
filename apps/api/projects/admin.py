from django.contrib import admin

from .models import Milestone, Project, ProjectActivity, ProjectMember


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "organization",
        "owner",
        "team",
        "budget",
        "budget_currency",
        "status",
        "deadline",
    )
    list_filter = ("status", "organization", "budget_currency")
    search_fields = ("name", "description", "owner__username", "owner__email")
    raw_id_fields = ("organization", "owner", "team")


@admin.register(ProjectMember)
class ProjectMemberAdmin(admin.ModelAdmin):
    list_display = (
        "project",
        "user",
        "team",
        "specialty",
        "allocation_percentage",
        "is_active",
    )
    list_filter = ("is_active", "team")
    search_fields = ("project__name", "user__username", "user__email", "specialty")
    raw_id_fields = ("project", "user", "team")


@admin.register(Milestone)
class MilestoneAdmin(admin.ModelAdmin):
    list_display = ("title", "project", "status", "target_date", "completed_at")
    list_filter = ("status", "project")
    search_fields = ("title", "project__name")
    raw_id_fields = ("project",)


@admin.register(ProjectActivity)
class ProjectActivityAdmin(admin.ModelAdmin):
    list_display = ("project", "actor", "event_type", "entity_type", "created_at")
    list_filter = ("event_type", "entity_type")
    search_fields = ("project__name", "actor__username", "entity_id")
    raw_id_fields = ("project", "actor")

from django.contrib import admin

from .models import Milestone, Project, ProjectActivity, ProjectMember


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "owner_id",
        "team_id",
        "budget",
        "budget_currency",
        "status",
        "deadline",
    )
    list_filter = ("status", "budget_currency")
    search_fields = ("name", "description", "owner_id")


@admin.register(ProjectMember)
class ProjectMemberAdmin(admin.ModelAdmin):
    list_display = (
        "project",
        "user_id",
        "team_id",
        "specialty",
        "allocation_percentage",
        "is_active",
    )
    list_filter = ("is_active",)
    search_fields = ("project__name", "user_id", "specialty")


@admin.register(Milestone)
class MilestoneAdmin(admin.ModelAdmin):
    list_display = ("title", "project", "status", "target_date", "completed_at")
    list_filter = ("status",)
    search_fields = ("title", "project__name")


@admin.register(ProjectActivity)
class ProjectActivityAdmin(admin.ModelAdmin):
    list_display = ("project", "actor_id", "event_type", "entity_type", "created_at")
    list_filter = ("event_type", "entity_type")
    search_fields = ("project__name", "actor_id", "entity_id")

from django.contrib import admin
from .models import (
    Task,
    TaskChecklistItem,
    TaskDependency,
    TaskComment,
    TaskActivityLog,
)


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "status",
        "priority",
        "assignee",
        "reporter",
        "due_date",
        "created_at",
    )
    list_filter = ("status", "priority", "assignee")
    search_fields = (
        "title",
        "description",
        "assignee__username",
        "reporter__username",
    )
    ordering = ("-created_at",)
    raw_id_fields = ("assignee", "reporter", "parent_task")


@admin.register(TaskChecklistItem)
class TaskChecklistItemAdmin(admin.ModelAdmin):
    list_display = ("task", "description", "is_completed")
    list_filter = ("is_completed",)
    search_fields = ("task__title", "description")


@admin.register(TaskDependency)
class TaskDependencyAdmin(admin.ModelAdmin):
    list_display = (
        "task",
        "depends_on",
        "dependency_type",
        "lag",
    )
    list_filter = ("dependency_type",)
    raw_id_fields = ("task", "depends_on")
    search_fields = ("task__title", "depends_on__title")


@admin.register(TaskComment)
class TaskCommentAdmin(admin.ModelAdmin):
    list_display = ("task", "author", "created_at", "attached_file")
    list_filter = ("created_at",)
    raw_id_fields = ("task", "author")
    search_fields = ("task__title", "author__username", "content")


@admin.register(TaskActivityLog)
class TaskActivityLogAdmin(admin.ModelAdmin):
    list_display = ("task", "actor", "action", "timestamp")
    list_filter = ("timestamp",)
    raw_id_fields = ("task", "actor")
    search_fields = ("task__title", "actor__username", "action")

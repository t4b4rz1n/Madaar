from django.contrib import admin
from .models import (
    Board,
    BoardColumn,
    Task,
    TaskChecklistItem,
    TaskDependency,
    TaskComment,
    TaskActivityLog,
)


@admin.register(Board)
class BoardAdmin(admin.ModelAdmin):
    list_display = ("title", "project_id", "created_by", "created_at")
    list_filter = ("project_id", "created_by")
    search_fields = ("title", "project_id")
    ordering = ("-created_at",)


@admin.register(BoardColumn)
class BoardColumnAdmin(admin.ModelAdmin):
    list_display = ("title", "board", "order")
    list_filter = ("board",)
    search_fields = ("title", "board__title")
    ordering = ("board", "order")


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "status",
        "column",
        "priority",
        "assignee",
        "reporter",
        "due_date",
        "created_at",
    )
    list_filter = ("status", "priority", "assignee", "column", "is_deleted")
    search_fields = (
        "title",
        "description",
        "assignee__username",
        "reporter__username",
    )
    ordering = ("-created_at",)
    raw_id_fields = ("assignee", "reporter", "parent_task", "column")



@admin.register(TaskChecklistItem)
class TaskChecklistItemAdmin(admin.ModelAdmin):
    list_display = ("task", "description", "is_completed")
    list_filter = ("is_completed", "is_deleted")
    search_fields = ("task__title", "description")


@admin.register(TaskDependency)
class TaskDependencyAdmin(admin.ModelAdmin):
    list_display = (
        "task",
        "depends_on",
        "dependency_type",
        "lag",
    )
    list_filter = ("dependency_type", "is_deleted")
    raw_id_fields = ("task", "depends_on")
    search_fields = ("task__title", "depends_on__title")


@admin.register(TaskComment)
class TaskCommentAdmin(admin.ModelAdmin):
    list_display = ("task", "author", "created_at", "attached_file")
    list_filter = ("is_deleted",)
    raw_id_fields = ("task", "author")
    search_fields = ("task__title", "author__username", "content")


@admin.register(TaskActivityLog)
class TaskActivityLogAdmin(admin.ModelAdmin):
    list_display = ("task", "actor", "action", "timestamp")
    list_filter = ("timestamp", "is_deleted")
    raw_id_fields = ("task", "actor")
    search_fields = ("task__title", "actor__username", "action")


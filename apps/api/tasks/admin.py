from django.contrib import admin

from .models import (
    AsyncStandup,
    Board,
    BoardColumn,
    Task,
    TaskActivityLog,
    TaskChecklistItem,
    TaskComment,
    TaskStatus,
)


@admin.register(Board)
class BoardAdmin(admin.ModelAdmin):
    list_display = ("title", "project", "created_by", "created_at")
    list_filter = ("project", "created_by")
    search_fields = ("title", "project__name")
    ordering = ("-created_at",)


@admin.register(BoardColumn)
class BoardColumnAdmin(admin.ModelAdmin):
    list_display = ("title", "board", "order")
    list_filter = ("board",)
    search_fields = ("title", "board__title")
    ordering = ("board", "order")


@admin.register(TaskStatus)
class TaskStatusAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "order", "created_at")
    list_filter = ("is_deleted",)
    search_fields = ("name", "code")
    ordering = ("order",)


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "project",
        "milestone",
        "status",
        "column",
        "priority",
        "assignee",
        "reporter",
        "due_date",
        "created_at",
    )
    list_filter = ("project", "status", "priority", "assignee", "column", "is_deleted")
    search_fields = (
        "title",
        "description",
        "project__name",
        "assignee__username",
        "reporter__username",
    )
    ordering = ("-created_at",)
    raw_id_fields = ("project", "milestone", "assignee", "reporter", "parent_task", "column")


@admin.register(TaskChecklistItem)
class TaskChecklistItemAdmin(admin.ModelAdmin):
    list_display = ("task", "description", "is_completed")
    list_filter = ("is_completed", "is_deleted")
    search_fields = ("task__title", "description")


@admin.register(TaskComment)
class TaskCommentAdmin(admin.ModelAdmin):
    list_display = ("task", "author", "created_at", "attached_file")
    list_filter = ("is_deleted",)
    raw_id_fields = ("task", "author")
    search_fields = ("task__title", "author__username", "content")


@admin.register(TaskActivityLog)
class TaskActivityLogAdmin(admin.ModelAdmin):
    list_display = ("task", "actor", "action", "created_at")
    list_filter = ("created_at", "is_deleted")
    raw_id_fields = ("task", "actor")
    search_fields = ("task__title", "actor__username", "action")


@admin.register(AsyncStandup)
class AsyncStandupAdmin(admin.ModelAdmin):
    list_display = ("user", "created_at")
    list_filter = ("created_at", "is_deleted")
    raw_id_fields = ("user",)
    search_fields = ("user__username", "yesterday_work", "today_work", "blockers")

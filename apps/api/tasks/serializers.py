from rest_framework import serializers

from accounts.models import User
from projects.models import Milestone, Project
from .models import (AsyncStandup,Board,BoardColumn,Task,TaskActivityLog,TaskChecklistItem,TaskComment,TaskStatus)
class UserMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "avatar")


class TaskStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskStatus
        fields = ("id", "code", "name", "order")


class BoardColumnSerializer(serializers.ModelSerializer):
    class Meta:
        model = BoardColumn
        fields = ("id", "board", "title", "order", "created_at")
        read_only_fields = ("id", "created_at")


class BoardSerializer(serializers.ModelSerializer):
    columns = BoardColumnSerializer(many=True, read_only=True)
    created_by_detail = UserMinimalSerializer(source="created_by", read_only=True)

    class Meta:
        model = Board
        fields = ("id", "title", "project", "created_by", "created_by_detail", "columns", "created_at")
        read_only_fields = ("id", "created_by", "created_at")


class TaskChecklistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskChecklistItem
        fields = ("id", "task", "description", "is_completed", "created_at")
        read_only_fields = ("id", "task", "created_at")


class TaskCommentSerializer(serializers.ModelSerializer):
    author_detail = UserMinimalSerializer(source="author", read_only=True)

    class Meta:
        model = TaskComment
        fields = ("id", "task", "author", "author_detail", "content", "attached_file", "created_at")
        read_only_fields = ("id", "task", "author", "created_at")


class TaskActivityLogSerializer(serializers.ModelSerializer):
    actor_detail = UserMinimalSerializer(source="actor", read_only=True)

    class Meta:
        model = TaskActivityLog
        fields = ("id", "task", "actor", "actor_detail", "action", "created_at")
        read_only_fields = ("id", "task", "actor", "action", "created_at")


class TaskSerializer(serializers.ModelSerializer):
    status_detail = TaskStatusSerializer(source="status", read_only=True)
    assignee_detail = UserMinimalSerializer(source="assignee", read_only=True)
    reporter_detail = UserMinimalSerializer(source="reporter", read_only=True)
    column_detail = BoardColumnSerializer(source="column", read_only=True)
    checklist_items = TaskChecklistItemSerializer(many=True, read_only=True)
    comments = TaskCommentSerializer(many=True, read_only=True)

    class Meta:
        model = Task
        fields = ("id","project","milestone","title","description","column","column_detail","status",
                "status_detail","priority","assignee","assignee_detail","reporter","reporter_detail",
                "due_date","estimated_hours","spent_hours","parent_task","order","checklist_items",
                "comments","created_at","updated_at",)
        read_only_fields = ("id", "reporter", "created_at", "updated_at")
class TaskCreateUpdateSerializer(serializers.ModelSerializer):
    status = serializers.PrimaryKeyRelatedField(
        queryset=TaskStatus.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Task
        fields = (
            "id",
            "project",
            "milestone",
            "title",
            "description",
            "column",
            "status",
            "priority",
            "assignee",
            "due_date",
            "estimated_hours",
            "spent_hours",
            "parent_task",
            "order",
        )
        read_only_fields = ("id",)

class AsyncStandupSerializer(serializers.ModelSerializer):
    user_detail = UserMinimalSerializer(source="user", read_only=True)

    class Meta:
        model = AsyncStandup
        fields = ("id", "user", "user_detail", "yesterday_work", "today_work", "blockers", "created_at")
        read_only_fields = ("id", "user", "created_at")

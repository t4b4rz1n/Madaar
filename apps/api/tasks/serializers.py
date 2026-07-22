import re

from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from accounts.models import User

from .models import (
    AsyncStandup,
    Board,
    Task,
    TaskActivityLog,
    TaskChecklistItem,
    TaskComment,
    TaskStatus,
)


class UserMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "avatar")


class TaskStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskStatus
        fields = ("id", "board", "code", "name", "order", "created_at")
        read_only_fields = ("id", "created_at")


class BoardSerializer(serializers.ModelSerializer):
    statuses = TaskStatusSerializer(many=True, read_only=True)
    created_by_detail = UserMinimalSerializer(source="created_by", read_only=True)

    class Meta:
        model = Board
        fields = (
            "id",
            "title",
            "description",
            "background_color",
            "project",
            "created_by",
            "created_by_detail",
            "order",
            "statuses",
            "created_at",
        )
        read_only_fields = ("id", "created_by", "order", "created_at")

    def validate_background_color(self, value):
        """Validate hex color format (e.g. #6366f1 or #fff)."""
        if value and not re.match(r"^#(?:[0-9a-fA-F]{3}){1,2}$", value):
            raise serializers.ValidationError(
                _("Invalid background_color format. Use hex format like #6366f1.")
            )
        return value


class TaskChecklistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskChecklistItem
        fields = ("id", "task", "description", "is_completed", "created_at")
        read_only_fields = ("id", "task", "created_at")

    def validate_description(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError(
                _("Checklist item description cannot be empty.")
            )
        return value.strip()


class TaskCommentSerializer(serializers.ModelSerializer):
    author_detail = UserMinimalSerializer(source="author", read_only=True)

    class Meta:
        model = TaskComment
        fields = (
            "id",
            "task",
            "author",
            "author_detail",
            "content",
            "attached_file",
            "created_at",
        )
        read_only_fields = ("id", "task", "author", "created_at")

    def validate(self, attrs):
        content = attrs.get("content", "")
        attached_file = attrs.get("attached_file")
        if not content and not attached_file:
            raise serializers.ValidationError(
                _("Comment must contain either text content or an attached file.")
            )
        return attrs


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
    checklist_items = TaskChecklistItemSerializer(many=True, read_only=True)
    comments = TaskCommentSerializer(many=True, read_only=True)
    subtasks_count = serializers.SerializerMethodField()
    progress_percent = serializers.FloatField(read_only=True)
    is_completed = serializers.BooleanField(read_only=True)
    checklist_stats = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = (
            "id",
            "project",
            "milestone",
            "title",
            "description",
            "status",
            "status_detail",
            "priority",
            "assignee",
            "assignee_detail",
            "reporter",
            "reporter_detail",
            "due_date",
            "estimated_hours",
            "spent_hours",
            "parent_task",
            "order",
            "is_completed",
            "progress_percent",
            "subtasks_count",
            "checklist_stats",
            "checklist_items",
            "comments",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "reporter", "created_at", "updated_at")

    def get_subtasks_count(self, obj):
        if hasattr(obj, "annotated_subtasks_count"):
            return obj.annotated_subtasks_count
        return obj.subtasks.count()

    def get_checklist_stats(self, obj):
        if hasattr(obj, "annotated_checklist_total"):
            total = obj.annotated_checklist_total
            done = obj.annotated_checklist_done
        else:
            total = obj.checklist_items.count()
            done = obj.checklist_items.filter(is_completed=True).count()

        percent = round((done / total * 100), 1) if total > 0 else 0.0
        return {"total": total, "done": done, "percent": percent}


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

    def validate_estimated_hours(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError(_("Estimated hours cannot be negative."))
        return value

    def validate_spent_hours(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError(_("Spent hours cannot be negative."))
        return value

    def validate_due_date(self, value):
        if value is not None and value < timezone.now().date():
            raise serializers.ValidationError(_("Due date cannot be in the past."))
        return value

    def validate(self, attrs):
        parent_task = attrs.get("parent_task")
        project = attrs.get("project") or (
            self.instance.project if self.instance else None
        )
        task_status = attrs.get("status")

        # Prevent circular parent assignment
        if self.instance and parent_task and parent_task.id == self.instance.id:
            raise serializers.ValidationError(
                {"parent_task": _("A task cannot be its own parent.")}
            )

        # Ensure parent task belongs to the same project
        if parent_task and project and parent_task.project_id != project.id:
            raise serializers.ValidationError(
                {"parent_task": _("Parent task must belong to the same project.")}
            )

        # Ensure status belongs to a board in the same project
        if (
            task_status
            and project
            and task_status.board
            and task_status.board.project_id != project.id
        ):
            raise serializers.ValidationError(
                {"status": _("Status must belong to a board in the same project.")}
            )

        return attrs


class AsyncStandupSerializer(serializers.ModelSerializer):
    user_detail = UserMinimalSerializer(source="user", read_only=True)

    class Meta:
        model = AsyncStandup
        fields = (
            "id",
            "user",
            "user_detail",
            "yesterday_work",
            "today_work",
            "blockers",
            "created_at",
        )
        read_only_fields = ("id", "user", "created_at")

    def validate(self, attrs):
        yw = attrs.get("yesterday_work", "").strip()
        tw = attrs.get("today_work", "").strip()
        if not yw or not tw:
            raise serializers.ValidationError(
                _("Both yesterday's work and today's work fields are required.")
            )
        return attrs


class OrderItemSerializer(serializers.Serializer):
    id = serializers.UUIDField(help_text=_("UUID of the object to reorder"))
    order = serializers.IntegerField(help_text=_("New 1-based order position"))


class BoardReorderSerializer(serializers.Serializer):
    project_id = serializers.UUIDField(help_text=_("UUID of the project"))
    orders = OrderItemSerializer(
        many=True, help_text=_("List of board ordering objects")
    )


class StatusReorderSerializer(serializers.Serializer):
    board_id = serializers.UUIDField(help_text=_("UUID of the board"))
    orders = OrderItemSerializer(
        many=True, help_text=_("List of status ordering objects")
    )

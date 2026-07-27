from django.db.models import Count, Q
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    AsyncStandup,
    Board,
    Task,
    TaskActivityLog,
    TaskChecklistItem,
    TaskComment,
    TaskStatus,
)
from .permissions import (
    IsAsyncStandupPermission,
    IsBoardPermission,
    IsTaskChecklistPermission,
    IsTaskCommentPermission,
    IsTaskPermission,
    IsTaskStatusPermission,
    get_user_org_role,
)
from .serializers import (
    AsyncStandupSerializer,
    BoardReorderSerializer,
    BoardSerializer,
    StatusReorderSerializer,
    TaskActivityLogSerializer,
    TaskChecklistItemSerializer,
    TaskCommentSerializer,
    TaskCreateUpdateSerializer,
    TaskDetailSerializer,
    TaskListSerializer,
    TaskStatusSerializer,
)
from .services import (
    BoardService,
    ChecklistService,
    CommentService,
    StandupService,
    TaskService,
    TaskStatusService,
)


# Board ViewSet
class BoardViewSet(viewsets.ModelViewSet):
    serializer_class = BoardSerializer
    permission_classes = [IsAuthenticated, IsBoardPermission]

    def get_queryset(self):
        qs = (
            Board.objects.select_related("project", "created_by")
            .prefetch_related("statuses")
            .all()
        )
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    def perform_create(self, serializer):
        title = serializer.validated_data.get("title")
        description = serializer.validated_data.get("description")
        background_color = serializer.validated_data.get("background_color")
        project = serializer.validated_data.get("project")
        board = BoardService.create_board(
            title=title,
            description=description,
            background_color=background_color,
            project=project,
            created_by=self.request.user,
        )
        serializer.instance = board

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted"])
        from .cascade_services import TaskCascadeService

        TaskCascadeService.soft_delete_board(instance)

    @extend_schema(request=BoardReorderSerializer)
    @action(detail=False, methods=["post"], url_path="reorder-boards")
    def reorder_boards(self, request):
        serializer = BoardReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project_id = serializer.validated_data.get("project_id")
        orders = serializer.validated_data.get("orders", [])
        from projects.models import Project

        project = Project.objects.filter(id=project_id).first()
        if not project:
            return Response(
                {"detail": "Project not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        BoardService.reorder_boards(project, orders, actor=request.user)
        updated = (
            Board.objects.select_related("project", "created_by")
            .prefetch_related("statuses")
            .filter(project=project)
            .order_by("order")
            .all()
        )
        return Response(
            BoardSerializer(updated, many=True, context={"request": request}).data
        )

    @action(detail=True, methods=["get"], url_path="activities")
    def activities(self, request, pk=None):
        board = self.get_object()
        logs = TaskActivityLog.objects.filter(board=board).select_related(
            "board", "actor"
        )
        page = self.paginate_queryset(logs)
        if page is not None:
            serializer = TaskActivityLogSerializer(
                page, many=True, context={"request": request}
            )
            return self.get_paginated_response(serializer.data)

        return Response(
            TaskActivityLogSerializer(
                logs, many=True, context={"request": request}
            ).data
        )


# Task Status ViewSet (Kanban Columns - CRUD + Reorder)
class TaskStatusViewSet(viewsets.ModelViewSet):
    serializer_class = TaskStatusSerializer
    permission_classes = [IsAuthenticated, IsTaskStatusPermission]

    def get_queryset(self):
        qs = TaskStatus.objects.select_related("board").all()
        board_id = self.request.query_params.get("board")
        if board_id:
            qs = qs.filter(board_id=board_id)
        return qs

    def perform_create(self, serializer):
        board = serializer.validated_data.get("board")
        code = serializer.validated_data.get("code")
        name = serializer.validated_data.get("name")
        order = serializer.validated_data.get("order")
        status_obj = TaskStatusService.create_status(
            board=board, code=code, name=name, order=order, actor=self.request.user
        )
        serializer.instance = status_obj

    def perform_destroy(self, instance):
        TaskStatusService.delete_status(instance, actor=self.request.user)

    @extend_schema(request=StatusReorderSerializer)
    @action(detail=False, methods=["post"], url_path="reorder")
    def reorder(self, request):
        board_id = request.data.get("board_id")
        orders = request.data.get("orders", [])
        board = Board.objects.filter(id=board_id).first()
        if not board:
            return Response(
                {"detail": "Board not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        TaskStatusService.reorder_statuses(board, orders, actor=request.user)
        updated = (
            TaskStatus.objects.select_related("board")
            .filter(board=board)
            .order_by("order")
            .all()
        )
        return Response(
            TaskStatusSerializer(updated, many=True, context={"request": request}).data
        )


# Task ViewSet
class TaskViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsTaskPermission]
    serializer_class = TaskListSerializer
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = (
            Task.objects.select_related("project", "status", "assignee", "reporter")
            .prefetch_related("checklist_items", "comments")
            .annotate(
                annotated_subtasks_count=Count(
                    "subtasks", filter=Q(subtasks__is_deleted=False), distinct=True
                ),
                annotated_checklist_total=Count(
                    "checklist_items",
                    filter=Q(checklist_items__is_deleted=False),
                    distinct=True,
                ),
                annotated_checklist_done=Count(
                    "checklist_items",
                    filter=Q(
                        checklist_items__is_completed=True,
                        checklist_items__is_deleted=False,
                    ),
                    distinct=True,
                ),
            )
            .all()
        )
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)
        board_id = self.request.query_params.get("board")
        if board_id:
            qs = qs.filter(status__board_id=board_id)
        assignee_id = self.request.query_params.get("assignee")
        if assignee_id:
            qs = qs.filter(assignee_id=assignee_id)
        status_id = self.request.query_params.get("status")
        if status_id:
            qs = qs.filter(status_id=status_id)
        priority = self.request.query_params.get("priority")
        if priority:
            qs = qs.filter(priority=priority)
        parent_only = self.request.query_params.get("parent_only")
        if parent_only == "true":
            qs = qs.filter(parent_task__isnull=True)

        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )

        due_date_after = self.request.query_params.get("due_date_after")
        if due_date_after:
            qs = qs.filter(due_date__gte=due_date_after)

        due_date_before = self.request.query_params.get("due_date_before")
        if due_date_before:
            qs = qs.filter(due_date__lte=due_date_before)

        ordering = self.request.query_params.get("ordering")
        if ordering:
            allowed_fields = {
                "priority",
                "-priority",
                "due_date",
                "-due_date",
                "created_at",
                "-created_at",
                "order",
                "-order",
            }
            order_fields = [
                f.strip() for f in ordering.split(",") if f.strip() in allowed_fields
            ]
            if order_fields:
                return qs.order_by(*order_fields)

        return qs.order_by("order", "-created_at")

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return TaskCreateUpdateSerializer
        if self.action == "list":
            return TaskListSerializer
        return TaskDetailSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        task = TaskService.create_task(
            reporter=request.user,
            **serializer.validated_data,
        )
        return Response(
            TaskDetailSerializer(task, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    def perform_update(self, serializer):
        task = TaskService.update_task(
            task=self.get_object(),
            actor=self.request.user,
            **serializer.validated_data,
        )
        serializer.instance = task

    def perform_destroy(self, instance):
        TaskService.delete_task(task=instance, actor=self.request.user)

    @action(detail=True, methods=["post"], url_path="move")
    def move_task(self, request, pk=None):
        task = self.get_object()
        status_id = request.data.get("status_id")
        new_order = request.data.get("order")

        task_status = None
        if status_id:
            task_status = TaskStatus.objects.filter(id=status_id).first()
            if not task_status:
                from rest_framework.exceptions import ValidationError

                raise ValidationError({"status_id": ["Invalid status ID."]})

        updated_task = TaskService.move_task(
            task=task,
            actor=request.user,
            new_status=task_status,
            new_order=new_order,
        )
        annotated_task = (
            self.get_queryset().filter(id=updated_task.id).first() or updated_task
        )
        return Response(
            TaskDetailSerializer(annotated_task, context={"request": request}).data
        )

    @action(detail=True, methods=["get"], url_path="activities")
    def activities(self, request, pk=None):
        task = self.get_object()
        logs = TaskActivityLog.objects.filter(task=task).select_related(
            "board", "actor"
        )
        page = self.paginate_queryset(logs)
        if page is not None:
            serializer = TaskActivityLogSerializer(
                page, many=True, context={"request": request}
            )
            return self.get_paginated_response(serializer.data)

        return Response(
            TaskActivityLogSerializer(
                logs, many=True, context={"request": request}
            ).data
        )

    @action(detail=True, methods=["get"], url_path="subtasks")
    def subtasks(self, request, pk=None):
        task = self.get_object()
        subs = self.get_queryset().filter(parent_task=task)
        return Response(
            TaskListSerializer(subs, many=True, context={"request": request}).data
        )

    @action(detail=True, methods=["post"], url_path="checklist")
    def add_checklist_item(self, request, pk=None):
        task = self.get_object()
        desc = request.data.get("description")
        item = ChecklistService.add_item(
            task=task, description=desc, actor=request.user
        )
        return Response(
            TaskChecklistItemSerializer(item, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="comments")
    def add_comment(self, request, pk=None):
        task = self.get_object()
        content = request.data.get("content", "")
        file_obj = request.FILES.get("attached_file")
        comment = CommentService.add_comment(
            task=task,
            author=request.user,
            content=content,
            attached_file=file_obj,
        )
        return Response(
            TaskCommentSerializer(comment, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


# Checklist, Comment, Standup ViewSets
class TaskChecklistItemViewSet(viewsets.ModelViewSet):
    serializer_class = TaskChecklistItemSerializer
    permission_classes = [IsAuthenticated, IsTaskChecklistPermission]

    def get_queryset(self):
        qs = TaskChecklistItem.objects.select_related("task").all()
        task_id = self.request.query_params.get("task")
        if task_id:
            qs = qs.filter(task_id=task_id)
        return qs

    @action(detail=True, methods=["post"], url_path="toggle")
    def toggle(self, request, pk=None):
        item = self.get_object()
        updated = ChecklistService.toggle_item(item=item, actor=request.user)
        return Response(
            TaskChecklistItemSerializer(updated, context={"request": request}).data
        )

    def perform_destroy(self, instance):
        ChecklistService.delete_item(instance, actor=self.request.user)


class TaskCommentViewSet(viewsets.ModelViewSet):
    serializer_class = TaskCommentSerializer
    permission_classes = [IsAuthenticated, IsTaskCommentPermission]

    def get_queryset(self):
        qs = TaskComment.objects.select_related("author", "task").all()
        task_id = self.request.query_params.get("task")
        if task_id:
            qs = qs.filter(task_id=task_id)
        return qs

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted"])


class AsyncStandupViewSet(viewsets.ModelViewSet):
    serializer_class = AsyncStandupSerializer
    permission_classes = [IsAuthenticated, IsAsyncStandupPermission]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return AsyncStandup.objects.none()

        qs = AsyncStandup.objects.select_related("user").all()

        user_id = self.request.query_params.get("user")
        if user_id:
            role = get_user_org_role(self.request)
            is_admin = (
                user.is_staff or user.is_superuser or role in ["owner", "admin", "hr"]
            )
            if str(user_id) != str(user.id) and not is_admin:
                if role == "team_lead":
                    team_ids = user.team_memberships.values_list("team_id", flat=True)
                    has_access = AsyncStandup.objects.filter(
                        user_id=user_id, user__team_memberships__team_id__in=team_ids
                    ).exists()
                    if not has_access:
                        return qs.none()
                else:
                    return qs.none()
            qs = qs.filter(user_id=user_id)

        if user.is_staff or user.is_superuser:
            return qs

        role = get_user_org_role(self.request)
        if role in ["owner", "admin", "hr"]:
            return qs

        if role == "team_lead":
            team_ids = user.team_memberships.values_list("team_id", flat=True)
            return qs.filter(
                Q(user=user) | Q(user__team_memberships__team_id__in=team_ids)
            ).distinct()

        # Employees only see their own standup reports
        return qs.filter(user=user)

    def perform_create(self, serializer):
        standup = StandupService.create_standup(
            user=self.request.user,
            yesterday_work=serializer.validated_data.get("yesterday_work"),
            today_work=serializer.validated_data.get("today_work"),
            blockers=serializer.validated_data.get("blockers"),
        )
        serializer.instance = standup

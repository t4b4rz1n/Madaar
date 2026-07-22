from django.db.models import Q
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
    BoardSerializer,
    TaskActivityLogSerializer,
    TaskChecklistItemSerializer,
    TaskCommentSerializer,
    TaskCreateUpdateSerializer,
    TaskSerializer,
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
        qs = Board.objects.all()
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

    @action(detail=False, methods=["post"], url_path="reorder-boards")
    def reorder_boards(self, request):
        project_id = request.data.get("project_id")
        orders = request.data.get("orders", [])
        from projects.models import Project

        project = Project.objects.filter(id=project_id).first()
        if project:
            BoardService.reorder_boards(project, orders)
        return Response({"status": "boards reordered"})


# Task Status ViewSet (Kanban Columns - CRUD + Reorder)
class TaskStatusViewSet(viewsets.ModelViewSet):
    serializer_class = TaskStatusSerializer
    permission_classes = [IsAuthenticated, IsTaskStatusPermission]

    def get_queryset(self):
        qs = TaskStatus.objects.all()
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

    @action(detail=False, methods=["post"], url_path="reorder")
    def reorder(self, request):
        board_id = request.data.get("board_id")
        orders = request.data.get("orders", [])
        board = Board.objects.filter(id=board_id).first()
        if board:
            TaskStatusService.reorder_statuses(board, orders, actor=request.user)
        return Response({"status": "statuses reordered"})


# Task ViewSet
class TaskViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsTaskPermission]

    def get_queryset(self):
        from django.db.models import Count, Q

        qs = (
            Task.objects.select_related("project", "status", "assignee", "reporter")
            .annotate(
                annotated_subtasks_count=Count("subtasks", distinct=True),
                annotated_checklist_total=Count("checklist_items", distinct=True),
                annotated_checklist_done=Count(
                    "checklist_items",
                    filter=Q(checklist_items__is_completed=True),
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
        return qs.order_by("order", "-created_at")

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return TaskCreateUpdateSerializer
        return TaskSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        task = TaskService.create_task(
            reporter=request.user,
            **serializer.validated_data,
        )
        return Response(TaskSerializer(task).data, status=status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        task = TaskService.update_task(
            task=self.get_object(),
            actor=self.request.user,
            **serializer.validated_data,
        )
        serializer.instance = task

    @action(detail=True, methods=["post"], url_path="move")
    def move_task(self, request, pk=None):
        task = self.get_object()
        status_id = request.data.get("status_id")
        new_order = request.data.get("order")

        task_status = TaskStatus.objects.filter(id=status_id).first() if status_id else None

        updated_task = TaskService.move_task(
            task=task,
            actor=request.user,
            new_status=task_status,
            new_order=new_order,
        )
        return Response(TaskSerializer(updated_task).data)

    @action(detail=True, methods=["get"], url_path="activities")
    def activities(self, request, pk=None):
        task = self.get_object()
        logs = TaskActivityLog.objects.filter(task=task)
        return Response(TaskActivityLogSerializer(logs, many=True).data)

    @action(detail=True, methods=["get"], url_path="subtasks")
    def subtasks(self, request, pk=None):
        task = self.get_object()
        subs = Task.objects.filter(parent_task=task)
        return Response(TaskSerializer(subs, many=True).data)

    @action(detail=True, methods=["post"], url_path="checklist")
    def add_checklist_item(self, request, pk=None):
        task = self.get_object()
        desc = request.data.get("description")
        item = ChecklistService.add_item(task=task, description=desc, actor=request.user)
        return Response(
            TaskChecklistItemSerializer(item).data, status=status.HTTP_201_CREATED
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
            TaskCommentSerializer(comment).data, status=status.HTTP_201_CREATED
        )


# Checklist, Comment, Standup ViewSets
class TaskChecklistItemViewSet(viewsets.ModelViewSet):
    serializer_class = TaskChecklistItemSerializer
    permission_classes = [IsAuthenticated, IsTaskChecklistPermission]

    def get_queryset(self):
        qs = TaskChecklistItem.objects.all()
        task_id = self.request.query_params.get("task")
        if task_id:
            qs = qs.filter(task_id=task_id)
        return qs

    @action(detail=True, methods=["post"], url_path="toggle")
    def toggle(self, request, pk=None):
        item = self.get_object()
        updated = ChecklistService.toggle_item(item=item, actor=request.user)
        return Response(TaskChecklistItemSerializer(updated).data)

    def perform_destroy(self, instance):
        ChecklistService.delete_item(instance, actor=self.request.user)


class TaskCommentViewSet(viewsets.ModelViewSet):
    serializer_class = TaskCommentSerializer
    permission_classes = [IsAuthenticated, IsTaskCommentPermission]

    def get_queryset(self):
        qs = TaskComment.objects.all()
        task_id = self.request.query_params.get("task")
        if task_id:
            qs = qs.filter(task_id=task_id)
        return qs


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


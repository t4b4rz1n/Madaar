from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

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
from .permissions import IsTaskAssigneeOrReporterOrReadOnly
from .serializers import (
    AsyncStandupSerializer,
    BoardColumnSerializer,
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
)


class TaskStatusViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TaskStatus.objects.all()
    serializer_class = TaskStatusSerializer
    permission_classes = [IsAuthenticated]


class BoardViewSet(viewsets.ModelViewSet):
    queryset = Board.objects.all()
    serializer_class = BoardSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        title = serializer.validated_data.get("title")
        project = serializer.validated_data.get("project")
        board = BoardService.create_board(
            title=title,
            project=project,
            created_by=self.request.user,
        )
        serializer.instance = board

    @action(detail=True, methods=["post"], url_path="columns")
    def add_column(self, request, pk=None):
        board = self.get_object()
        title = request.data.get("title")
        order = request.data.get("order")
        col = BoardService.create_column(board=board, title=title, order=order)
        return Response(BoardColumnSerializer(col).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="reorder-columns")
    def reorder_columns(self, request, pk=None):
        board = self.get_object()
        orders = request.data.get("orders", [])
        BoardService.reorder_columns(board, orders)
        return Response({"status": "columns reordered"})


class BoardColumnViewSet(viewsets.ModelViewSet):
    queryset = BoardColumn.objects.all()
    serializer_class = BoardColumnSerializer
    permission_classes = [IsAuthenticated]


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    permission_classes = [IsAuthenticated, IsTaskAssigneeOrReporterOrReadOnly]

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
        col_id = request.data.get("column_id")
        status_id = request.data.get("status_id")
        new_order = request.data.get("order")

        column = BoardColumn.objects.filter(id=col_id).first() if col_id else None
        task_status = TaskStatus.objects.filter(id=status_id).first() if status_id else None

        updated_task = TaskService.move_task(
            task=task,
            actor=request.user,
            new_column=column,
            new_status=task_status,
            new_order=new_order,
        )
        return Response(TaskSerializer(updated_task).data)

    @action(detail=True, methods=["get"], url_path="activities")
    def activities(self, request, pk=None):
        task = self.get_object()
        logs = TaskActivityLog.objects.filter(task=task)
        return Response(TaskActivityLogSerializer(logs, many=True).data)

    @action(detail=True, methods=["post"], url_path="checklist")
    def add_checklist_item(self, request, pk=None):
        task = self.get_object()
        desc = request.data.get("description")
        item = ChecklistService.add_item(task=task, description=desc, actor=request.user)
        return Response(TaskChecklistItemSerializer(item).data, status=status.HTTP_201_CREATED)

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
        return Response(TaskCommentSerializer(comment).data, status=status.HTTP_201_CREATED)


class TaskChecklistItemViewSet(viewsets.ModelViewSet):
    queryset = TaskChecklistItem.objects.all()
    serializer_class = TaskChecklistItemSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=["post"], url_path="toggle")
    def toggle(self, request, pk=None):
        item = self.get_object()
        updated = ChecklistService.toggle_item(item=item, actor=request.user)
        return Response(TaskChecklistItemSerializer(updated).data)


class TaskCommentViewSet(viewsets.ModelViewSet):
    queryset = TaskComment.objects.all()
    serializer_class = TaskCommentSerializer
    permission_classes = [IsAuthenticated]


class AsyncStandupViewSet(viewsets.ModelViewSet):
    queryset = AsyncStandup.objects.all()
    serializer_class = AsyncStandupSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        standup = StandupService.create_standup(
            user=self.request.user,
            yesterday_work=serializer.validated_data.get("yesterday_work"),
            today_work=serializer.validated_data.get("today_work"),
            blockers=serializer.validated_data.get("blockers"),
        )
        serializer.instance = standup

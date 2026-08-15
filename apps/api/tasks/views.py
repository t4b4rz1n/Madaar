from django.db.models import Count, Exists, OuterRef, Q
from django.utils.translation import gettext_lazy as _
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

from attendance.models import TimeLog

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
    pagination_class = PageNumberPagination
    throttle_classes = [UserRateThrottle, AnonRateThrottle]

    def get_queryset(self):
        user = self.request.user
        # Org isolation: find all orgs the user belongs to
        org_ids = (
            user.org_memberships.values_list("organization_id", flat=True)
            if not (user.is_staff or user.is_superuser)
            else None
        )

        qs = (
            Board.objects.select_related("project", "created_by")
            .prefetch_related("statuses")
            .filter(is_deleted=False)
        )
        if org_ids is not None:
            qs = qs.filter(project__organization_id__in=org_ids)

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
        return Response(BoardSerializer(updated, many=True, context={"request": request}).data)

    @action(detail=True, methods=["get"], url_path="activities")
    def activities(self, request, pk=None):
        board = self.get_object()
        logs = TaskActivityLog.objects.filter(board=board).select_related("board", "actor")
        page = self.paginate_queryset(logs)
        if page is not None:
            serializer = TaskActivityLogSerializer(page, many=True, context={"request": request})
            return self.get_paginated_response(serializer.data)

        return Response(
            TaskActivityLogSerializer(logs, many=True, context={"request": request}).data
        )


# Task Status ViewSet (Kanban Columns - CRUD + Reorder)
class TaskStatusViewSet(viewsets.ModelViewSet):
    serializer_class = TaskStatusSerializer
    permission_classes = [IsAuthenticated, IsTaskStatusPermission]
    pagination_class = PageNumberPagination
    throttle_classes = [UserRateThrottle, AnonRateThrottle]

    def get_queryset(self):
        user = self.request.user
        org_ids = (
            user.org_memberships.values_list("organization_id", flat=True)
            if not (user.is_staff or user.is_superuser)
            else None
        )

        qs = TaskStatus.objects.select_related("board", "board__project").filter(is_deleted=False)
        if org_ids is not None:
            qs = qs.filter(board__project__organization_id__in=org_ids)

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
            TaskStatus.objects.select_related("board").filter(board=board).order_by("order").all()
        )
        return Response(TaskStatusSerializer(updated, many=True, context={"request": request}).data)


# Task ViewSet
class TaskViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsTaskPermission]
    serializer_class = TaskListSerializer
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    pagination_class = PageNumberPagination
    throttle_classes = [UserRateThrottle, AnonRateThrottle]

    def get_queryset(self):
        user = self.request.user
        org_ids = (
            user.org_memberships.values_list("organization_id", flat=True)
            if not (user.is_staff or user.is_superuser)
            else None
        )

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
                annotated_comments_count=Count(
                    "comments",
                    filter=Q(comments__is_deleted=False),
                    distinct=True,
                ),
            )
            .annotate(
                is_active_timer_running=Exists(
                    TimeLog.objects.filter(task=OuterRef("pk"), is_active=True, is_deleted=False)
                )
            )
            .filter(is_deleted=False)
        )
        # Org isolation
        if org_ids is not None:
            qs = qs.filter(project__organization_id__in=org_ids)

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
            qs = qs.filter(Q(title__icontains=search) | Q(description__icontains=search))

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
            order_fields = [f.strip() for f in ordering.split(",") if f.strip() in allowed_fields]
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
        if new_order is not None:
            new_order = int(new_order)

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
        annotated_task = self.get_queryset().filter(id=updated_task.id).first() or updated_task
        return Response(TaskDetailSerializer(annotated_task, context={"request": request}).data)

    @extend_schema(request=None)
    @action(detail=True, methods=["post"], url_path="mark-done")
    def mark_done(self, request, pk=None):
        task = self.get_object()

        if not task.status or not task.status.board:
            from rest_framework.exceptions import ValidationError

            raise ValidationError({"error": _("Task has no valid status.")})

        is_done = task.status.code.lower() == "done" if task.status and task.status.code else False

        if is_done:
            from rest_framework.exceptions import ValidationError

            raise ValidationError(
                {
                    "error": _(
                        "Task is completed (Done) and locked. It cannot be moved to another status."
                    )
                }
            )

        target_code = "done"

        target_status = TaskStatus.objects.filter(
            board=task.status.board, code__iexact=target_code
        ).first()
        if not target_status:
            from rest_framework.exceptions import ValidationError

            raise ValidationError(
                {"error": f"Target status '{target_code}' not found on this board."}
            )

        updated_task = TaskService.move_task(
            task=task, actor=request.user, new_status=target_status
        )

        annotated_task = self.get_queryset().filter(id=updated_task.id).first() or updated_task
        return Response(TaskDetailSerializer(annotated_task, context={"request": request}).data)

    @action(detail=True, methods=["get"], url_path="activities")
    def activities(self, request, pk=None):
        task = self.get_object()
        logs = TaskActivityLog.objects.filter(task=task).select_related("board", "actor")
        page = self.paginate_queryset(logs)
        if page is not None:
            serializer = TaskActivityLogSerializer(page, many=True, context={"request": request})
            return self.get_paginated_response(serializer.data)

        return Response(
            TaskActivityLogSerializer(logs, many=True, context={"request": request}).data
        )

    @action(detail=True, methods=["get"], url_path="subtasks")
    def subtasks(self, request, pk=None):
        task = self.get_object()
        subs = self.get_queryset().filter(parent_task=task)
        return Response(TaskListSerializer(subs, many=True, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="checklist")
    def add_checklist_item(self, request, pk=None):
        task = self.get_object()
        desc = request.data.get("description")
        item = ChecklistService.add_item(task=task, description=desc, actor=request.user)
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

    @action(detail=False, methods=["post"], url_path="reorder")
    def reorder(self, request):
        orders = request.data.get("orders", [])
        if not orders:
            from rest_framework.exceptions import ValidationError

            raise ValidationError({"orders": ["This field is required."]})

        tasks_to_update = []
        for item in orders:
            task_id = item.get("id")
            new_order = item.get("order")
            if task_id and new_order is not None:
                task = Task.objects.filter(id=task_id).first()
                if task:
                    task.order = new_order
                    tasks_to_update.append(task)

        if tasks_to_update:
            Task.objects.bulk_update(tasks_to_update, ["order"])

        return Response({"status": "success"})


# Checklist, Comment, Standup ViewSets
class TaskChecklistItemViewSet(viewsets.ModelViewSet):
    serializer_class = TaskChecklistItemSerializer
    permission_classes = [IsAuthenticated, IsTaskChecklistPermission]
    pagination_class = PageNumberPagination
    throttle_classes = [UserRateThrottle, AnonRateThrottle]

    def get_queryset(self):
        user = self.request.user
        org_ids = (
            user.org_memberships.values_list("organization_id", flat=True)
            if not (user.is_staff or user.is_superuser)
            else None
        )

        qs = TaskChecklistItem.objects.select_related("task", "task__project").filter(
            is_deleted=False
        )
        if org_ids is not None:
            qs = qs.filter(task__project__organization_id__in=org_ids)

        task_id = self.request.query_params.get("task")
        if task_id:
            qs = qs.filter(task_id=task_id)
        return qs

    def perform_create(self, serializer):
        task = serializer.validated_data.get("task")
        desc = serializer.validated_data.get("description")
        item = ChecklistService.add_item(task=task, description=desc, actor=self.request.user)
        serializer.instance = item

    @action(detail=True, methods=["post"], url_path="toggle")
    def toggle(self, request, pk=None):
        item = self.get_object()
        updated = ChecklistService.toggle_item(item=item, actor=request.user)
        return Response(TaskChecklistItemSerializer(updated, context={"request": request}).data)

    def perform_destroy(self, instance):
        ChecklistService.delete_item(instance, actor=self.request.user)


class TaskCommentViewSet(viewsets.ModelViewSet):
    serializer_class = TaskCommentSerializer
    permission_classes = [IsAuthenticated, IsTaskCommentPermission]
    pagination_class = PageNumberPagination
    throttle_classes = [UserRateThrottle, AnonRateThrottle]

    def get_queryset(self):
        user = self.request.user
        org_ids = (
            user.org_memberships.values_list("organization_id", flat=True)
            if not (user.is_staff or user.is_superuser)
            else None
        )

        qs = TaskComment.objects.select_related("author", "task", "task__project").filter(
            is_deleted=False
        )
        if org_ids is not None:
            qs = qs.filter(task__project__organization_id__in=org_ids)

        task_id = self.request.query_params.get("task")
        if task_id:
            qs = qs.filter(task_id=task_id)
        return qs

    def perform_create(self, serializer):
        task = serializer.validated_data.get("task")
        content = serializer.validated_data.get("content", "")
        attached_file = serializer.validated_data.get("attached_file")
        comment = CommentService.add_comment(
            task=task,
            author=self.request.user,
            content=content,
            attached_file=attached_file,
        )
        serializer.instance = comment

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted"])


class AsyncStandupViewSet(viewsets.ModelViewSet):
    serializer_class = AsyncStandupSerializer
    permission_classes = [IsAuthenticated, IsAsyncStandupPermission]
    pagination_class = PageNumberPagination
    throttle_classes = [UserRateThrottle, AnonRateThrottle]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return AsyncStandup.objects.none()

        if user.is_staff or user.is_superuser:
            qs = AsyncStandup.objects.select_related("user").filter(is_deleted=False)
        else:
            memberships = user.org_memberships.all()
            admin_org_ids = [m.organization_id for m in memberships if m.role.lower() in ["owner", "admin"]]
            other_org_ids = [m.organization_id for m in memberships if m.role.lower() not in ["owner", "admin"]]

            qs = AsyncStandup.objects.select_related("user").filter(is_deleted=False)
            
            from django.db.models import Q
            qs = qs.filter(
                Q(organization_id__in=admin_org_ids) | 
                Q(user=user)
            )

        user_id = self.request.query_params.get("user")
        if user_id:
            qs = qs.filter(user_id=user_id)
            
        org_id = self.request.query_params.get("organization")
        if org_id:
            qs = qs.filter(organization_id=org_id)

        return qs.distinct()

    def perform_create(self, serializer):
        standup = StandupService.create_standup(
            user=self.request.user,
            organization=serializer.validated_data.get("organization"),
            yesterday_work=serializer.validated_data.get("yesterday_work"),
            today_work=serializer.validated_data.get("today_work"),
            blockers=serializer.validated_data.get("blockers"),
        )
        serializer.instance = standup

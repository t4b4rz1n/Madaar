from rest_framework.routers import DefaultRouter

from .views import (
    AsyncStandupViewSet,
    BoardViewSet,
    TaskChecklistItemViewSet,
    TaskCommentViewSet,
    TaskStatusViewSet,
    TaskViewSet,
)

router = DefaultRouter()
router.register("statuses", TaskStatusViewSet, basename="task-status")
router.register("boards", BoardViewSet, basename="task-board")
router.register("checklist-items", TaskChecklistItemViewSet, basename="task-checklist-item")
router.register("comments", TaskCommentViewSet, basename="task-comment")
router.register("standups", AsyncStandupViewSet, basename="task-standup")
router.register("", TaskViewSet, basename="task")

urlpatterns = router.urls

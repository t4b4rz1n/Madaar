from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"", views.TicketViewSet, basename="ticket")

urlpatterns = [
    path("", include(router.urls)),
    path(
        "<uuid:id>/messages/",
        views.MessageListCreateAPIView.as_view(),
        name="ticket-messages-list-create",
    ),
    path(
        "messages/<uuid:id>/",
        views.MessageRetrieveUpdateDestroyAPIView.as_view(),
        name="message-detail-update-destroy",
    ),
]

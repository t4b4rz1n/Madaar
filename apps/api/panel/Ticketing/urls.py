from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

dashboard_router = DefaultRouter()
dashboard_router.register(r"", views.StaffTicketViewSet, basename="staff-ticket")

urlpatterns = [
    path("", include(dashboard_router.urls)),
    path(
        "<uuid:id>/messages/",
        views.StaffMessageListCreateAPIView.as_view(),
        name="staff-ticket-messages",
    ),
    path(
        "messages/<uuid:id>/",
        views.StaffMessageRetrieveUpdateDestroyAPIView.as_view(),
        name="staff-message-detail",
    ),
]

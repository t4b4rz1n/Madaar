from django.urls import path

from . import views

urlpatterns = [
    path(
        "send-broadcast/",
        views.BroadcastNotificationAPIView.as_view(),
        name="send-broadcast-notification",
    ),
]

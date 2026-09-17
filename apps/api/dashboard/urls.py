from django.urls import include, path

urlpatterns = [
    path("notifications/", include("dashboard.Notification.urls")),
    path("feedbacks/", include("dashboard.Feedback.urls")),
]

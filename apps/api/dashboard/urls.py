from django.urls import include, path
from rest_framework.routers import DefaultRouter

from dashboard.Ticketing import views

router = DefaultRouter()
router.register(r"ticket-types", views.TicketTypeViewSet, basename="ticket-type")

urlpatterns = [
    path("tickets/", include("dashboard.Ticketing.urls")),
    path("", include(router.urls)),
    path("notifications/", include("dashboard.Notification.urls")),
    path("feedbacks/", include("dashboard.Feedback.urls")),
]

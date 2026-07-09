from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

dashboard_router = DefaultRouter()
dashboard_router.register(r"", views.StaffFeedbackViewSet, basename="staff-feedback")

urlpatterns = [
    path("", include(dashboard_router.urls)),
]

from django.urls import path

from .views import UserListCreateView, UserRetrieveUpdateDestroyView

app_name = "organization_users"

urlpatterns = [
    path("", UserListCreateView.as_view(), name="user-list-create"),
    path("<uuid:pk>/", UserRetrieveUpdateDestroyView.as_view(), name="user-detail"),
]

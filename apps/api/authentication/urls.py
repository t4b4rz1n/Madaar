from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import LogoutView, MyTokenObtainPairView, UserRegisterView

urlpatterns = [
    path("register/", UserRegisterView.as_view(), name="auth_register"),
    path("login/", MyTokenObtainPairView.as_view(), name="auth_login"),
    path("login/refresh/", TokenRefreshView.as_view(), name="auth_refresh"),
    path("logout/", LogoutView.as_view(), name="auth_logout"),
]

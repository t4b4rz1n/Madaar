from django.conf import settings
from django.contrib.auth import get_user_model, logout
from django.shortcuts import redirect
from django.urls import reverse
from django.utils.http import url_has_allowed_host_and_scheme
from django.views import View
from drf_yasg.utils import swagger_auto_schema
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import LogoutSerializer, MyTokenObtainPairSerializer, UserRegisterSerializer

User = get_user_model()


class SwaggerSessionLogoutView(View):
    http_method_names = ["get", "post", "head", "options"]

    def get(self, request, *args, **kwargs):
        return self.logout(request)

    def post(self, request, *args, **kwargs):
        return self.logout(request)

    def logout(self, request):
        next_url = request.GET.get("next") or request.POST.get("next") or reverse("schema-swagger-ui")
        allowed_hosts = {request.get_host(), *settings.ALLOWED_HOSTS}

        if not url_has_allowed_host_and_scheme(
            next_url,
            allowed_hosts=allowed_hosts,
            require_https=request.is_secure(),
        ):
            next_url = reverse("schema-swagger-ui")

        logout(request)
        return redirect(next_url)


class UserRegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = UserRegisterSerializer


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


class LogoutView(APIView):
    permission_classes = (IsAuthenticated,)

    @swagger_auto_schema(
        request_body=LogoutSerializer,
        responses={204: "Refresh token blacklisted successfully."},
    )
    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            refresh_token = serializer.validated_data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()

            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

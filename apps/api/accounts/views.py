from django.contrib.auth import get_user_model
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import generics
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated

from .serializers import UserUpdateSerializer

User = get_user_model()

profile_image_param = openapi.Parameter(
    "profile_image",
    openapi.IN_FORM,
    type=openapi.TYPE_FILE,
    description="Profile image file (png, jpg, jpeg, max 5MB)",
    required=False,
)

first_name_param = openapi.Parameter(
    "first_name",
    openapi.IN_FORM,
    type=openapi.TYPE_STRING,
    description="First name",
    required=False,
)

last_name_param = openapi.Parameter(
    "last_name",
    openapi.IN_FORM,
    type=openapi.TYPE_STRING,
    description="Last name",
    required=False,
)

password_param = openapi.Parameter(
    "password",
    openapi.IN_FORM,
    type=openapi.TYPE_STRING,
    description="New password (optional)",
    required=False,
)

password_confirm_param = openapi.Parameter(
    "password_confirm",
    openapi.IN_FORM,
    type=openapi.TYPE_STRING,
    description="Confirm new password",
    required=False,
)


class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserUpdateSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        return self.request.user

    @swagger_auto_schema(
        operation_description="Partially update user profile",
        manual_parameters=[
            profile_image_param,
            first_name_param,
            last_name_param,
            password_param,
            password_confirm_param,
        ],
        consumes=["multipart/form-data"],
        responses={200: UserUpdateSerializer()},
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_description="Fully update user profile (use partial=True for PATCH)",
        manual_parameters=[
            profile_image_param,
            first_name_param,
            last_name_param,
            password_param,
            password_confirm_param,
        ],
        consumes=["multipart/form-data"],
        responses={200: UserUpdateSerializer()},
    )
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)
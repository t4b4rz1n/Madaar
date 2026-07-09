from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.utils.mixins import FieldFilterOverviewMixin
from common.utils.notification_tasks import send_broadcast_notification_task

from .serializers import BroadcastNotificationSerializer

User = get_user_model()


class BroadcastNotificationAPIView(FieldFilterOverviewMixin, APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, *args, **kwargs):
        serializer = BroadcastNotificationSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        text = serializer.validated_data.get("text")
        link = serializer.validated_data.get("link")

        total_users = User.objects.filter(is_active=True).count()

        if total_users == 0:
            return Response(
                {"message": "No active users found to send notifications to."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        send_broadcast_notification_task.delay(text, link)

        response_message = f"Broadcast notification task for {total_users} users has been started in the background."

        return Response(
            {"message": response_message, "user_count": total_users},
            status=status.HTTP_202_ACCEPTED,
        )

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from common.utils.mixins import FieldFilterOverviewMixin
from panel.Notification.models import Notification

from .filters import NotificationFilter
from .serializers import NotificationSerializer


class NotificationViewSet(FieldFilterOverviewMixin, viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = NotificationFilter
    search_fields = ["text"]
    ordering_fields = ["created_at", "seen"]
    lookup_field = "id"

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=False, methods=["get"], url_path="unread")
    def unread_notifications(self, request):
        queryset = self.get_queryset().filter(seen=False)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["patch"], url_path="mark-seen")
    def mark_seen(self, request, id=None):
        notification = self.get_object()
        if not notification.seen:
            notification.seen = True
            notification.save(update_fields=["seen"])

        serializer = self.get_serializer(notification)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="mark-all-seen")
    def mark_all_seen(self, request):
        queryset = self.get_queryset().filter(seen=False)
        updated_count = queryset.update(seen=True)

        return Response(
            {"message": f"Successfully marked {updated_count} notifications as seen."},
            status=status.HTTP_200_OK,
        )

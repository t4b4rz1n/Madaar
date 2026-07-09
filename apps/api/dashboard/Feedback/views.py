from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated

from common.utils.mixins import FieldFilterOverviewMixin
from panel.Feedback.models import Feedback

from .serializers import FeedbackSerializer


class FeedbackViewSet(FieldFilterOverviewMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = FeedbackSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["subject", "text"]
    ordering_fields = ["created_at"]
    lookup_field = "id"
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return Feedback.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

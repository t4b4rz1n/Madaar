from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAdminUser, IsAuthenticated

from billing.models import DiscountCode
from common.utils.mixins import FieldFilterOverviewMixin

from .filters import DiscountCodeFilter
from .serializers import StaffDiscountCodeSerializer


class StaffDiscountCodeViewSet(FieldFilterOverviewMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = StaffDiscountCodeSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = DiscountCodeFilter
    search_fields = ["code", "description"]
    ordering_fields = ["created_at", "expiration_date", "percent", "current_usage"]
    lookup_field = "id"

    def get_queryset(self):
        return DiscountCode.objects.all()

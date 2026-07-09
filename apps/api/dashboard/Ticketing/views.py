from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from drf_yasg import openapi
from drf_yasg.utils import no_body, swagger_auto_schema
from rest_framework import generics, mixins, viewsets
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from common.utils.mixins import FieldFilterOverviewMixin
from panel.Ticketing.models import Message, Ticket

from .filters import MessageFilter, TicketFilter
from .serializers import (
    MessageCreateSerializer,
    MessageSerializer,
    TicketCreateSerializer,
    TicketDetailSerializer,
    TicketListSerializer,
    TicketStatusUpdateSerializer,
)

ATTACHMENTS_PARAMETER = openapi.Parameter(
    "attachments",
    openapi.IN_FORM,
    description=(
        "Optional ticket attachment. To upload multiple files, send this form field more than once."
    ),
    type=openapi.TYPE_FILE,
    required=False,
)

MESSAGE_CREATE_FORM_PARAMETERS = [
    openapi.Parameter("text", openapi.IN_FORM, type=openapi.TYPE_STRING, required=True),
    ATTACHMENTS_PARAMETER,
]

TICKET_CREATE_FORM_PARAMETERS = [
    openapi.Parameter("title", openapi.IN_FORM, type=openapi.TYPE_STRING, required=True),
    openapi.Parameter("ticket_type", openapi.IN_FORM, type=openapi.TYPE_STRING, required=True),
    openapi.Parameter(
        "priority",
        openapi.IN_FORM,
        type=openapi.TYPE_STRING,
        enum=[choice[0] for choice in Ticket.Priority.choices],
        required=False,
    ),
    openapi.Parameter("text", openapi.IN_FORM, type=openapi.TYPE_STRING, required=True),
    ATTACHMENTS_PARAMETER,
]


class TicketViewSet(
    FieldFilterOverviewMixin,
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_class = TicketFilter
    search_fields = ["title", "messages__text"]
    lookup_field = "id"
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        return Ticket.objects.filter(user=self.request.user).select_related("ticket_type", "user")

    def get_serializer_class(self):
        if self.action == "create":
            return TicketCreateSerializer
        if self.action == "list":
            return TicketListSerializer
        if self.action == "set_status":
            return TicketStatusUpdateSerializer
        return TicketDetailSerializer

    @swagger_auto_schema(
        request_body=no_body,
        manual_parameters=TICKET_CREATE_FORM_PARAMETERS,
        consumes=["multipart/form-data"],
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @action(detail=True, methods=["patch"], url_path="set-status")
    def set_status(self, request, id=None):
        ticket = self.get_object()
        serializer = self.get_serializer(ticket, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(TicketDetailSerializer(ticket).data)

    def perform_create(self, serializer):
        serializer.save()


class MessageListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_class = MessageFilter
    search_fields = ["text"]

    def get_ticket(self):
        id = self.kwargs.get("id")
        ticket = get_object_or_404(Ticket, id=id, user=self.request.user)
        return ticket

    def get_queryset(self):
        ticket = self.get_ticket()
        return (
            Message.objects.filter(ticket=ticket)
            .select_related("sender")
            .prefetch_related("attachments")
        )

    def get_serializer_class(self):
        if self.request.method == "POST":
            return MessageCreateSerializer
        return MessageSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if getattr(self, "swagger_fake_view", False):
            return context

        context["ticket"] = self.get_ticket()
        context["request"] = self.request
        return context

    @swagger_auto_schema(
        request_body=no_body,
        manual_parameters=MESSAGE_CREATE_FORM_PARAMETERS,
        consumes=["multipart/form-data"],
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        queryset.filter(seen=False).exclude(sender=request.user).update(seen=True)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class MessageRetrieveUpdateDestroyAPIView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MessageSerializer
    lookup_field = "id"

    def get_queryset(self):
        return Message.objects.filter(sender=self.request.user)

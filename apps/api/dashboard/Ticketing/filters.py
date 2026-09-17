from django_filters import rest_framework as filters

from panel.Ticketing.models import Message, Ticket


class TicketFilter(filters.FilterSet):
    created_at = filters.DateFromToRangeFilter()

    class Meta:
        model = Ticket
        fields = {
            "status": ["exact", "in"],
            "priority": ["exact", "in"],
            "ticket_type": ["exact"],
            "created_at": ["exact"],
        }


class MessageFilter(filters.FilterSet):
    created_at = filters.DateFromToRangeFilter()

    class Meta:
        model = Message
        fields = ["created_at"]

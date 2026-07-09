from django.contrib.auth import get_user_model
from django_filters import rest_framework as filters

from panel.Ticketing.models import Message, Ticket

User = get_user_model()


class StaffTicketFilter(filters.FilterSet):
    created_at = filters.DateFromToRangeFilter()
    user = filters.ModelChoiceFilter(queryset=User.objects.all())

    class Meta:
        model = Ticket
        fields = {
            "status": ["exact", "in"],
            "priority": ["exact", "in"],
            "ticket_type": ["exact"],
            "created_at": ["exact"],
            "user": ["exact"],
        }


class MessageFilter(filters.FilterSet):
    created_at = filters.DateFromToRangeFilter()

    class Meta:
        model = Message
        fields = ["created_at"]

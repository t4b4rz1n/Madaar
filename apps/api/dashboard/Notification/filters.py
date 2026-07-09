from django_filters import rest_framework as filters

from panel.Notification.models import Notification


class NotificationFilter(filters.FilterSet):
    created_at = filters.DateFromToRangeFilter()

    class Meta:
        model = Notification
        fields = ["seen", "created_at"]

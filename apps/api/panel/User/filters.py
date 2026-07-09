from django_filters import rest_framework as filters

from accounts.models import User


class UserFilter(filters.FilterSet):
    created_at = filters.DateFromToRangeFilter(field_name="date_joined")

    class Meta:
        model = User
        fields = {
            "username": ["exact", "icontains"],
            "email": ["exact", "icontains"],
            "first_name": ["icontains"],
            "last_name": ["icontains"],
            "is_active": ["exact"],
            "is_staff": ["exact"],
            "date_joined": ["exact"],
        }

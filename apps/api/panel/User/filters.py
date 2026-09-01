import django_filters
from django_filters import rest_framework as filters

from accounts.models import User


class UserFilter(filters.FilterSet):
    organization_id = django_filters.UUIDFilter(
        method="filter_by_organization",
    )
    created_at = filters.DateFromToRangeFilter(field_name="date_joined")

    def filter_by_organization(self, queryset, name, value):
        return queryset.filter(
            org_memberships__organization_id=value,
            org_memberships__is_deleted=False,
        ).distinct()

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

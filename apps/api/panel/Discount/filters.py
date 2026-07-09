from django_filters import rest_framework as filters

from billing.models import DiscountCode


class DiscountCodeFilter(filters.FilterSet):
    created_at = filters.DateFromToRangeFilter()
    expiration_date = filters.DateFromToRangeFilter()

    class Meta:
        model = DiscountCode
        fields = {
            "code": ["exact", "icontains"],
            "is_active": ["exact"],
            "percent": ["exact", "gte", "lte"],
            "max_usage": ["exact", "gte", "lte"],
        }

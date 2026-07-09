from django.conf import settings
from django.core.exceptions import FieldDoesNotExist, FieldError
from django.db.models import Count
from rest_framework import status
from rest_framework.response import Response


class FieldFilterOverviewMixin:
    def get_group_by_field(self, model, field_name):
        try:
            field = model._meta.get_field(field_name)
            if field.is_relation:
                related_model = field.related_model
                candidates = ["username", "name", "title", "email", "slug"]
                for candidate in candidates:
                    try:
                        related_model._meta.get_field(candidate)
                        return f"{field_name}__{candidate}"
                    except FieldDoesNotExist:
                        continue
            return field_name
        except (FieldDoesNotExist, FieldError):
            return field_name

    def get_display_value(self, model, field_name, value):
        try:
            field = model._meta.get_field(field_name)
            if hasattr(field, "choices") and field.choices:
                return dict(field.choices).get(value, value)
            return value
        except (FieldDoesNotExist, FieldError):
            return value

    def list(self, request, *args, **kwargs):
        stat_field = request.query_params.get("stat_field")

        if not stat_field:
            return super().list(request, *args, **kwargs)

        queryset = self.filter_queryset(self.get_queryset())
        should_paginate = getattr(settings, "ENABLE_STATISTICS_PAGINATION", False)

        try:
            model = queryset.model
            group_by_field = self.get_group_by_field(model, stat_field)

            stats = queryset.values(group_by_field).annotate(count=Count("id")).order_by("-count")

            formatted_data = []
            for item in stats:
                raw_value = item[group_by_field]

                if group_by_field == stat_field:
                    display_value = self.get_display_value(model, stat_field, raw_value)
                else:
                    display_value = raw_value

                if display_value is None:
                    display_value = "Unknown"

                formatted_data.append({"value": display_value, "count": item["count"]})

            if should_paginate:
                page = self.paginate_queryset(formatted_data)
                if page is not None:
                    return self.get_paginated_response(page)

            return Response(formatted_data, status=status.HTTP_200_OK)

        except (FieldError, AttributeError):
            return Response(
                {"error": f"Field '{stat_field}' is not valid for overview."},
                status=status.HTTP_400_BAD_REQUEST,
            )

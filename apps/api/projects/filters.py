"""
projects/filters.py
-------------------
django-filter FilterSet classes for the projects app.
Enables powerful URL-based filtering on list endpoints.
"""

import django_filters

from .models import Milestone, Project, ProjectMember


class ProjectFilter(django_filters.FilterSet):
    """
    Filterable fields for Project list endpoint.

    Example query params:
        ?status=active
        ?organization=<uuid>
        ?owner=<uuid>
        ?deadline_before=2025-12-31
        ?deadline_after=2025-01-01
        ?search=<text>  (handled by DRF SearchFilter)
    """

    status = django_filters.ChoiceFilter(choices=Project.Status.choices)
    organization = django_filters.UUIDFilter(field_name="organization__id")
    owner = django_filters.UUIDFilter(field_name="owner__id")
    team = django_filters.UUIDFilter(field_name="team__id")
    deadline_before = django_filters.DateFilter(
        field_name="deadline", lookup_expr="lte"
    )
    deadline_after = django_filters.DateFilter(field_name="deadline", lookup_expr="gte")
    start_date_after = django_filters.DateFilter(
        field_name="start_date", lookup_expr="gte"
    )
    budget_min = django_filters.NumberFilter(field_name="budget", lookup_expr="gte")
    budget_max = django_filters.NumberFilter(field_name="budget", lookup_expr="lte")

    class Meta:
        model = Project
        fields = [
            "status",
            "organization",
            "owner",
            "team",
            "deadline_before",
            "deadline_after",
            "start_date_after",
            "budget_min",
            "budget_max",
        ]


class ProjectMemberFilter(django_filters.FilterSet):
    """
    Filterable fields for ProjectMember list endpoint.

    Example:
        ?is_active=true
        ?specialty=frontend
        ?user=<uuid>
    """

    user = django_filters.UUIDFilter(field_name="user__id")
    team = django_filters.UUIDFilter(field_name="team__id")
    specialty = django_filters.CharFilter(lookup_expr="icontains")
    is_active = django_filters.BooleanFilter()

    class Meta:
        model = ProjectMember
        fields = ["user", "team", "specialty", "is_active"]


class MilestoneFilter(django_filters.FilterSet):
    """
    Filterable fields for Milestone list endpoint.

    Example:
        ?status=completed
        ?target_date_before=2025-06-30
    """

    status = django_filters.ChoiceFilter(choices=Milestone.Status.choices)
    target_date_before = django_filters.DateFilter(
        field_name="target_date", lookup_expr="lte"
    )
    target_date_after = django_filters.DateFilter(
        field_name="target_date", lookup_expr="gte"
    )

    class Meta:
        model = Milestone
        fields = ["status", "target_date_before", "target_date_after"]

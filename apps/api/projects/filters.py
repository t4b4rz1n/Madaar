"""
projects/filters.py
-------------------
django-filter FilterSet classes for the projects app.
Enables powerful URL-based filtering on list endpoints.
"""

from datetime import timedelta

import django_filters
from django.db.models import Q
from django.utils import timezone

from .models import Milestone, Project, ProjectActivity, ProjectMember


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
    my_projects = django_filters.BooleanFilter(method="filter_my_projects")

    def filter_my_projects(self, queryset, name, value):
        if value:
            user = self.request.user
            if user.is_authenticated:
                return queryset.filter(
                    Q(owner=user) | Q(members__user=user, members__is_deleted=False)
                ).distinct()
        return queryset

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
    upcoming = django_filters.BooleanFilter(method="filter_upcoming")

    def filter_upcoming(self, queryset, name, value):
        if value:
            today = timezone.now().date()
            next_week = today + timedelta(days=7)
            return queryset.filter(target_date__range=[today, next_week])
        return queryset

    class Meta:
        model = Milestone
        fields = ["status", "target_date_before", "target_date_after"]


class ProjectActivityFilter(django_filters.FilterSet):
    """
    Filterable fields for ProjectActivity feed.

    Example:
        ?event_type=project_created
        ?entity_type=milestone
    """

    event_type = django_filters.ChoiceFilter(choices=ProjectActivity.EventType.choices)
    entity_type = django_filters.ChoiceFilter(
        choices=ProjectActivity.EntityType.choices
    )

    class Meta:
        model = ProjectActivity
        fields = ["event_type", "entity_type"]

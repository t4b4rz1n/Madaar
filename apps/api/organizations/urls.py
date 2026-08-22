from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedSimpleRouter

from .views import (
    OrganizationMembershipViewSet,
    OrganizationViewSet,
    TeamMembershipViewSet,
    TeamViewSet,
)

router = DefaultRouter()

router.register(r"organizations", OrganizationViewSet, basename="organization")

organization_router = NestedSimpleRouter(router, r"organizations", lookup="organization")

organization_router.register(
    r"members", OrganizationMembershipViewSet, basename="organization-members"
)

organization_router.register(r"teams", TeamViewSet, basename="organization-teams")

team_router = NestedSimpleRouter(organization_router, r"teams", lookup="team")

team_router.register(r"members", TeamMembershipViewSet, basename="team-members")


urlpatterns = [
    path("", include(router.urls)),
    path("", include(organization_router.urls)),
    path("", include(team_router.urls)),
]

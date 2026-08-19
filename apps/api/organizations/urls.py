from django.urls import path

from .views import (
    MembershipChangeRoleView,
    MembershipRemoveView,
    MembershipTransferOwnershipView,
    OrganizationArchiveView,
    OrganizationListCreateView,
    OrganizationRestoreView,
    OrganizationRetrieveUpdateDestroyView,
    TeamListCreateView,
    TeamMembershipChangeRoleView,
    TeamMembershipListCreateView,
    TeamMembershipRemoveView,
    TeamRetrieveUpdateDestroyView,
)

app_name = "organizations"

urlpatterns = [
    path("", OrganizationListCreateView.as_view(), name="organization-list-create"),
    path("<uuid:pk>/", OrganizationRetrieveUpdateDestroyView.as_view(), name="organization-detail"),
    path("<uuid:pk>/archive/", OrganizationArchiveView.as_view(), name="organization-archive"),
    path("<uuid:pk>/restore/", OrganizationRestoreView.as_view(), name="organization-restore"),
    path("<uuid:organization_id>/teams/", TeamListCreateView.as_view(), name="team-list-create"),
    path(
        "<uuid:organization_id>/teams/<uuid:team_id>/memberships/",
        TeamMembershipListCreateView.as_view(),
        name="team-member-list-create",
    ),
    path(
        "<uuid:organization_id>/teams/<uuid:team_id>/memberships/<uuid:id>/remove/",
        TeamMembershipRemoveView.as_view(),
        name="team-member-remove",
    ),
    path(
        "<uuid:organization_id>/teams/<uuid:team_id>/memberships/<uuid:id>/role/",
        TeamMembershipChangeRoleView.as_view(),
        name="team-member-change-role",
    ),
    path("teams/<uuid:pk>/", TeamRetrieveUpdateDestroyView.as_view(), name="team-detail"),
    path("memberships/<uuid:id>/remove/", MembershipRemoveView.as_view(), name="member-remove"),
    path(
        "memberships/<uuid:id>/role/", MembershipChangeRoleView.as_view(), name="member-change-role"
    ),
    path(
        "memberships/<uuid:id>/transfer-ownership/",
        MembershipTransferOwnershipView.as_view(),
        name="member-transfer-ownership",
    ),
]

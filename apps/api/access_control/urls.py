from django.urls import path

from .views import (
    MembershipEffectivePermissionsView,
    PermissionListView,
    RoleDetailUpdateView,
    RoleListCreateView,
)

app_name = "access_control"

urlpatterns = [
    path(
        "organizations/<uuid:organization_id>/permissions/",
        PermissionListView.as_view(),
        name="permission-list",
    ),
    path(
        "organizations/<uuid:organization_id>/roles/",
        RoleListCreateView.as_view(),
        name="role-list-create",
    ),
    path(
        "organizations/<uuid:organization_id>/roles/<uuid:pk>/",
        RoleDetailUpdateView.as_view(),
        name="role-detail-update",
    ),
    path(
        "organizations/<uuid:organization_id>/users/<uuid:user_id>/effective-permissions/",
        MembershipEffectivePermissionsView.as_view(),
        name="member-effective-permissions",
    ),
]

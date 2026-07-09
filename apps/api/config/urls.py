from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("authentication.urls")),
    path("api/v1/accounts/", include("accounts.urls")),
    path("api/v1/panel/", include("panel.urls")),
    path("api/v1/dashboard/", include("dashboard.urls")),
]

if settings.DEBUG:
    from django.urls import re_path
    from drf_yasg import openapi
    from drf_yasg.views import get_schema_view
    from rest_framework import permissions

    from authentication.views import SwaggerSessionLogoutView

    schema_view = get_schema_view(
        openapi.Info(
            title="Base Project API",
            default_version="v1",
            description="API documentation for Base Project",
        ),
        public=True,
        permission_classes=[permissions.AllowAny],
    )

    urlpatterns += [
        path(
            "swagger/logout/",
            SwaggerSessionLogoutView.as_view(),
            name="swagger_session_logout",
        ),
        re_path(
            r"^swagger(?P<format>\.json|\.yaml)$",
            schema_view.without_ui(cache_timeout=0),
            name="schema-json",
        ),
        path("", schema_view.with_ui("swagger", cache_timeout=0), name="schema-swagger-ui"),
        path("redoc/", schema_view.with_ui("redoc", cache_timeout=0), name="schema-redoc"),
    ]
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

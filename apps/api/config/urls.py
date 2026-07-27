from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.auth.views import LoginView
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("authentication.urls")),
    path("api/v1/accounts/", include("accounts.urls")),
    path("api/v1/panel/", include("panel.urls")),
    path("api/v1/dashboard/", include("dashboard.urls")),
    path("api/v1/support/", include("dashboard.support_urls")),
    path("api/v1/attendance/", include("attendance.urls")),
]

if settings.DEBUG:
    from drf_spectacular.views import (
        SpectacularAPIView,
        SpectacularRedocView,
        SpectacularSwaggerView,
    )

    urlpatterns += [
        path(
            "",
            SpectacularSwaggerView.as_view(),
            name="schema-swagger-ui",
        ),
        # OpenAPI Schema
        path(
            "api/schema/",
            SpectacularAPIView.as_view(),
            name="schema",
        ),
        # Swagger UI
        path(
            "swagger/",
            SpectacularSwaggerView.as_view(url_name="schema"),
            name="swagger-ui",
        ),
        # ReDoc
        path(
            "redoc/",
            SpectacularRedocView.as_view(
                url_name="schema",
                template_name="drf_spectacular/redoc.html",
            ),
            name="redoc",
        ),
        # Django Session Login
        path(
            "swagger/login/",
            LoginView.as_view(template_name="admin/login.html"),
            name="swagger_login",
        ),
    ]

    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )

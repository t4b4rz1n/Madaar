from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AutomationCatalogView,
    AutomationRuleViewSet,
    DisconnectTelegramView,
    GenerateTelegramMagicLinkView,
    TelegramWebhookView,
)

router = DefaultRouter()
router.register(r"rules", AutomationRuleViewSet, basename="automation-rule")

urlpatterns = [
    path("catalog/", AutomationCatalogView.as_view(), name="automation_catalog"),
    path("telegram/webhook/", TelegramWebhookView.as_view(), name="telegram_webhook"),
    path(
        "telegram/magic-link/", GenerateTelegramMagicLinkView.as_view(), name="telegram_magic_link"
    ),
    path("telegram/disconnect/", DisconnectTelegramView.as_view(), name="telegram_disconnect"),
    path("", include(router.urls)),
]

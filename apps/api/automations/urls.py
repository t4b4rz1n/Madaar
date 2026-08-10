from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import GenerateTelegramMagicLinkView, TelegramWebhookView, AutomationRuleViewSet

router = DefaultRouter()
router.register(r'rules', AutomationRuleViewSet, basename='automation-rule')

urlpatterns = [
    path('telegram/webhook/', TelegramWebhookView.as_view(), name='telegram_webhook'),
    path('telegram/magic-link/', GenerateTelegramMagicLinkView.as_view(), name='telegram_magic_link'),
    path('', include(router.urls)),
]

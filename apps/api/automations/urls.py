from django.urls import path
from .views import TelegramWebhookView, GithubWebhookView, GenerateTelegramMagicLinkView

urlpatterns = [
    path('telegram/webhook/', TelegramWebhookView.as_view(), name='telegram_webhook'),
    path('telegram/magic-link/', GenerateTelegramMagicLinkView.as_view(), name='telegram_magic_link'),
    path('github/webhook/', GithubWebhookView.as_view(), name='github_webhook'),
]

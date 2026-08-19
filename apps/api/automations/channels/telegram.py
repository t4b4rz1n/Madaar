import logging

import requests
from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)

# Use a persistent session for connection pooling (performance optimization)
_session = requests.Session()


def _auto_disable_telegram(chat_id: str):
    """Auto-disable Telegram notifications for users who blocked the bot or are unreachable."""
    try:
        from accounts.models import WorkStyleProfile

        updated = WorkStyleProfile.objects.filter(telegram_chat_id=chat_id).update(
            notify_via_telegram=False,
            telegram_chat_id=None,
        )
        if updated:
            logger.info(
                f"Auto-disabled Telegram for chat_id {chat_id} "
                f"(user blocked bot or chat not found)."
            )
    except Exception as exc:
        logger.error(f"Failed to auto-disable Telegram for chat_id {chat_id}: {exc}")


@shared_task
def send_telegram_notification(chat_id: str, message: str, reply_markup: dict = None):
    """
    Sends a Telegram notification to a specific chat_id.
    Uses a persistent Session for connection reuse and performance.
    Auto-disables notifications if the bot is blocked by the user.
    """
    bot_token = getattr(settings, "TELEGRAM_BOT_TOKEN", None)

    if not bot_token:
        logger.warning(f"[MOCK] Telegram Token not set. Message to {chat_id}: {message[:80]}...")
        return False

    if not chat_id or not str(chat_id).strip():
        logger.warning("send_telegram_notification called with empty chat_id. Skipping.")
        return False

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "HTML",
    }

    if reply_markup:
        payload["reply_markup"] = reply_markup

    try:
        response = _session.post(url, json=payload, timeout=15)
        data = response.json()
        if not data.get("ok"):
            error_desc = data.get("description", "Unknown error")
            logger.error(f"Telegram API error for chat {chat_id}: {error_desc}")

            # If bot was blocked by user or chat doesn't exist,
            # auto-disable to prevent endless retry attempts.
            error_lower = error_desc.lower()
            if any(
                phrase in error_lower
                for phrase in (
                    "bot was blocked",
                    "chat not found",
                    "user is deactivated",
                    "forbidden",
                )
            ):
                _auto_disable_telegram(chat_id)

            return False
        return True
    except requests.exceptions.Timeout:
        logger.error(f"Telegram timeout for chat {chat_id}. Check VPN/proxy connectivity.")
        return False
    except requests.exceptions.RequestException as e:
        logger.error(f"Telegram request failed for chat {chat_id}: {e}")
        return False


@shared_task
def answer_callback_query(callback_query_id: str, text: str = "", show_alert: bool = False):
    """
    Answers an inline keyboard callback query to remove the loading indicator.
    """
    bot_token = getattr(settings, "TELEGRAM_BOT_TOKEN", None)
    if not bot_token:
        return False

    url = f"https://api.telegram.org/bot{bot_token}/answerCallbackQuery"
    payload = {
        "callback_query_id": callback_query_id,
        "text": text,
        "show_alert": show_alert,
    }
    try:
        _session.post(url, json=payload, timeout=10)
        return True
    except requests.exceptions.RequestException:
        return False


@shared_task
def edit_telegram_message(chat_id: str, message_id: int, text: str, reply_markup: dict = None):
    """
    Edits an existing Telegram message (used for updating inline button responses).
    """
    bot_token = getattr(settings, "TELEGRAM_BOT_TOKEN", None)
    if not bot_token:
        return False

    url = f"https://api.telegram.org/bot{bot_token}/editMessageText"
    payload = {
        "chat_id": chat_id,
        "message_id": message_id,
        "text": text,
        "parse_mode": "HTML",
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup

    try:
        response = _session.post(url, json=payload, timeout=15)
        return response.json().get("ok", False)
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to edit message {message_id} in chat {chat_id}: {e}")
        return False

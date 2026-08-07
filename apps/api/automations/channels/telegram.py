import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

def send_telegram_notification(chat_id: str, message: str, reply_markup: dict = None):
    """
    Sends a telegram notification to a specific chat_id.
    Optionally accepts a reply_markup dictionary for inline keyboards.
    """
    logger.info(f"Sending telegram message to {chat_id}")
    
    # Read the token from settings/env. If not set, mock it.
    bot_token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
    
    if not bot_token:
        logger.warning(f"[MOCK] Telegram Token not set. Mock sending message to {chat_id}: {message}")
        return
        
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "HTML"
    }
    
    if reply_markup:
        payload["reply_markup"] = reply_markup
        
    try:
        response = requests.post(url, json=payload, timeout=5)
        response.raise_for_status()
        logger.info(f"Successfully sent telegram message to {chat_id}")
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to send telegram message to {chat_id}. Error: {e}", exc_info=True)

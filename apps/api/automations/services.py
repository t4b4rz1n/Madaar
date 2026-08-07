import logging
from django.contrib.auth import get_user_model
from automations.channels.telegram import send_telegram_notification

logger = logging.getLogger(__name__)
User = get_user_model()

class TelegramBotService:
    """
    Handles incoming messages from the Telegram Webhook and provides rich responses.
    """
    
    @classmethod
    def handle_message(cls, chat_id: str, text: str):
        if text.startswith('/start'):
            cls._handle_start(chat_id, text)
        elif text.startswith('/help'):
            cls._handle_help(chat_id)
        elif text.startswith('/status'):
            cls._handle_status(chat_id)
        else:
            cls._handle_unknown(chat_id)

    @classmethod
    def _handle_start(cls, chat_id: str, text: str):
        parts = text.split(' ')
        if len(parts) > 1:
            token = parts[1]
            try:
                user = User.objects.get(telegram_connect_token=token)
                user.telegram_chat_id = chat_id
                user.notify_via_telegram = True
                user.telegram_connect_token = None  # Invalidate token after use
                user.save(update_fields=['telegram_chat_id', 'notify_via_telegram', 'telegram_connect_token'])
                
                # Professional Welcome Message with Inline Keyboard
                welcome_msg = (
                    f"🎉 <b>سلام {user.first_name} عزیز!</b>\n\n"
                    f"✅ حساب کاربری شما در سیستم <b>مدار</b> با موفقیت به این ربات متصل شد.\n"
                    f"از این پس تمامی اعلان‌های مهم (مثل تسک‌های جدید، پروژه‌ها و پیام‌ها) را بلافاصله همینجا دریافت خواهید کرد.\n\n"
                    f"💡 <i>برای دیدن دستورات ربات روی /help کلیک کنید.</i>"
                )
                reply_markup = {
                    "inline_keyboard": [
                        [
                            {"text": "🌐 ورود به پنل مدار", "url": "https://madaar.io/dashboard"}
                        ]
                    ]
                }
                send_telegram_notification(chat_id, welcome_msg, reply_markup=reply_markup)
                logger.info(f"User {user.username} successfully connected their Telegram account.")
            except User.DoesNotExist:
                send_telegram_notification(
                    chat_id, 
                    "❌ <b>خطا:</b> متاسفانه لینک اتصال شما نامعتبر یا منقضی شده است.\nلطفا دوباره از پنل کاربری اقدام کنید."
                )
        else:
            # Generic start without token - DEV SHORTCUT
            # We will automatically link them to the first user in the system (e.g. Admin) for testing purposes
            user = User.objects.first()
            if user:
                user.telegram_chat_id = chat_id
                user.notify_via_telegram = True
                user.save(update_fields=['telegram_chat_id', 'notify_via_telegram'])
                
                welcome_msg = (
                    f"🎉 <b>سلام {user.first_name or user.username} عزیز!</b>\n\n"
                    f"✅ (اتصال خودکار برای تست): حساب کاربری شما با موفقیت متصل شد.\n"
                    f"از این پس اعلان‌ها را اینجا دریافت خواهید کرد."
                )
                reply_markup = {
                    "inline_keyboard": [[{"text": "🌐 ورود به پنل مدار", "url": "https://madaar.io/dashboard"}]]
                }
                send_telegram_notification(chat_id, welcome_msg, reply_markup=reply_markup)
            else:
                msg = "هیچ کاربری در سیستم یافت نشد!"
                send_telegram_notification(chat_id, msg)

    @classmethod
    def _handle_help(cls, chat_id: str):
        help_msg = (
            "🛠 <b>راهنمای ربات مدار:</b>\n\n"
            "🔹 /start - شروع مجدد ربات و توضیحات\n"
            "🔹 /status - بررسی وضعیت اتصال حساب کاربری\n"
            "🔹 /help - نمایش همین راهنما\n\n"
            "<i>این ربات به صورت خودکار پیام‌های مهم کاری شما را ارسال می‌کند. نیازی به پیام دادن به آن نیست!</i>"
        )
        send_telegram_notification(chat_id, help_msg)

    @classmethod
    def _handle_status(cls, chat_id: str):
        # Try to find user by chat_id
        user = User.objects.filter(telegram_chat_id=chat_id).first()
        if user:
            status_msg = (
                f"✅ <b>وضعیت اتصال:</b> متصل\n"
                f"👤 <b>کاربر:</b> {user.get_full_name() or user.username}\n"
                f"✉️ <b>ایمیل:</b> {user.email}\n\n"
                f"شما در حال حاضر تمامی اعلان‌ها را دریافت می‌کنید."
            )
        else:
            status_msg = "❌ <b>وضعیت اتصال:</b> قطع\nشما هنوز حساب کاربری خود را به این ربات متصل نکرده‌اید."
            
        send_telegram_notification(chat_id, status_msg)

    @classmethod
    def _handle_unknown(cls, chat_id: str):
        msg = "❓ متوجه نشدم. لطفا از دستور /help برای دیدن گزینه‌ها استفاده کنید."
        send_telegram_notification(chat_id, msg)

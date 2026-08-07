import logging
from django.contrib.auth import get_user_model
from django.db.models import Count, Q

from automations.channels.telegram import (
    send_telegram_notification,
    answer_callback_query,
    edit_telegram_message,
)

logger = logging.getLogger(__name__)
User = get_user_model()


class TelegramBotService:
    """
    Professional Telegram Bot Service for Madaar.
    Handles commands, inline keyboard callbacks, and user queries.
    """

    # ─── Message Routing ─────────────────────────────────────────────

    @classmethod
    def handle_message(cls, chat_id: str, text: str, tg_username: str = ""):
        """Routes incoming text messages to the appropriate handler."""
        text = (text or "").strip()
        command = text.split()[0].lower() if text else ""

        handlers = {
            "/start": lambda: cls._handle_start(chat_id, tg_username),
            "/help": lambda: cls._handle_help(chat_id),
            "/status": lambda: cls._handle_status(chat_id),
            "/myprojects": lambda: cls._handle_my_projects(chat_id),
            "/mytasks": lambda: cls._handle_my_tasks(chat_id),
            "/myorg": lambda: cls._handle_my_org(chat_id),
        }

        handler = handlers.get(command)
        if handler:
            handler()
        else:
            cls._handle_unknown(chat_id)

    @classmethod
    def handle_callback(cls, chat_id: str, message_id: int, callback_data: str,
                        callback_query_id: str, tg_username: str = ""):
        """Routes inline keyboard button presses."""
        answer_callback_query(callback_query_id)

        if callback_data == "cmd_myprojects":
            cls._handle_my_projects(chat_id, edit_message_id=message_id)
        elif callback_data == "cmd_mytasks":
            cls._handle_my_tasks(chat_id, edit_message_id=message_id)
        elif callback_data == "cmd_myorg":
            cls._handle_my_org(chat_id, edit_message_id=message_id)
        elif callback_data == "cmd_status":
            cls._handle_status(chat_id, edit_message_id=message_id)
        elif callback_data == "cmd_help":
            cls._handle_help(chat_id, edit_message_id=message_id)
        elif callback_data == "cmd_main_menu":
            cls._handle_main_menu(chat_id, edit_message_id=message_id)
        else:
            logger.warning(f"Unknown callback_data: {callback_data}")

    # ─── Helpers ──────────────────────────────────────────────────────

    @classmethod
    def _get_user_by_chat_id(cls, chat_id: str):
        """Finds a user by their linked telegram chat_id."""
        return User.objects.filter(telegram_chat_id=chat_id).first()

    @classmethod
    def _send_or_edit(cls, chat_id: str, text: str, reply_markup: dict = None,
                      edit_message_id: int = None):
        """Sends a new message or edits an existing one."""
        if edit_message_id:
            edit_telegram_message(chat_id, edit_message_id, text, reply_markup)
        else:
            send_telegram_notification(chat_id, text, reply_markup)

    @classmethod
    def _main_menu_markup(cls):
        """Returns the main interactive menu keyboard."""
        return {
            "inline_keyboard": [
                [
                    {"text": "📂 پروژه‌های من", "callback_data": "cmd_myprojects"},
                    {"text": "📋 تسک‌های من", "callback_data": "cmd_mytasks"},
                ],
                [
                    {"text": "🏢 سازمان من", "callback_data": "cmd_myorg"},
                    {"text": "📊 وضعیت اتصال", "callback_data": "cmd_status"},
                ],
                [
                    {"text": "❓ راهنما", "callback_data": "cmd_help"},
                ],
            ]
        }

    @classmethod
    def _back_to_menu_markup(cls):
        """Returns a simple 'back to menu' button."""
        return {
            "inline_keyboard": [
                [{"text": "🔙 بازگشت به منو", "callback_data": "cmd_main_menu"}]
            ]
        }

    # ─── Command Handlers ─────────────────────────────────────────────

    @classmethod
    def _handle_start(cls, chat_id: str, tg_username: str):
        """Handles /start — validates and links telegram account."""
        if not tg_username:
            send_telegram_notification(
                chat_id,
                "❌ <b>خطا:</b> شما در تلگرام آیدی (Username) ندارید!\n\n"
                "برای اتصال به سیستم مدار:\n"
                "۱. در تنظیمات تلگرام خود یک آیدی بسازید\n"
                "۲. آیدی را در پروفایل خود در سایت مدار وارد کنید\n"
                "۳. دوباره /start را بزنید"
            )
            return

        try:
            user = User.objects.get(telegram_username__iexact=tg_username)
            user.telegram_chat_id = chat_id
            user.notify_via_telegram = True
            user.save(update_fields=['telegram_chat_id', 'notify_via_telegram'])

            welcome_msg = (
                f"🎉 <b>سلام {user.first_name or user.username} عزیز!</b>\n\n"
                f"✅ حساب کاربری شما با موفقیت به ربات <b>مدار</b> متصل شد.\n"
                f"از این پس اعلان‌های مهم کاری شما بلافاصله اینجا ارسال خواهد شد.\n\n"
                f"از منوی زیر استفاده کنید:"
            )
            send_telegram_notification(chat_id, welcome_msg, reply_markup=cls._main_menu_markup())
            logger.info(f"User {user.username} connected via @{tg_username}")

        except User.DoesNotExist:
            send_telegram_notification(
                chat_id,
                f"❌ <b>حساب کاربری یافت نشد!</b>\n\n"
                f"آیدی تلگرام شما (<b>@{tg_username}</b>) در سیستم مدار ثبت نشده است.\n\n"
                f"لطفاً در وب‌سایت مدار وارد پروفایل خود شوید، آیدی تلگرام خود را ثبت کنید و سپس /start را بزنید."
            )
        except User.MultipleObjectsReturned:
            send_telegram_notification(
                chat_id,
                "❌ <b>خطای سیستمی!</b>\n\n"
                "آیدی تلگرام شما در چند حساب مختلف ثبت شده. لطفاً با پشتیبانی تماس بگیرید."
            )

    @classmethod
    def _handle_main_menu(cls, chat_id: str, edit_message_id: int = None):
        """Shows the main interactive menu."""
        user = cls._get_user_by_chat_id(chat_id)
        name = user.first_name if user else "کاربر"
        msg = (
            f"🏠 <b>منوی اصلی ربات مدار</b>\n\n"
            f"سلام {name}! از دکمه‌های زیر استفاده کنید:"
        )
        cls._send_or_edit(chat_id, msg, reply_markup=cls._main_menu_markup(), edit_message_id=edit_message_id)

    @classmethod
    def _handle_help(cls, chat_id: str, edit_message_id: int = None):
        """Handles /help — shows available commands."""
        help_msg = (
            "🛠 <b>راهنمای ربات مدار</b>\n\n"
            "🔹 /start — اتصال حساب کاربری\n"
            "🔹 /status — وضعیت اتصال\n"
            "🔹 /myprojects — لیست پروژه‌های من\n"
            "🔹 /mytasks — لیست تسک‌های من\n"
            "🔹 /myorg — اطلاعات سازمان من\n"
            "🔹 /help — نمایش همین راهنما\n\n"
            "<i>💡 این ربات به صورت خودکار اعلان‌های کاری شما را ارسال می‌کند.</i>"
        )
        cls._send_or_edit(chat_id, help_msg, reply_markup=cls._back_to_menu_markup(), edit_message_id=edit_message_id)

    @classmethod
    def _handle_status(cls, chat_id: str, edit_message_id: int = None):
        """Handles /status — shows connection status."""
        user = cls._get_user_by_chat_id(chat_id)
        if user:
            tg_status = "✅ فعال" if user.notify_via_telegram else "⏸ غیرفعال"
            email_status = "✅ فعال" if user.notify_via_email else "⏸ غیرفعال"
            msg = (
                f"📊 <b>وضعیت حساب کاربری</b>\n\n"
                f"👤 <b>نام:</b> {user.get_full_name() or user.username}\n"
                f"📧 <b>ایمیل:</b> {user.email}\n"
                f"📱 <b>آیدی تلگرام:</b> @{user.telegram_username or '—'}\n\n"
                f"<b>کانال‌های اعلان:</b>\n"
                f"  تلگرام: {tg_status}\n"
                f"  ایمیل: {email_status}"
            )
        else:
            msg = (
                "❌ <b>وضعیت اتصال:</b> قطع\n\n"
                "شما هنوز حساب کاربری خود را متصل نکرده‌اید.\n"
                "برای اتصال، دستور /start را ارسال کنید."
            )
        cls._send_or_edit(chat_id, msg, reply_markup=cls._back_to_menu_markup(), edit_message_id=edit_message_id)

    @classmethod
    def _handle_my_projects(cls, chat_id: str, edit_message_id: int = None):
        """Handles /myprojects — lists user's active projects."""
        user = cls._get_user_by_chat_id(chat_id)
        if not user:
            cls._send_or_edit(chat_id, "❌ ابتدا حساب خود را با /start متصل کنید.", edit_message_id=edit_message_id)
            return

        from projects.models import ProjectMember
        memberships = (
            ProjectMember.objects
            .filter(user=user, is_active=True, project__status__in=['active', 'draft'])
            .select_related('project')
            .order_by('-project__updated_at')[:10]
        )

        if not memberships:
            msg = (
                "📂 <b>پروژه‌های من</b>\n\n"
                "شما در حال حاضر عضو هیچ پروژه فعالی نیستید."
            )
        else:
            lines = ["📂 <b>پروژه‌های من</b>\n"]
            for i, m in enumerate(memberships, 1):
                p = m.project
                status_emoji = {"active": "🟢", "draft": "📝", "on_hold": "🟡", "completed": "✅"}.get(p.status, "⚪")
                lines.append(f"{i}. {status_emoji} <b>{p.name}</b> — {p.get_status_display()}")

            lines.append(f"\n<i>مجموع: {len(memberships)} پروژه</i>")
            msg = "\n".join(lines)

        cls._send_or_edit(chat_id, msg, reply_markup=cls._back_to_menu_markup(), edit_message_id=edit_message_id)

    @classmethod
    def _handle_my_tasks(cls, chat_id: str, edit_message_id: int = None):
        """Handles /mytasks — lists user's open tasks."""
        user = cls._get_user_by_chat_id(chat_id)
        if not user:
            cls._send_or_edit(chat_id, "❌ ابتدا حساب خود را با /start متصل کنید.", edit_message_id=edit_message_id)
            return

        from tasks.models import Task
        tasks = (
            Task.objects
            .filter(assignee=user, is_finished=False)
            .select_related('status', 'project')
            .order_by('-priority', '-created_at')[:10]
        )

        if not tasks:
            msg = (
                "📋 <b>تسک‌های من</b>\n\n"
                "🎉 هیچ تسک باز و ناتمامی ندارید! آفرین!"
            )
        else:
            priority_emoji = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢"}
            lines = ["📋 <b>تسک‌های من (باز)</b>\n"]
            for i, t in enumerate(tasks, 1):
                p_emoji = priority_emoji.get(t.priority, "⚪")
                status_name = t.status.name if t.status else "—"
                project_name = t.project.name if t.project else "—"
                lines.append(
                    f"{i}. {p_emoji} <b>{t.title}</b>\n"
                    f"     📁 {project_name} | 📌 {status_name}"
                )

            # Summary
            total_open = Task.objects.filter(assignee=user, is_finished=False).count()
            lines.append(f"\n<i>نمایش {len(tasks)} از {total_open} تسک باز</i>")
            msg = "\n".join(lines)

        cls._send_or_edit(chat_id, msg, reply_markup=cls._back_to_menu_markup(), edit_message_id=edit_message_id)

    @classmethod
    def _handle_my_org(cls, chat_id: str, edit_message_id: int = None):
        """Handles /myorg — shows user's organization info."""
        user = cls._get_user_by_chat_id(chat_id)
        if not user:
            cls._send_or_edit(chat_id, "❌ ابتدا حساب خود را با /start متصل کنید.", edit_message_id=edit_message_id)
            return

        from organizations.models import OrganizationMembership
        memberships = (
            OrganizationMembership.objects
            .filter(user=user)
            .select_related('organization')
            .order_by('-created_at')[:5]
        )

        if not memberships:
            msg = (
                "🏢 <b>سازمان من</b>\n\n"
                "شما هنوز عضو هیچ سازمانی نیستید."
            )
        else:
            lines = ["🏢 <b>سازمان‌های من</b>\n"]
            for m in memberships:
                org = m.organization
                role_display = m.get_role_display()
                member_count = OrganizationMembership.objects.filter(organization=org).count()
                lines.append(
                    f"• <b>{org.name}</b>\n"
                    f"  👥 {member_count} عضو | 🎖 نقش: {role_display}"
                )
            msg = "\n".join(lines)

        cls._send_or_edit(chat_id, msg, reply_markup=cls._back_to_menu_markup(), edit_message_id=edit_message_id)

    @classmethod
    def _handle_unknown(cls, chat_id: str):
        """Handles unrecognized messages."""
        user = cls._get_user_by_chat_id(chat_id)
        if user:
            send_telegram_notification(
                chat_id,
                "❓ متوجه نشدم. از منوی زیر استفاده کنید:",
                reply_markup=cls._main_menu_markup()
            )
        else:
            send_telegram_notification(
                chat_id,
                "❓ ابتدا با دستور /start حساب خود را متصل کنید."
            )

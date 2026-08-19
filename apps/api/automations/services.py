# Trigger reload
import logging

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.utils import translation
from django.utils.translation import gettext as _

from automations.channels.telegram import (
    answer_callback_query,
    edit_telegram_message,
    send_telegram_notification,
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
    def _activate_language(cls, user, tg_language_code: str):
        if (
            user
            and hasattr(user, "work_style_profile")
            and user.work_style_profile.has_set_language_manually
        ):
            lang = user.work_style_profile.telegram_language
        else:
            lang = "fa" if tg_language_code.startswith("fa") else "en"
        translation.activate(lang)
        return lang

    @classmethod
    def _update_user_language(cls, user, lang):
        if user and hasattr(user, "work_style_profile"):
            wsp = user.work_style_profile
            if not wsp.has_set_language_manually and wsp.telegram_language != lang:
                wsp.telegram_language = lang
                wsp.save(update_fields=["telegram_language"])

    @classmethod
    def handle_message(
        cls, chat_id: str, text: str, tg_username: str = "", tg_language_code: str = "en"
    ):
        """Routes incoming text messages to the appropriate handler."""
        from django.core.cache import cache

        user = cls._get_user_by_chat_id(chat_id)
        lang = cls._activate_language(user, tg_language_code)

        ban_key = f"tg_ban_{chat_id}"
        if cache.get(ban_key):
            # User is banned, ignore the message completely to prevent spam
            return

        text = (text or "").strip()
        command_parts = text.split()
        command = command_parts[0].lower() if command_parts else ""
        token = command_parts[1] if len(command_parts) > 1 else None

        handlers = {
            "/start": lambda: cls._handle_start(chat_id, token, lang),
            "/help": lambda: cls._handle_help(chat_id, lang),
            "/status": lambda: cls._handle_status(chat_id, lang),
            "/myprojects": lambda: cls._handle_my_projects(chat_id, lang),
            "/mytasks": lambda: cls._handle_my_tasks(chat_id, lang),
            "/myorg": lambda: cls._handle_my_org(chat_id, lang),
        }

        handler = handlers.get(command)
        if handler:
            # Valid command, reset spam counter
            cache.delete(f"tg_spam_{chat_id}")
            handler()
        else:
            cls._handle_unknown(chat_id, lang)

    @classmethod
    def handle_callback(
        cls,
        chat_id: str,
        message_id: int,
        callback_data: str,
        callback_query_id: str,
        tg_username: str = "",
        tg_language_code: str = "en",
    ):
        """Routes inline keyboard button presses."""
        user = cls._get_user_by_chat_id(chat_id)
        lang = cls._activate_language(user, tg_language_code)

        if callback_data.startswith("set_lang_"):
            cls._set_language(
                chat_id,
                callback_data.replace("set_lang_", ""),
                callback_query_id=callback_query_id,
                edit_message_id=message_id,
            )
            return

        answer_callback_query.delay(callback_query_id)

        if callback_data == "cmd_myprojects":
            cls._handle_my_projects(chat_id, lang, edit_message_id=message_id)
        elif callback_data == "cmd_mytasks":
            cls._handle_my_tasks(chat_id, lang, edit_message_id=message_id)
        elif callback_data == "cmd_myorg":
            cls._handle_my_org(chat_id, lang, edit_message_id=message_id)
        elif callback_data == "cmd_status":
            cls._handle_status(chat_id, lang, edit_message_id=message_id)
        elif callback_data == "cmd_help":
            cls._handle_help(chat_id, lang, edit_message_id=message_id)
        elif callback_data == "cmd_main_menu":
            cls._handle_main_menu(chat_id, lang, edit_message_id=message_id)
        elif callback_data == "cmd_org_admin_menu":
            cls._handle_org_admin_menu(chat_id, lang, edit_message_id=message_id)
        elif callback_data == "cmd_org_dashboard":
            cls._handle_org_dashboard(chat_id, lang, edit_message_id=message_id)
        elif callback_data == "cmd_org_projects":
            cls._handle_org_projects_admin(chat_id, lang, edit_message_id=message_id)
        elif callback_data == "cmd_org_tasks":
            cls._handle_org_tasks_status(chat_id, lang, edit_message_id=message_id)
        elif callback_data == "cmd_org_members":
            cls._handle_org_members(chat_id, lang, edit_message_id=message_id)
        elif callback_data == "cmd_superadmin_menu":
            cls._handle_superadmin_menu(chat_id, lang, edit_message_id=message_id)
        elif callback_data == "cmd_language":
            cls._handle_language_menu(chat_id, lang, edit_message_id=message_id)
        elif callback_data == "ignore":
            pass
        else:
            logger.warning(f"Unknown callback_data: {callback_data}")

    # ─── Helpers ──────────────────────────────────────────────────────

    @classmethod
    def _get_user_by_chat_id(cls, chat_id: str):
        """Finds a user by their linked telegram chat_id."""
        from accounts.models import WorkStyleProfile

        wsp = (
            WorkStyleProfile.objects.filter(telegram_chat_id=chat_id).select_related("user").first()
        )
        return wsp.user if wsp else None

    @classmethod
    def _send_or_edit(
        cls, chat_id: str, text: str, reply_markup: dict = None, edit_message_id: int = None
    ):
        """Sends a new message or edits an existing one."""
        if edit_message_id:
            edit_telegram_message.delay(chat_id, edit_message_id, text, reply_markup)
        else:
            send_telegram_notification.delay(chat_id, text, reply_markup)

    @classmethod
    def _main_menu_markup(cls, user=None):
        """Returns the main interactive menu keyboard."""
        keyboard = [
            [
                {"text": _("📂 پروژه‌های من"), "callback_data": "cmd_myprojects"},
                {"text": _("📋 تسک‌های من"), "callback_data": "cmd_mytasks"},
            ],
            [
                {"text": _("🏢 سازمان من"), "callback_data": "cmd_myorg"},
                {"text": _("📊 وضعیت اتصال"), "callback_data": "cmd_status"},
            ],
            [
                {"text": _("❓ راهنما"), "callback_data": "cmd_help"},
                {"text": _("🌐 زبان / Language"), "callback_data": "cmd_language"},
            ],
        ]

        if user:
            from organizations.models import Organization, OrganizationMembership

            is_owner = (
                Organization.objects.filter(owner=user).exists()
                or OrganizationMembership.objects.filter(
                    user=user, role=OrganizationMembership.Role.OWNER
                ).exists()
            )

            if is_owner:
                keyboard.append(
                    [{"text": _("👑 پنل مدیریت سازمان"), "callback_data": "cmd_org_admin_menu"}]
                )

            if user.is_superuser:
                keyboard.append(
                    [{"text": _("🛠 پنل ادمین کل سیستم"), "callback_data": "cmd_superadmin_menu"}]
                )

        return {"inline_keyboard": keyboard}

    @classmethod
    def _admin_menu_markup(cls):
        """Returns the admin sub-menu keyboard."""
        return {
            "inline_keyboard": [
                [
                    {"text": _("🏢 داشبورد کلان"), "callback_data": "cmd_org_dashboard"},
                    {"text": _("📂 پروژه‌های سازمان"), "callback_data": "cmd_org_projects"},
                ],
                [
                    {"text": _("📋 وضعیت تسک‌ها"), "callback_data": "cmd_org_tasks"},
                    {"text": _("👥 اعضای سازمان"), "callback_data": "cmd_org_members"},
                ],
                [{"text": _("🔙 بازگشت به منوی اصلی"), "callback_data": "cmd_main_menu"}],
            ]
        }

    @classmethod
    def _back_to_menu_markup(cls):
        """Returns a simple 'back to menu' button."""
        return {
            "inline_keyboard": [[{"text": _("🔙 بازگشت به منو"), "callback_data": "cmd_main_menu"}]]
        }

    @classmethod
    def _back_to_admin_menu_markup(cls):
        """Returns a 'back to admin menu' button."""
        return {
            "inline_keyboard": [
                [{"text": _("🔙 بازگشت به پنل مدیریت"), "callback_data": "cmd_org_admin_menu"}]
            ]
        }

    # ─── Command Handlers ─────────────────────────────────────────────

    @classmethod
    def _handle_start(cls, chat_id: str, token: str, lang: str):
        """Handles /start — validates magic link token and links telegram account."""
        from accounts.models import WorkStyleProfile

        user = cls._get_user_by_chat_id(chat_id)
        if user and not token:
            cls._handle_main_menu(chat_id, lang)
            return

        if not token:
            msg = (
                "❌ <b>خطا:</b> لینک اتصال نامعتبر است.\n\nلطفاً از طریق پنل کاربری سایت روی دکمه «اتصال به تلگرام» کلیک کنید تا وارد بات شوید."
                if lang == "fa"
                else "❌ <b>Error:</b> Invalid connection link.\n\nPlease click the 'Connect to Telegram' button from your website dashboard to enter the bot."
            )
            send_telegram_notification.delay(chat_id, msg)
            return

        wsp = (
            WorkStyleProfile.objects.filter(telegram_connect_token=token)
            .select_related("user")
            .first()
        )
        if not wsp:
            msg = (
                "❌ <b>لینک منقضی شده یا نامعتبر است!</b>\n\nلطفاً مجدداً از وب‌سایت اقدام به تولید لینک اتصال کنید."
                if lang == "fa"
                else "❌ <b>Link expired or invalid!</b>\n\nPlease generate a new connection link from the website."
            )
            send_telegram_notification.delay(chat_id, msg)
            return

        user = wsp.user

        existing_wsp = WorkStyleProfile.objects.filter(telegram_chat_id=chat_id).first()
        if existing_wsp and existing_wsp.id != wsp.id:
            msg = (
                "❌ <b>خطا در اتصال!</b>\n\nاین اکانت تلگرام شما قبلاً به یک حساب کاربری دیگر در سیستم مدار متصل شده است. هر حساب تلگرام فقط می‌تواند به یک اکانت سایت متصل باشد."
                if lang == "fa"
                else "❌ <b>Connection Error!</b>\n\nThis Telegram account is already connected to another user account. Each Telegram account can only be connected to one site account."
            )
            send_telegram_notification.delay(chat_id, msg)
            return

        wsp.telegram_chat_id = chat_id
        wsp.notify_via_telegram = True
        wsp.telegram_connect_token = None  # Invalidate token after use
        wsp.save(
            update_fields=["telegram_chat_id", "notify_via_telegram", "telegram_connect_token"]
        )

        welcome_msg = _(
            "🎉 <b>سلام {name} عزیز!</b>\n\n"
            "✅ حساب کاربری شما با موفقیت به ربات <b>مدار</b> متصل شد.\n"
            "از این پس اعلان‌های مهم کاری شما بلافاصله اینجا ارسال خواهد شد.\n\n"
            "از منوی زیر استفاده کنید:"
        ).format(name=user.first_name or user.username)
        send_telegram_notification.delay(
            chat_id, welcome_msg, reply_markup=cls._main_menu_markup(user)
        )
        logger.info(f"User {user.username} connected via magic link DB token")

    @classmethod
    def _handle_main_menu(cls, chat_id: str, lang: str, edit_message_id: int = None):
        """Shows the main interactive menu."""
        user = cls._get_user_by_chat_id(chat_id)
        cls._update_user_language(user, lang)

        name = user.first_name if user else _("کاربر")
        msg = _(
            "🏠 <b>منوی اصلی ربات مدار</b>\n\nسلام {name}! از دکمه‌های زیر استفاده کنید:"
        ).format(name=name)
        cls._send_or_edit(
            chat_id, msg, reply_markup=cls._main_menu_markup(user), edit_message_id=edit_message_id
        )

    @classmethod
    def _handle_help(cls, chat_id: str, lang: str, edit_message_id: int = None):
        """Handles /help — shows available commands."""
        help_msg = _(
            "🛠 <b>راهنمای ربات مدار</b>\n\n"
            "🔹 /start — اتصال حساب کاربری\n"
            "🔹 /status — وضعیت اتصال\n"
            "🔹 /myprojects — لیست پروژه‌های من\n"
            "🔹 /mytasks — لیست تسک‌های من\n"
            "🔹 /myorg — اطلاعات سازمان من\n"
            "🔹 /help — نمایش همین راهنما\n\n"
            "<i>💡 این ربات به صورت خودکار اعلان‌های کاری شما را ارسال می‌کند.</i>"
        )
        cls._send_or_edit(
            chat_id,
            help_msg,
            reply_markup=cls._back_to_menu_markup(),
            edit_message_id=edit_message_id,
        )

    @classmethod
    def _handle_language_menu(cls, chat_id: str, lang: str, edit_message_id: int = None):
        """Shows language selection menu."""
        msg = _(
            "🌐 <b>انتخاب زبان / Language Selection</b>\n\nلطفاً زبان مورد نظر خود را انتخاب کنید:\nPlease select your preferred language:"
        )
        keyboard = {
            "inline_keyboard": [
                [
                    {"text": "🇮🇷 فارسی", "callback_data": "set_lang_fa"},
                    {"text": "🇬🇧 English", "callback_data": "set_lang_en"},
                ],
                [{"text": _("🔙 بازگشت به منو"), "callback_data": "cmd_main_menu"}],
            ]
        }
        cls._send_or_edit(chat_id, msg, reply_markup=keyboard, edit_message_id=edit_message_id)

    @classmethod
    def _set_language(
        cls, chat_id: str, new_lang: str, callback_query_id: str = None, edit_message_id: int = None
    ):
        """Changes user language preference."""
        user = cls._get_user_by_chat_id(chat_id)
        if user and hasattr(user, "work_style_profile"):
            wsp = user.work_style_profile
            wsp.telegram_language = new_lang
            wsp.has_set_language_manually = True
            wsp.save(update_fields=["telegram_language", "has_set_language_manually"])

        translation.activate(new_lang)

        if callback_query_id:
            answer_callback_query.delay(
                callback_query_id, _("✅ Language successfully updated."), show_alert=False
            )

        cls._handle_main_menu(chat_id, new_lang, edit_message_id=edit_message_id)

    @classmethod
    def _handle_status(cls, chat_id: str, lang: str, edit_message_id: int = None):
        """Handles /status — shows connection status."""
        user = cls._get_user_by_chat_id(chat_id)
        cls._update_user_language(user, lang)

        if user and hasattr(user, "work_style_profile"):
            wsp = user.work_style_profile
            if lang == "en":
                tg_status = "✅ Active" if wsp.notify_via_telegram else "⏸ Inactive"
                email_status = "✅ Active" if wsp.notify_via_email else "⏸ Inactive"
                msg = (
                    "📊 <b>Account Status</b>\n\n"
                    "👤 <b>Name:</b> {name}\n"
                    "📧 <b>Email:</b> {email}\n\n"
                    "<b>Notification Channels:</b>\n"
                    "  Telegram: {tg_status}\n"
                    "  Email: {email_status}"
                ).format(
                    name=user.get_full_name() or user.username,
                    email=user.email,
                    tg_status=tg_status,
                    email_status=email_status,
                )
            else:
                tg_status = "✅ فعال" if wsp.notify_via_telegram else "⏸ غیرفعال"
                email_status = "✅ فعال" if wsp.notify_via_email else "⏸ غیرفعال"
                msg = (
                    "📊 <b>وضعیت حساب کاربری</b>\n\n"
                    "👤 <b>نام:</b> {name}\n"
                    "📧 <b>ایمیل:</b> {email}\n\n"
                    "<b>کانال‌های اعلان:</b>\n"
                    "  تلگرام: {tg_status}\n"
                    "  ایمیل: {email_status}"
                ).format(
                    name=user.get_full_name() or user.username,
                    email=user.email,
                    tg_status=tg_status,
                    email_status=email_status,
                )
        else:
            if lang == "en":
                msg = (
                    "❌ <b>Connection Status:</b> Disconnected\n\n"
                    "You have not connected your account yet.\n"
                    "Send /start to connect."
                )
            else:
                msg = (
                    "❌ <b>وضعیت اتصال:</b> قطع\n\n"
                    "شما هنوز حساب کاربری خود را متصل نکرده‌اید.\n"
                    "برای اتصال، دستور /start را ارسال کنید."
                )
        cls._send_or_edit(
            chat_id, msg, reply_markup=cls._back_to_menu_markup(), edit_message_id=edit_message_id
        )

    @classmethod
    def _handle_my_projects(cls, chat_id: str, lang: str, edit_message_id: int = None):
        """Handles /myprojects — lists user's active projects."""
        user = cls._get_user_by_chat_id(chat_id)
        cls._update_user_language(user, lang)

        if not user:
            cls._send_or_edit(
                chat_id,
                _("❌ ابتدا حساب خود را با /start متصل کنید."),
                edit_message_id=edit_message_id,
            )
            return

        from projects.models import ProjectMember

        memberships = (
            ProjectMember.objects.filter(
                user=user, is_active=True, project__status__in=["active", "draft"]
            )
            .select_related("project")
            .order_by("-project__updated_at")[:10]
        )

        if not memberships:
            msg = _("📂 <b>پروژه‌های من</b>\n\nشما در حال حاضر عضو هیچ پروژه فعالی نیستید.")
        else:
            lines = [_("📂 <b>پروژه‌های من</b>\n")]
            for i, m in enumerate(memberships, 1):
                p = m.project
                status_emoji = {
                    "active": "🟢",
                    "draft": "📝",
                    "on_hold": "🟡",
                    "completed": "✅",
                }.get(p.status, "⚪")
                lines.append(f"{i}. {status_emoji} <b>{p.name}</b> — {p.get_status_display()}")

            lines.append(_("\n<i>مجموع: {count} پروژه</i>").format(count=len(memberships)))
            msg = "\n".join(lines)

        cls._send_or_edit(
            chat_id, msg, reply_markup=cls._back_to_menu_markup(), edit_message_id=edit_message_id
        )

    @classmethod
    def _handle_my_tasks(cls, chat_id: str, lang: str, edit_message_id: int = None):
        """Handles /mytasks — lists user's open tasks."""
        user = cls._get_user_by_chat_id(chat_id)
        cls._update_user_language(user, lang)

        if not user:
            cls._send_or_edit(
                chat_id,
                _("❌ ابتدا حساب خود را با /start متصل کنید."),
                edit_message_id=edit_message_id,
            )
            return

        from tasks.models import Task

        tasks = (
            Task.objects.filter(assignee=user, is_finished=False)
            .select_related("status", "project")
            .order_by("-priority", "-created_at")[:10]
        )

        if not tasks:
            msg = _("📋 <b>تسک‌های من</b>\n\n🎉 هیچ تسک باز و ناتمامی ندارید! آفرین!")
        else:
            priority_emoji = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢"}
            lines = [_("📋 <b>تسک‌های من (باز)</b>\n")]
            for i, t in enumerate(tasks, 1):
                p_emoji = priority_emoji.get(t.priority, "⚪")
                status_name = t.status.name if t.status else "—"
                project_name = t.project.name if t.project else "—"
                lines.append(
                    f"{i}. {p_emoji} <b>{t.title}</b>\n     📁 {project_name} | 📌 {status_name}"
                )

            # Summary
            total_open = Task.objects.filter(assignee=user, is_finished=False).count()
            lines.append(
                _("\n<i>نمایش {count} از {total} تسک باز</i>").format(
                    count=len(tasks), total=total_open
                )
            )
            msg = "\n".join(lines)

        cls._send_or_edit(
            chat_id, msg, reply_markup=cls._back_to_menu_markup(), edit_message_id=edit_message_id
        )

    @classmethod
    def _handle_my_org(cls, chat_id: str, lang: str, edit_message_id: int = None):
        """Handles /myorg — shows user's organization info."""
        user = cls._get_user_by_chat_id(chat_id)
        cls._update_user_language(user, lang)

        if not user:
            cls._send_or_edit(
                chat_id,
                _("❌ ابتدا حساب خود را با /start متصل کنید."),
                edit_message_id=edit_message_id,
            )
            return

        from organizations.models import Organization, OrganizationMembership

        memberships = (
            OrganizationMembership.objects.filter(user=user)
            .select_related("organization")
            .order_by("-created_at")[:10]
        )

        owner_orgs = []
        member_orgs = []
        owner_org_ids = set()

        # 1. Direct ownership via Organization.owner
        owned_orgs_direct = Organization.objects.filter(owner=user)[:10]
        for org in owned_orgs_direct:
            member_count = OrganizationMembership.objects.filter(organization=org).count()
            owner_orgs.append(
                _("👑 شما مالک سازمان <b>{org}</b> هستید (👥 {count} عضو)").format(
                    org=org.name, count=member_count
                )
            )
            owner_org_ids.add(org.id)

        # 2. Ownership or membership via OrganizationMembership
        for m in memberships:
            org = m.organization
            if org.id in owner_org_ids:
                continue

            role_display = m.get_role_display()
            member_count = OrganizationMembership.objects.filter(organization=org).count()

            if m.role == OrganizationMembership.Role.OWNER:
                owner_orgs.append(
                    _("👑 شما مالک سازمان <b>{org}</b> هستید (👥 {count} عضو)").format(
                        org=org.name, count=member_count
                    )
                )
                owner_org_ids.add(org.id)
            else:
                member_orgs.append(
                    _("💼 شما عضو سازمان <b>{org}</b> هستید (🎖 نقش: {role})").format(
                        org=org.name, role=role_display
                    )
                )

        if not owner_orgs and not member_orgs:
            msg = _("🏢 <b>سازمان من</b>\n\nشما هنوز عضو هیچ سازمانی نیستید.")
        else:
            lines = [_("🏢 <b>سازمان‌های مرتبط با من</b>\n")]
            if owner_orgs:
                lines.extend(owner_orgs)
                lines.append("")

            if member_orgs:
                lines.extend(member_orgs)

            msg = "\n".join(lines).strip()

        cls._send_or_edit(
            chat_id, msg, reply_markup=cls._back_to_menu_markup(), edit_message_id=edit_message_id
        )

    @classmethod
    def _handle_superadmin_menu(cls, chat_id: str, lang: str, edit_message_id: int = None):
        """Shows system-wide stats for superusers."""
        user = cls._get_user_by_chat_id(chat_id)
        cls._update_user_language(user, lang)

        if not user or not user.is_superuser:
            cls._send_or_edit(chat_id, _("❌ دسترسی غیرمجاز."), edit_message_id=edit_message_id)
            return

        from accounts.models import User as AccountUser
        from organizations.models import Organization
        from projects.models import Project

        org_count = Organization.objects.count()
        user_count = AccountUser.objects.count()
        project_count = Project.objects.count()

        msg = _(
            "🛠 <b>پنل ادمین کل سیستم (Superadmin)</b>\n\n"
            "📊 <b>آمار کل سیستم:</b>\n\n"
            "🏢 <b>تعداد سازمان‌ها:</b> {org_count}\n"
            "👥 <b>تعداد کاربران:</b> {user_count}\n"
            "📂 <b>تعداد پروژه‌ها:</b> {project_count}\n\n"
            "<i>(دسترسی ویژه ادمین)</i>"
        ).format(org_count=org_count, user_count=user_count, project_count=project_count)
        cls._send_or_edit(
            chat_id, msg, reply_markup=cls._back_to_menu_markup(), edit_message_id=edit_message_id
        )

    # ─── Owner Admin Commands ─────────────────────────────────────────

    @classmethod
    def _handle_org_admin_menu(cls, chat_id: str, lang: str, edit_message_id: int = None):
        user = cls._get_user_by_chat_id(chat_id)
        cls._update_user_language(user, lang)

        if not user:
            return cls._handle_unknown(chat_id, lang)

        org = cls._get_owner_org(user)
        if not org:
            return cls._handle_unknown(chat_id, lang)

        msg = _(
            "👑 <b>پنل مدیریت سازمان ({org})</b>\n\n"
            "از بخش‌های زیر برای مشاهده وضعیت کلان سازمان استفاده کنید:"
        ).format(org=org.name)
        cls._send_or_edit(
            chat_id, msg, reply_markup=cls._admin_menu_markup(), edit_message_id=edit_message_id
        )

    @classmethod
    def _get_owner_org(cls, user):
        from organizations.models import Organization, OrganizationMembership

        # 1. Direct ownership
        org = Organization.objects.filter(owner=user).first()
        if org:
            return org

        # 2. Ownership via membership
        membership = (
            OrganizationMembership.objects.filter(user=user, role=OrganizationMembership.Role.OWNER)
            .select_related("organization")
            .first()
        )

        if membership:
            return membership.organization

        return None

    @classmethod
    def _handle_org_dashboard(cls, chat_id: str, lang: str, edit_message_id: int = None):
        user = cls._get_user_by_chat_id(chat_id)
        cls._update_user_language(user, lang)

        org = cls._get_owner_org(user)
        if not org:
            return cls._handle_unknown(chat_id, lang)

        from organizations.models import OrganizationMembership
        from projects.models import Project
        from tasks.models import Task

        # Fast aggregate queries
        member_count = OrganizationMembership.objects.filter(organization=org).count()
        project_stats = Project.objects.filter(organization=org).aggregate(
            total=Count("id"), active=Count("id", filter=Q(status="active"))
        )
        task_count = Task.objects.filter(project__organization=org, is_finished=False).count()

        msg = _(
            "👑 <b>داشبورد کلان سازمان</b>\n\n"
            "🏢 <b>نام سازمان:</b> {org}\n\n"
            "👥 <b>تعداد پرسنل:</b> {members} نفر\n"
            "📂 <b>پروژه‌ها:</b> {projects} (فعال: {active})\n"
            "📋 <b>تسک‌های باز:</b> {tasks} تسک"
        ).format(
            org=org.name,
            members=member_count,
            projects=project_stats["total"],
            active=project_stats["active"],
            tasks=task_count,
        )
        cls._send_or_edit(
            chat_id,
            msg,
            reply_markup=cls._back_to_admin_menu_markup(),
            edit_message_id=edit_message_id,
        )

    @classmethod
    def _handle_org_projects_admin(cls, chat_id: str, lang: str, edit_message_id: int = None):
        user = cls._get_user_by_chat_id(chat_id)
        cls._update_user_language(user, lang)

        org = cls._get_owner_org(user)
        if not org:
            return cls._handle_unknown(chat_id, lang)

        from projects.models import Project

        projects = Project.objects.filter(organization=org).order_by("-updated_at")[:15]

        if not projects:
            msg = _("هیچ پروژه‌ای در سازمان ثبت نشده است.")
        else:
            lines = [_("📂 <b>پروژه‌های سازمان ({org})</b>\n").format(org=org.name)]
            for i, p in enumerate(projects, 1):
                status_emoji = {
                    "active": "🟢",
                    "draft": "📝",
                    "on_hold": "🟡",
                    "completed": "✅",
                }.get(p.status, "⚪")
                lines.append(f"{i}. {status_emoji} <b>{p.name}</b> — {p.get_status_display()}")

            total_projects = Project.objects.filter(organization=org).count()
            lines.append(
                _("\n<i>نمایش {count} از {total} پروژه</i>").format(
                    count=len(projects), total=total_projects
                )
            )
            msg = "\n".join(lines)

        cls._send_or_edit(
            chat_id,
            msg,
            reply_markup=cls._back_to_admin_menu_markup(),
            edit_message_id=edit_message_id,
        )

    @classmethod
    def _handle_org_tasks_status(cls, chat_id: str, lang: str, edit_message_id: int = None):
        user = cls._get_user_by_chat_id(chat_id)
        cls._update_user_language(user, lang)

        org = cls._get_owner_org(user)
        if not org:
            return cls._handle_unknown(chat_id, lang)

        from tasks.models import Task

        # Fast query for task status breakdown across the entire org
        stats = Task.objects.filter(project__organization=org).aggregate(
            total=Count("id"),
            done=Count("id", filter=Q(is_finished=True)),
            in_progress=Count(
                "id", filter=Q(status__code__in=["in_progress", "doing", "wip"], is_finished=False)
            ),
            review=Count(
                "id", filter=Q(status__code__in=["review", "testing", "qa"], is_finished=False)
            ),
            todo=Count(
                "id", filter=Q(status__code__in=["todo", "backlog", "open"], is_finished=False)
            ),
        )

        msg = _(
            "📋 <b>وضعیت تسک‌های سازمان</b>\n\n"
            "📊 <b>مجموع کل تسک‌ها:</b> {total}\n\n"
            "✅ <b>انجام شده:</b> {done} تسک\n"
            "🚀 <b>در حال انجام:</b> {in_progress} تسک\n"
            "👀 <b>در انتظار بررسی:</b> {review} تسک\n"
            "📝 <b>شروع نشده (Todo):</b> {todo} تسک"
        ).format(
            total=stats["total"],
            done=stats["done"],
            in_progress=stats["in_progress"],
            review=stats["review"],
            todo=stats["todo"],
        )
        cls._send_or_edit(
            chat_id,
            msg,
            reply_markup=cls._back_to_admin_menu_markup(),
            edit_message_id=edit_message_id,
        )

    @classmethod
    def _handle_org_members(cls, chat_id: str, lang: str, edit_message_id: int = None):
        user = cls._get_user_by_chat_id(chat_id)
        cls._update_user_language(user, lang)

        org = cls._get_owner_org(user)
        if not org:
            return cls._handle_unknown(chat_id, lang)

        from organizations.models import OrganizationMembership

        members = (
            OrganizationMembership.objects.filter(organization=org)
            .select_related("user")
            .order_by("role")[:20]
        )

        lines = [_("👥 <b>اعضای سازمان ({org})</b>\n").format(org=org.name)]
        for i, m in enumerate(members, 1):
            name = m.user.get_full_name() or m.user.username if m.user else "—"
            role_display = m.get_role_display()
            lines.append(f"{i}. <b>{name}</b> — {role_display}")

        total_members = OrganizationMembership.objects.filter(organization=org).count()
        lines.append(
            _("\n<i>نمایش {count} از {total} عضو</i>").format(
                count=len(members), total=total_members
            )
        )
        msg = "\n".join(lines)

        cls._send_or_edit(
            chat_id,
            msg,
            reply_markup=cls._back_to_admin_menu_markup(),
            edit_message_id=edit_message_id,
        )

    @classmethod
    def _handle_unknown(cls, chat_id: str, lang: str):
        """Handles unrecognized messages and tracks spam."""
        from django.core.cache import cache

        spam_key = f"tg_spam_{chat_id}"
        ban_key = f"tg_ban_{chat_id}"

        # Increment spam counter (expires after 2 minutes of inactivity)
        count = cache.get(spam_key, 0) + 1
        cache.set(spam_key, count, timeout=120)

        if count >= 10:
            # Ban the user for 5 minutes (300 seconds)
            cache.set(ban_key, True, timeout=300)
            cache.delete(spam_key)
            send_telegram_notification.delay(
                chat_id,
                _(
                    "🚫 <b>حساب شما موقتاً مسدود شد!</b>\n\n"
                    "به دلیل ارسال پیام‌های نامعتبر و پشت سر هم (اسپم)، دسترسی شما به ربات "
                    "به مدت <b>۵ دقیقه</b> مسدود گردید.\n\n"
                    "لطفاً پس از پایان این زمان، فقط از منوها و دکمه‌های ربات استفاده کنید."
                ),
            )
            logger.warning(f"User with chat_id {chat_id} banned for 5 minutes due to spam.")
            return

        user = cls._get_user_by_chat_id(chat_id)
        if user:
            cls._update_user_language(user, lang)
            error_msg = _(
                "❓ <b>دستور نامعتبر!</b>\n\nمتوجه نشدم. لطفاً از دکمه‌های زیر استفاده کنید:"
            )
            send_telegram_notification.delay(
                chat_id, error_msg, reply_markup=cls._main_menu_markup(user)
            )
            return
        else:
            send_telegram_notification.delay(
                chat_id,
                _("❓ <b>دستور نامعتبر!</b>\n\nابتدا با دستور /start حساب خود را متصل کنید."),
            )

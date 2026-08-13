import logging
import re

from django.contrib.auth import get_user_model
from django.utils import translation
from django.utils.translation import gettext as _

from automations.catalog import EVENTS_BY_CODE, Recipient
from automations.channels.email import send_email_notification
from automations.channels.telegram import send_telegram_notification
from automations.models import AutomationRule

logger = logging.getLogger(__name__)
User = get_user_model()


def process_rules_for_event(event_type: str, payload: dict):
    """
    Evaluates business rules for an event and routes it to the appropriate channels.
    Optimized with a single DB query using select_related.
    """
    logger.info(f"Processing event: {event_type}")

    event = EVENTS_BY_CODE.get(event_type)
    if not event:
        logger.warning("Ignoring unsupported automation event '%s'.", event_type)
        return

    project_id = payload.get("project_id")
    organization_id = payload.get("organization_id")
    if project_id and not organization_id:
        from projects.models import Project

        project = Project.objects.filter(id=project_id).values("organization_id").first()
        if project:
            organization_id = project["organization_id"]

    rule = AutomationRule.objects.filter(
        organization_id=organization_id,
        event_type=event_type,
    ).first()

    if rule and not rule.is_active:
        logger.info(
            "Automation rule for '%s' is disabled for organization '%s'.",
            event_type,
            organization_id,
        )
        return

    # An absent rule means the catalog default is active.  This avoids creating
    # 15 duplicate database rows for every project while keeping defaults live.
    recipients = rule.recipients if rule else event["default_recipients"]
    action_type = rule.action_type if rule else AutomationRule.ActionType.BOTH

    # 1. Resolve configured recipient roles from the event context.
    target_user_ids = _determine_target_users(recipients, payload)

    if not target_user_ids:
        logger.info(f"No target users for event '{event_type}'. Skipping.")
        return

    # 2. Fetch users in a single optimized query, including their WorkStyleProfile
    users = User.objects.filter(id__in=target_user_ids).select_related("work_style_profile")
    sent_telegram_chat_ids = set()

    from django.conf import settings

    if (
        rule
        and rule.telegram_group_id
        and action_type
        in (
            AutomationRule.ActionType.TELEGRAM,
            AutomationRule.ActionType.BOTH,
        )
    ):
        translation.activate(settings.LANGUAGE_CODE)
        grp_sub, grp_fmt = _format_message(event_type, payload)
        grp_msg = (
            _render_template(rule.message_template, payload)
            if rule and rule.message_template
            else grp_fmt
        )
        send_telegram_notification.delay(rule.telegram_group_id, grp_msg)

    # 2. Route to enabled channels, respecting each user's delivery preferences.
    for user in users:
        wsp = getattr(user, "work_style_profile", None)

        notify_email = wsp.notify_via_email if wsp else False
        notify_telegram = wsp.notify_via_telegram if wsp else False
        telegram_chat_id = wsp.telegram_chat_id if wsp else None

        should_send_email = (
            action_type in (AutomationRule.ActionType.EMAIL, AutomationRule.ActionType.BOTH)
            and notify_email
            and user.email
        )
        should_send_telegram = (
            action_type in (AutomationRule.ActionType.TELEGRAM, AutomationRule.ActionType.BOTH)
            and notify_telegram
            and telegram_chat_id
        )

        if not should_send_email and not should_send_telegram:
            continue

        # Determine language preferences
        lang = settings.LANGUAGE_CODE
        if wsp and getattr(wsp, "telegram_language", None):
            lang = wsp.telegram_language

        translation.activate(lang)

        subject, formatted_message = _format_message(event_type, payload)
        message = (
            _render_template(rule.message_template, payload)
            if rule and rule.message_template
            else formatted_message
        )

        if should_send_email:
            send_email_notification(user.email, subject, message)

        if should_send_telegram:
            if telegram_chat_id not in sent_telegram_chat_ids:
                send_telegram_notification.delay(telegram_chat_id, message)
                sent_telegram_chat_ids.add(telegram_chat_id)


def _determine_target_users(recipients: list[str], payload: dict) -> set[str]:
    """Resolve the configured recipient selectors against one event payload."""
    users = set()
    project = None
    project_id = payload.get("project_id")
    if project_id:
        from projects.models import Project

        project = Project.objects.filter(pk=project_id).first()

    def add(value):
        if value:
            users.add(str(value))

    def add_many(values):
        for value in values or []:
            add(value)

    for recipient in recipients:
        if recipient == Recipient.TARGET_USERS:
            add(payload.get("target_user_id"))
            add_many(payload.get("target_user_ids"))
        elif recipient == Recipient.MENTIONED_USERS:
            add_many(payload.get("mentioned_user_ids"))
            add(payload.get("target_user_id"))
        elif recipient == Recipient.ASSIGNEE:
            add(payload.get("assignee_id"))
        elif recipient == Recipient.REPORTER:
            add(payload.get("reporter_id"))
        elif recipient == Recipient.REQUESTER:
            add(payload.get("requester_id") or payload.get("user_id"))
        elif recipient == Recipient.PROJECT_OWNER and project:
            add(project.owner_id)
        elif recipient == Recipient.PROJECT_MEMBERS and project:
            add_many(
                project.members.filter(is_active=True, user__isnull=False).values_list(
                    "user_id", flat=True
                )
            )
        elif recipient in (Recipient.ORGANIZATION_ADMINS, Recipient.TEAM_LEADS):
            from organizations.models import OrganizationMembership

            roles = (
                [OrganizationMembership.Role.OWNER, OrganizationMembership.Role.ADMIN]
                if recipient == Recipient.ORGANIZATION_ADMINS
                else [OrganizationMembership.Role.TEAM_LEAD]
            )
            org_id = project.organization_id if project else payload.get("organization_id")
            if org_id:
                add_many(
                    OrganizationMembership.objects.filter(
                        organization_id=org_id,
                        role__in=roles,
                        is_deleted=False,
                    ).values_list("user_id", flat=True)
                )
        elif recipient == Recipient.SUPERUSERS:
            add_many(
                User.objects.filter(
                    is_superuser=True,
                    work_style_profile__notify_via_telegram=True,
                    work_style_profile__telegram_chat_id__isnull=False,
                )
                .exclude(work_style_profile__telegram_chat_id="")
                .values_list("id", flat=True)
            )

    return users


_TEMPLATE_VARIABLE = re.compile(r"{{\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*}}")


def _render_template(template: str, payload: dict) -> str:
    """Render simple {{variable}} placeholders without evaluating admin input."""

    def replace(match):
        value = payload
        for part in match.group(1).split("."):
            if not isinstance(value, dict):
                return ""
            value = value.get(part)
        return str(value) if value is not None else ""

    return _TEMPLATE_VARIABLE.sub(replace, template)


def _format_message(event_type: str, payload: dict) -> tuple:
    """
    Formats the notification message in HTML (for Telegram compatibility).
    Returns (subject, html_message_body).
    """
    formatter = _MESSAGE_FORMATTERS.get(event_type)
    if formatter:
        return formatter(payload)

    # Fallback
    return _("اعلان سیستم مدار"), _(
        "📩 یک رویداد جدید در سیستم ثبت شد: <code>{event_type}</code>"
    ).format(event_type=event_type)


# ─── Message Formatters ──────────────────────────────────────────────────────


def _fmt_project_created(p):
    return (
        _("پروژه جدید"),
        _(
            "🚀 <b>پروژه جدید ایجاد شد!</b>\n\n"
            "شما توسط {creator} به پروژه <b>{project}</b> اضافه شدید. موفق باشید!"
        ).format(creator=p.get("creator_name", _("همکار شما")), project=p.get("project_name", "—")),
    )


def _fmt_project_member_removed(p):
    return (
        _("حذف از پروژه"),
        _(
            "❌ <b>شما از پروژه حذف شدید!</b>\n\n"
            "توسط {remover} دسترسی شما از پروژه <b>{project}</b> قطع شد."
        ).format(
            remover=p.get("remover_name", _("مدیر سیستم")), project=p.get("project_name", "—")
        ),
    )


def _fmt_project_over_budget(p):
    return (
        _("هشدار بودجه پروژه"),
        _(
            "⚠️ <b>هشدار بودجه!</b>\n\n"
            "بودجه پروژه <b>{project}</b> رو به اتمام است یا از حد مجاز عبور کرده.\n"
            "لطفاً بررسی کنید."
        ).format(project=p.get("project_name", "—")),
    )


def _fmt_milestone_approaching(p):
    return (
        _("نزدیک شدن به پایان فاز"),
        _(
            "⏳ <b>ددلاین نزدیک است!</b>\n\n"
            "کمتر از ۴۸ ساعت تا پایان فاز <b>{milestone}</b> "
            "در پروژه <b>{project}</b> باقی مانده."
        ).format(milestone=p.get("milestone_title", "—"), project=p.get("project_name", "—")),
    )


def _fmt_milestone_completed(p):
    return (
        _("فاز تکمیل شد"),
        _(
            "✅ <b>فاز تکمیل شد!</b>\n\n"
            "فاز <b>{milestone}</b> در پروژه <b>{project}</b> با موفقیت به پایان رسید. خسته نباشید!"
        ).format(milestone=p.get("milestone_title", "—"), project=p.get("project_name", "—")),
    )


def _fmt_task_assigned(p):
    return (
        _("تسک جدید"),
        _(
            "🎯 <b>تسک جدید به شما محول شد!</b>\n\n" "📌 تسک: <b>{task}</b>\n" "👤 توسط: {assigner}"
        ).format(task=p.get("task_title", "—"), assigner=p.get("assigner", _("مدیر"))),
    )


def _fmt_task_needs_review(p):
    return (
        _("نیاز به بررسی"),
        _(
            "👀 <b>تسک آماده بررسی است!</b>\n\n"
            "📌 تسک: <b>{task}</b>\n"
            "👤 ارسال‌کننده: {assignee}"
        ).format(task=p.get("task_title", "—"), assignee=p.get("assignee", _("همکار شما"))),
    )


def _fmt_task_completed(p):
    return (
        _("تسک انجام شد"),
        _("🎉 <b>تسک انجام شد!</b>\n\n" "📌 تسک <b>{task}</b> با موفقیت تکمیل شد.").format(
            task=p.get("task_title", "—")
        ),
    )


def _fmt_task_deadline_approaching(p):
    return (
        _("هشدار ددلاین"),
        _(
            "⏰ <b>هشدار ددلاین!</b>\n\n" "کمتر از ۲۴ ساعت به مهلت تسک <b>{task}</b> باقی مانده."
        ).format(task=p.get("task_title", "—")),
    )


def _fmt_user_mentioned(p):
    return (
        _("منشن در کامنت"),
        _(
            "🔔 <b>شما منشن شدید!</b>\n\n"
            "{author} شما را در کامنت‌های تسک <b>{task}</b> تگ کرده است."
        ).format(author=p.get("author", _("کسی")), task=p.get("task_title", "—")),
    )


def _fmt_task_commented(p):
    return (
        _("کامنت جدید"),
        _(
            "💬 <b>کامنت جدید!</b>\n\n" "{author} یک نظر جدید برای تسک <b>{task}</b> ثبت کرده است."
        ).format(author=p.get("author", _("کسی")), task=p.get("task_title", "—")),
    )


def _fmt_standup_submitted(p):
    return (
        _("گزارش روزانه"),
        _(
            "📝 <b>گزارش روزانه (Standup)</b>\n\n"
            "همکار شما {user} گزارش استندآپ امروز خود را ثبت کرد."
        ).format(user=p.get("user_name", "—")),
    )


def _fmt_leave_requested(p):
    return (
        _("درخواست مرخصی"),
        _(
            "🏖️ <b>درخواست مرخصی جدید!</b>\n\n"
            "👤 {user}\n"
            "📋 نوع: {leave_type}\n\n"
            "لطفاً بررسی کنید."
        ).format(user=p.get("user_name", "—"), leave_type=p.get("leave_type", _("مرخصی"))),
    )


def _fmt_leave_resolved(p):
    return (
        _("وضعیت مرخصی"),
        _(
            "📋 <b>نتیجه درخواست مرخصی</b>\n\n"
            "درخواست مرخصی شما بررسی شد.\n"
            "📊 وضعیت: <b>{status}</b>"
        ).format(status=p.get("status", "—")),
    )


def _fmt_timer_started(p):
    return (
        _("شروع تایمر"),
        _("⏱️ <b>تایمر کاری روشن شد!</b>\n\n" "👤 {user}\n" "📌 تسک: <b>{task}</b>").format(
            user=p.get("user_name", "—"), task=p.get("task_title", "—")
        ),
    )


def _fmt_organization_created(p):
    return (
        _("سازمان جدید"),
        _(
            "🏢 <b>سازمان جدید ایجاد شد!</b>\n\n"
            "📌 نام: <b>{org_name}</b>\n"
            "👤 مالک: {owner_name}"
        ).format(
            org_name=p.get("org_name", "—"),
            owner_name=p.get("owner_name", "—"),
        ),
    )


def _fmt_project_actually_created(p):
    return (
        _("پروژه جدید"),
        _(
            "📂 <b>پروژه جدید ایجاد شد!</b>\n\n"
            "📌 نام: <b>{project_name}</b>\n"
            "🏢 سازمان: {org_name}\n"
            "👤 سازنده: {creator_name}"
        ).format(
            project_name=p.get("project_name", "—"),
            org_name=p.get("org_name", "—"),
            creator_name=p.get("creator_name", "—"),
        ),
    )


def _fmt_project_budget_set(p):
    return (
        _("تعیین بودجه پروژه"),
        _(
            "💰 <b>بودجه پروژه تعیین شد!</b>\n\n"
            "📂 پروژه: <b>{project_name}</b>\n"
            "💵 بودجه: <b>{budget}</b>\n"
            "🏢 سازمان: {org_name}"
        ).format(
            project_name=p.get("project_name", "—"),
            budget=p.get("budget", "—"),
            org_name=p.get("org_name", "—"),
        ),
    )


def _fmt_member_added_to_project(p):
    return (
        _("عضو جدید در پروژه"),
        _(
            "👤 <b>عضو جدید به پروژه اضافه شد!</b>\n\n"
            "📂 پروژه: <b>{project_name}</b>\n"
            "👤 عضو جدید: {member_name}\n"
            "🏢 سازمان: {org_name}"
        ).format(
            project_name=p.get("project_name", "—"),
            member_name=p.get("member_name", "—"),
            org_name=p.get("org_name", "—"),
        ),
    )


def _fmt_member_added_to_org(p):
    return (
        _("عضو جدید در سازمان"),
        _(
            "🏢 <b>عضو جدید به سازمان اضافه شد!</b>\n\n"
            "🏢 سازمان: <b>{org_name}</b>\n"
            "👤 عضو جدید: {member_name}\n"
            "🎖 نقش: {role}"
        ).format(
            org_name=p.get("org_name", "—"),
            member_name=p.get("member_name", "—"),
            role=p.get("role", "—"),
        ),
    )


# Map event types to their formatter functions
_MESSAGE_FORMATTERS = {
    "project_created": _fmt_project_created,
    "project_member_removed": _fmt_project_member_removed,
    "project_over_budget": _fmt_project_over_budget,
    "milestone_approaching": _fmt_milestone_approaching,
    "milestone_completed": _fmt_milestone_completed,
    "task_assigned": _fmt_task_assigned,
    "task_needs_review": _fmt_task_needs_review,
    "task_completed": _fmt_task_completed,
    "task_deadline_approaching": _fmt_task_deadline_approaching,
    "user_mentioned": _fmt_user_mentioned,
    "task_commented": _fmt_task_commented,
    "standup_submitted": _fmt_standup_submitted,
    "leave_requested": _fmt_leave_requested,
    "leave_resolved": _fmt_leave_resolved,
    "timer_started": _fmt_timer_started,
    "organization_created": _fmt_organization_created,
    "project_actually_created": _fmt_project_actually_created,
    "project_budget_set": _fmt_project_budget_set,
    "member_added_to_project": _fmt_member_added_to_project,
    "member_added_to_org": _fmt_member_added_to_org,
}

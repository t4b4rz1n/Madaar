import logging
from django.contrib.auth import get_user_model
from automations.channels.email import send_email_notification
from automations.channels.telegram import send_telegram_notification

logger = logging.getLogger(__name__)
User = get_user_model()


def process_rules_for_event(event_type: str, payload: dict):
    """
    Evaluates business rules for an event and routes it to the appropriate channels.
    Optimized with a single DB query using select_related.
    """
    logger.info(f"Processing event: {event_type}")

    # 1. Determine Target Users
    target_user_ids = _determine_target_users(event_type, payload)

    if not target_user_ids:
        logger.info(f"No target users for event '{event_type}'. Skipping.")
        return

    # 2. Format the message (HTML for Telegram, plain for email)
    subject, message = _format_message(event_type, payload)

    # 3. Fetch users in a single optimized query
    users = User.objects.filter(id__in=target_user_ids).only(
        'id', 'email', 'notify_via_email', 'notify_via_telegram', 'telegram_chat_id'
    )

    # 4. Route to enabled channels
    for user in users:
        if user.notify_via_email and user.email:
            send_email_notification(user.email, subject, message)

        if user.notify_via_telegram and user.telegram_chat_id:
            send_telegram_notification(user.telegram_chat_id, message)


def _determine_target_users(event_type: str, payload: dict) -> set:
    """Extracts or looks up the users who should receive this event."""
    users = set()

    # Generic target fields (used by all events)
    if payload.get('target_user_id'):
        users.add(payload['target_user_id'])
    if payload.get('target_user_ids'):
        users.update(payload['target_user_ids'])

    # Event-specific logic
    if event_type == "project_created" and payload.get('project_id'):
        from projects.models import ProjectMember
        member_ids = (
            ProjectMember.objects
            .filter(project_id=payload['project_id'], is_active=True)
            .values_list('user_id', flat=True)
        )
        users.update(str(uid) for uid in member_ids)

    return users


def _format_message(event_type: str, payload: dict) -> tuple:
    """
    Formats the notification message in HTML (for Telegram compatibility).
    Returns (subject, html_message_body).
    """
    formatter = _MESSAGE_FORMATTERS.get(event_type)
    if formatter:
        return formatter(payload)

    # Fallback
    return "اعلان سیستم مدار", f"📩 یک رویداد جدید در سیستم ثبت شد: <code>{event_type}</code>"


# ─── Message Formatters ──────────────────────────────────────────────────────

def _fmt_project_created(p):
    return (
        "پروژه جدید",
        f"🚀 <b>پروژه جدید ایجاد شد!</b>\n\n"
        f"شما توسط {p.get('creator_name', 'همکار شما')} به پروژه "
        f"<b>{p.get('project_name', '—')}</b> اضافه شدید. موفق باشید!"
    )

def _fmt_project_over_budget(p):
    return (
        "هشدار بودجه پروژه",
        f"⚠️ <b>هشدار بودجه!</b>\n\n"
        f"بودجه پروژه <b>{p.get('project_name', '—')}</b> رو به اتمام است یا از حد مجاز عبور کرده.\n"
        f"لطفاً بررسی کنید."
    )

def _fmt_milestone_approaching(p):
    return (
        "نزدیک شدن به پایان فاز",
        f"⏳ <b>ددلاین نزدیک است!</b>\n\n"
        f"کمتر از ۴۸ ساعت تا پایان فاز <b>{p.get('milestone_title', '—')}</b> "
        f"در پروژه <b>{p.get('project_name', '—')}</b> باقی مانده."
    )

def _fmt_milestone_completed(p):
    return (
        "فاز تکمیل شد",
        f"✅ <b>فاز تکمیل شد!</b>\n\n"
        f"فاز <b>{p.get('milestone_title', '—')}</b> در پروژه "
        f"<b>{p.get('project_name', '—')}</b> با موفقیت به پایان رسید. خسته نباشید!"
    )

def _fmt_task_assigned(p):
    return (
        "تسک جدید",
        f"🎯 <b>تسک جدید به شما محول شد!</b>\n\n"
        f"📌 تسک: <b>{p.get('task_title', '—')}</b>\n"
        f"👤 توسط: {p.get('assigner', 'مدیر')}"
    )

def _fmt_task_needs_review(p):
    return (
        "نیاز به بررسی",
        f"👀 <b>تسک آماده بررسی است!</b>\n\n"
        f"📌 تسک: <b>{p.get('task_title', '—')}</b>\n"
        f"👤 ارسال‌کننده: {p.get('assignee', 'همکار شما')}"
    )

def _fmt_task_completed(p):
    return (
        "تسک انجام شد",
        f"🎉 <b>تسک انجام شد!</b>\n\n"
        f"📌 تسک <b>{p.get('task_title', '—')}</b> با موفقیت تکمیل شد."
    )

def _fmt_task_deadline_approaching(p):
    return (
        "هشدار ددلاین",
        f"⏰ <b>هشدار ددلاین!</b>\n\n"
        f"کمتر از ۲۴ ساعت به مهلت تسک <b>{p.get('task_title', '—')}</b> باقی مانده."
    )

def _fmt_user_mentioned(p):
    return (
        "منشن در کامنت",
        f"🔔 <b>شما منشن شدید!</b>\n\n"
        f"{p.get('author', 'کسی')} شما را در کامنت‌های تسک "
        f"<b>{p.get('task_title', '—')}</b> تگ کرده است."
    )

def _fmt_task_commented(p):
    return (
        "کامنت جدید",
        f"💬 <b>کامنت جدید!</b>\n\n"
        f"{p.get('author', 'کسی')} یک نظر جدید برای تسک "
        f"<b>{p.get('task_title', '—')}</b> ثبت کرده است."
    )

def _fmt_standup_submitted(p):
    return (
        "گزارش روزانه",
        f"📝 <b>گزارش روزانه (Standup)</b>\n\n"
        f"همکار شما {p.get('user_name', '—')} گزارش استندآپ امروز خود را ثبت کرد."
    )

def _fmt_leave_requested(p):
    return (
        "درخواست مرخصی",
        f"🏖️ <b>درخواست مرخصی جدید!</b>\n\n"
        f"👤 {p.get('user_name', '—')}\n"
        f"📋 نوع: {p.get('leave_type', 'مرخصی')}\n\n"
        f"لطفاً بررسی کنید."
    )

def _fmt_leave_resolved(p):
    return (
        "وضعیت مرخصی",
        f"📋 <b>نتیجه درخواست مرخصی</b>\n\n"
        f"درخواست مرخصی شما بررسی شد.\n"
        f"📊 وضعیت: <b>{p.get('status', '—')}</b>"
    )

def _fmt_timer_started(p):
    return (
        "شروع تایمر",
        f"⏱️ <b>تایمر کاری روشن شد!</b>\n\n"
        f"👤 {p.get('user_name', '—')}\n"
        f"📌 تسک: <b>{p.get('task_title', '—')}</b>"
    )


# Map event types to their formatter functions
_MESSAGE_FORMATTERS = {
    "project_created": _fmt_project_created,
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
}

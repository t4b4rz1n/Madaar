import logging

from django.contrib.auth import get_user_model
from django.utils import translation
from django.utils.translation import gettext as _

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

    # 2. Fetch users in a single optimized query, including their WorkStyleProfile
    users = User.objects.filter(id__in=target_user_ids).select_related('work_style_profile')

    # 3. Route to enabled channels
    for user in users:
        wsp = getattr(user, 'work_style_profile', None)

        # Determine language preferences
        lang = 'fa'
        if wsp and getattr(wsp, 'telegram_language', None):
            lang = wsp.telegram_language

        translation.activate(lang)

        # Format message in user's active language
        subject, message = _format_message(event_type, payload)

        notify_email = wsp.notify_via_email if wsp else False
        notify_telegram = wsp.notify_via_telegram if wsp else False
        telegram_chat_id = wsp.telegram_chat_id if wsp else None

        if notify_email and user.email:
            send_email_notification(user.email, subject, message)

        if notify_telegram and telegram_chat_id:
            send_telegram_notification.delay(telegram_chat_id, message)


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
        from projects.models import Project, ProjectMember
        member_ids = list(
            ProjectMember.objects
            .filter(project_id=payload['project_id'], is_active=True)
            .values_list('user_id', flat=True)
        )

        project = Project.objects.filter(id=payload['project_id']).first()
        if project and project.owner_id:
            member_ids.append(project.owner_id)

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
    return _("اعلان سیستم مدار"), _("📩 یک رویداد جدید در سیستم ثبت شد: <code>{event_type}</code>").format(event_type=event_type)


# ─── Message Formatters ──────────────────────────────────────────────────────

def _fmt_project_created(p):
    return (
        _("پروژه جدید"),
        _("🚀 <b>پروژه جدید ایجاد شد!</b>\n\n"
          "شما توسط {creator} به پروژه <b>{project}</b> اضافه شدید. موفق باشید!").format(
            creator=p.get('creator_name', _('همکار شما')),
            project=p.get('project_name', '—')
        )
    )

def _fmt_project_member_removed(p):
    return (
        _("حذف از پروژه"),
        _("❌ <b>شما از پروژه حذف شدید!</b>\n\n"
          "توسط {remover} دسترسی شما از پروژه <b>{project}</b> قطع شد.").format(
            remover=p.get('remover_name', _('مدیر سیستم')),
            project=p.get('project_name', '—')
        )
    )

def _fmt_project_over_budget(p):
    return (
        _("هشدار بودجه پروژه"),
        _("⚠️ <b>هشدار بودجه!</b>\n\n"
          "بودجه پروژه <b>{project}</b> رو به اتمام است یا از حد مجاز عبور کرده.\n"
          "لطفاً بررسی کنید.").format(project=p.get('project_name', '—'))
    )

def _fmt_milestone_approaching(p):
    return (
        _("نزدیک شدن به پایان فاز"),
        _("⏳ <b>ددلاین نزدیک است!</b>\n\n"
          "کمتر از ۴۸ ساعت تا پایان فاز <b>{milestone}</b> "
          "در پروژه <b>{project}</b> باقی مانده.").format(
              milestone=p.get('milestone_title', '—'),
              project=p.get('project_name', '—')
          )
    )

def _fmt_milestone_completed(p):
    return (
        _("فاز تکمیل شد"),
        _("✅ <b>فاز تکمیل شد!</b>\n\n"
          "فاز <b>{milestone}</b> در پروژه <b>{project}</b> با موفقیت به پایان رسید. خسته نباشید!").format(
              milestone=p.get('milestone_title', '—'),
              project=p.get('project_name', '—')
          )
    )

def _fmt_task_assigned(p):
    return (
        _("تسک جدید"),
        _("🎯 <b>تسک جدید به شما محول شد!</b>\n\n"
          "📌 تسک: <b>{task}</b>\n"
          "👤 توسط: {assigner}").format(
              task=p.get('task_title', '—'),
              assigner=p.get('assigner', _('مدیر'))
          )
    )

def _fmt_task_needs_review(p):
    return (
        _("نیاز به بررسی"),
        _("👀 <b>تسک آماده بررسی است!</b>\n\n"
          "📌 تسک: <b>{task}</b>\n"
          "👤 ارسال‌کننده: {assignee}").format(
              task=p.get('task_title', '—'),
              assignee=p.get('assignee', _('همکار شما'))
          )
    )

def _fmt_task_completed(p):
    return (
        _("تسک انجام شد"),
        _("🎉 <b>تسک انجام شد!</b>\n\n"
          "📌 تسک <b>{task}</b> با موفقیت تکمیل شد.").format(task=p.get('task_title', '—'))
    )

def _fmt_task_deadline_approaching(p):
    return (
        _("هشدار ددلاین"),
        _("⏰ <b>هشدار ددلاین!</b>\n\n"
          "کمتر از ۲۴ ساعت به مهلت تسک <b>{task}</b> باقی مانده.").format(task=p.get('task_title', '—'))
    )

def _fmt_user_mentioned(p):
    return (
        _("منشن در کامنت"),
        _("🔔 <b>شما منشن شدید!</b>\n\n"
          "{author} شما را در کامنت‌های تسک <b>{task}</b> تگ کرده است.").format(
              author=p.get('author', _('کسی')),
              task=p.get('task_title', '—')
          )
    )

def _fmt_task_commented(p):
    return (
        _("کامنت جدید"),
        _("💬 <b>کامنت جدید!</b>\n\n"
          "{author} یک نظر جدید برای تسک <b>{task}</b> ثبت کرده است.").format(
              author=p.get('author', _('کسی')),
              task=p.get('task_title', '—')
          )
    )

def _fmt_standup_submitted(p):
    return (
        _("گزارش روزانه"),
        _("📝 <b>گزارش روزانه (Standup)</b>\n\n"
          "همکار شما {user} گزارش استندآپ امروز خود را ثبت کرد.").format(user=p.get('user_name', '—'))
    )

def _fmt_leave_requested(p):
    return (
        _("درخواست مرخصی"),
        _("🏖️ <b>درخواست مرخصی جدید!</b>\n\n"
          "👤 {user}\n"
          "📋 نوع: {leave_type}\n\n"
          "لطفاً بررسی کنید.").format(
              user=p.get('user_name', '—'),
              leave_type=p.get('leave_type', _('مرخصی'))
          )
    )

def _fmt_leave_resolved(p):
    return (
        _("وضعیت مرخصی"),
        _("📋 <b>نتیجه درخواست مرخصی</b>\n\n"
          "درخواست مرخصی شما بررسی شد.\n"
          "📊 وضعیت: <b>{status}</b>").format(status=p.get('status', '—'))
    )

def _fmt_timer_started(p):
    return (
        _("شروع تایمر"),
        _("⏱️ <b>تایمر کاری روشن شد!</b>\n\n"
          "👤 {user}\n"
          "📌 تسک: <b>{task}</b>").format(
              user=p.get('user_name', '—'),
              task=p.get('task_title', '—')
          )
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
}

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
        # select_related bypasses SoftDeleteManager, so a soft-deleted
        # profile is still loaded.  Treat it as non-existent.
        if wsp and getattr(wsp, "is_deleted", False):
            wsp = None

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
            and str(telegram_chat_id).strip()  # Guard against empty/whitespace-only chat IDs
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
                    work_style_profile__is_deleted=False,
                    work_style_profile__notify_via_telegram=True,
                    work_style_profile__telegram_chat_id__isnull=False,
                )
                .exclude(work_style_profile__telegram_chat_id="")
                .exclude(work_style_profile__telegram_chat_id__regex=r"^\s+$")
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
        _("Added to project"),
        _(
            "🚀 <b>You have been added to a new project!</b>\n\n"
            "You were added by {creator} to project <b>{project}</b>. Good luck!"
        ).format(
            creator=p.get("creator_name", _("your colleague")), project=p.get("project_name", "—")
        ),
    )


def _fmt_project_member_removed(p):
    return (
        _("Removed from project"),
        _(
            "❌ <b>You have been removed from a project!</b>\n\n"
            "Your access to project <b>{project}</b> was revoked by {remover}."
        ).format(
            remover=p.get("remover_name", _("system admin")), project=p.get("project_name", "—")
        ),
    )


def _fmt_project_over_budget(p):
    return (
        _("Project budget warning"),
        _(
            "⚠️ <b>Budget warning!</b>\n\n"
            "The budget for project <b>{project}</b> is running low or has been exceeded.\n"
            "Please review."
        ).format(project=p.get("project_name", "—")),
    )


def _fmt_milestone_approaching(p):
    return (
        _("Milestone deadline approaching"),
        _(
            "⏳ <b>Deadline approaching!</b>\n\n"
            "Less than 48 hours remain until milestone <b>{milestone}</b> "
            "in project <b>{project}</b>."
        ).format(milestone=p.get("milestone_title", "—"), project=p.get("project_name", "—")),
    )


def _fmt_milestone_completed(p):
    return (
        _("Milestone completed"),
        _(
            "✅ <b>Milestone completed!</b>\n\n"
            "Milestone <b>{milestone}</b> in project <b>{project}</b> has been successfully completed. Great job!"
        ).format(milestone=p.get("milestone_title", "—"), project=p.get("project_name", "—")),
    )


def _fmt_task_assigned(p):
    return (
        _("New task assigned"),
        _(
            "🎯 <b>A new task has been assigned to you!</b>\n\n"
            "📌 Task: <b>{task}</b>\n"
            "👤 By: {assigner}"
        ).format(task=p.get("task_title", "—"), assigner=p.get("assigner", _("manager"))),
    )


def _fmt_task_needs_review(p):
    return (
        _("Task ready for review"),
        _(
            "👀 <b>Task is ready for review!</b>\n\n"
            "📌 Task: <b>{task}</b>\n"
            "👤 Submitted by: {assignee}"
        ).format(task=p.get("task_title", "—"), assignee=p.get("assignee", _("your colleague"))),
    )


def _fmt_task_completed(p):
    return (
        _("Task completed"),
        _(
            "🎉 <b>Task completed!</b>\n\n" "📌 Task <b>{task}</b> has been successfully completed."
        ).format(task=p.get("task_title", "—")),
    )


def _fmt_task_deadline_approaching(p):
    return (
        _("Task deadline warning"),
        _(
            "⏰ <b>Deadline warning!</b>\n\n" "Less than 24 hours remain for task <b>{task}</b>."
        ).format(task=p.get("task_title", "—")),
    )


def _fmt_user_mentioned(p):
    return (
        _("Mentioned in comment"),
        _(
            "🔔 <b>You were mentioned!</b>\n\n"
            "{author} mentioned you in the comments of task <b>{task}</b>."
        ).format(author=p.get("author", _("someone")), task=p.get("task_title", "—")),
    )


def _fmt_task_commented(p):
    return (
        _("New comment"),
        _(
            "💬 <b>New comment!</b>\n\n" "{author} added a new comment on task <b>{task}</b>."
        ).format(author=p.get("author", _("someone")), task=p.get("task_title", "—")),
    )


def _fmt_standup_submitted(p):
    return (
        _("Daily standup"),
        _(
            "📝 <b>Daily Stand-up Report</b>\n\n"
            "Your colleague {user} has submitted their daily standup report."
        ).format(user=p.get("user_name", "—")),
    )


def _fmt_leave_requested(p):
    return (
        _("Leave requested"),
        _(
            "🏖️ <b>New leave request!</b>\n\n"
            "👤 {user}\n"
            "📋 Type: {leave_type}\n\n"
            "Please review."
        ).format(user=p.get("user_name", "—"), leave_type=p.get("leave_type", _("leave"))),
    )


def _fmt_leave_resolved(p):
    return (
        _("Leave status"),
        _(
            "📋 <b>Leave request result</b>\n\n"
            "Your leave request has been reviewed.\n"
            "📊 Status: <b>{status}</b>"
        ).format(status=p.get("status", "—")),
    )


def _fmt_timer_started(p):
    return (
        _("Timer started"),
        _("⏱️ <b>Work timer started!</b>\n\n" "👤 {user}\n" "📌 Task: <b>{task}</b>").format(
            user=p.get("user_name", "—"), task=p.get("task_title", "—")
        ),
    )


def _fmt_organization_created(p):
    return (
        _("New organization"),
        _(
            "🏢 <b>New organization created!</b>\n\n"
            "📌 Name: <b>{org_name}</b>\n"
            "👤 Owner: {owner_name}"
        ).format(
            org_name=p.get("org_name", "—"),
            owner_name=p.get("owner_name", "—"),
        ),
    )


def _fmt_project_actually_created(p):
    return (
        _("New project"),
        _(
            "📂 <b>New project created!</b>\n\n"
            "📌 Name: <b>{project_name}</b>\n"
            "🏢 Organization: {org_name}\n"
            "👤 Creator: {creator_name}"
        ).format(
            project_name=p.get("project_name", "—"),
            org_name=p.get("org_name", "—"),
            creator_name=p.get("creator_name", "—"),
        ),
    )


def _fmt_project_budget_set(p):
    return (
        _("Project budget set"),
        _(
            "💰 <b>Project budget set!</b>\n\n"
            "📂 Project: <b>{project_name}</b>\n"
            "💵 Budget: <b>{budget}</b>\n"
            "🏢 Organization: {org_name}"
        ).format(
            project_name=p.get("project_name", "—"),
            budget=p.get("budget", "—"),
            org_name=p.get("org_name", "—"),
        ),
    )


def _fmt_member_added_to_project(p):
    return (
        _("New member added to project"),
        _(
            "👤 <b>New member added to project!</b>\n\n"
            "📂 Project: <b>{project_name}</b>\n"
            "👤 New member: {member_name}\n"
            "🏢 Organization: {org_name}"
        ).format(
            project_name=p.get("project_name", "—"),
            member_name=p.get("member_name", "—"),
            org_name=p.get("org_name", "—"),
        ),
    )


def _fmt_member_added_to_org(p):
    return (
        _("New organization member"),
        _(
            "🏢 <b>New member added to organization!</b>\n\n"
            "🏢 Organization: <b>{org_name}</b>\n"
            "👤 New member: {member_name}\n"
            "🎖 Role: {role}"
        ).format(
            org_name=p.get("org_name", "—"),
            member_name=p.get("member_name", "—"),
            role=p.get("role", "—"),
        ),
    )


def _fmt_board_created(p):
    return (
        _("New Board Created"),
        _(
            "📋 <b>New Board Created!</b>\n\n"
            "Board <b>{board_name}</b> has been added to project <b>{project_name}</b>."
        ).format(
            board_name=p.get("board_name", "—"),
            project_name=p.get("project_name", "—"),
        ),
    )


def _fmt_milestone_created(p):
    return (
        _("New Milestone Created"),
        _(
            "🚩 <b>New Milestone Created!</b>\n\n"
            "Milestone <b>{milestone_title}</b> has been created in project <b>{project_name}</b>."
        ).format(
            milestone_title=p.get("milestone_title", "—"),
            project_name=p.get("project_name", "—"),
        ),
    )


def _fmt_high_priority_task_created(p):
    return (
        _("High Priority Task Created"),
        _(
            "🔴 <b>High Priority Task Created!</b>\n\n"
            "Task: <b>{task_title}</b>\n"
            "Project: {project_name}"
        ).format(
            task_title=p.get("task_title", "—"),
            project_name=p.get("project_name", "—"),
        ),
    )


def _fmt_high_priority_task_completed(p):
    return (
        _("High Priority Task Completed"),
        _(
            "🟢 <b>High Priority Task Completed!</b>\n\n"
            "Task: <b>{task_title}</b>\n"
            "Project: {project_name}"
        ).format(
            task_title=p.get("task_title", "—"),
            project_name=p.get("project_name", "—"),
        ),
    )


def _fmt_task_priority_increased_to_high(p):
    return (
        _("Task Priority Increased to High"),
        _(
            "⬆️ <b>Task Priority Increased to High!</b>\n\n"
            "Task: <b>{task_title}</b>\n"
            "Project: {project_name}"
        ).format(
            task_title=p.get("task_title", "—"),
            project_name=p.get("project_name", "—"),
        ),
    )


def _fmt_task_moved_to_testing(p):
    return (
        _("Task Moved to Testing"),
        _(
            "🧪 <b>Task Moved to Testing!</b>\n\n"
            "Task: <b>{task_title}</b>\n"
            "Project: {project_name}"
        ).format(
            task_title=p.get("task_title", "—"),
            project_name=p.get("project_name", "—"),
        ),
    )


def _fmt_task_created(p):
    return (
        _("New Task Created"),
        _(
            "📝 <b>New Task Created!</b>\n\n"
            "Task: <b>{task_title}</b>\n"
            "Project: {project_name}"
        ).format(
            task_title=p.get("task_title", "—"),
            project_name=p.get("project_name", "—"),
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
    "board_created": _fmt_board_created,
    "milestone_created": _fmt_milestone_created,
    "high_priority_task_created": _fmt_high_priority_task_created,
    "high_priority_task_completed": _fmt_high_priority_task_completed,
    "task_priority_increased_to_high": _fmt_task_priority_increased_to_high,
    "task_moved_to_testing": _fmt_task_moved_to_testing,
    "task_created": _fmt_task_created,
}

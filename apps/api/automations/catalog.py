"""The supported workflow notification events and their safe defaults.

This is deliberately code, not database content: event identifiers are part of the
business-event contract and must not be invented from the admin UI.  A project
administrator can configure delivery and recipients for any of these events.
"""

from django.utils.translation import gettext_lazy as _


class Recipient:
    PROJECT_OWNER = "project_owner"
    PROJECT_MEMBERS = "project_members"
    HAS_PERM_ORG_MANAGE = "has_perm_org_manage"
    HAS_PERM_LEAVE_APPROVE = "has_perm_leave_approve"
    HAS_PERM_PROJECT_MANAGE = "has_perm_project_manage"
    HAS_PERM_TASK_REVIEW = "has_perm_task_review"
    HAS_PERM_TASK_MANAGE = "has_perm_task_manage"
    ASSIGNEE = "assignee"
    REPORTER = "reporter"
    TARGET_USERS = "target_users"
    MENTIONED_USERS = "mentioned_users"
    REQUESTER = "requester"
    SUPERUSERS = "superusers"


RECIPIENT_CHOICES = (
    (Recipient.PROJECT_OWNER, _("Project owner")),
    (Recipient.PROJECT_MEMBERS, _("Project members")),
    (Recipient.HAS_PERM_ORG_MANAGE, _("Users with org settings permission")),
    (Recipient.HAS_PERM_LEAVE_APPROVE, _("Users who can approve leaves")),
    (Recipient.HAS_PERM_PROJECT_MANAGE, _("Users who can manage projects")),
    (Recipient.HAS_PERM_TASK_REVIEW, _("Users who can review tasks")),
    (Recipient.HAS_PERM_TASK_MANAGE, _("Users who can manage tasks")),
    (Recipient.ASSIGNEE, _("Task assignee")),
    (Recipient.REPORTER, _("Task reporter")),
    (Recipient.TARGET_USERS, _("Users directly affected by the event")),
    (Recipient.MENTIONED_USERS, _("Mentioned users")),
    (Recipient.REQUESTER, _("Leave requester")),
    (Recipient.SUPERUSERS, _("System superusers")),
)

RECIPIENT_CODES = {code for code, _label in RECIPIENT_CHOICES}


def _event(
    code, label, description, recipients, allowed_recipients=None, mandatory_recipients=None
):
    return {
        "code": code,
        "label": label,
        "description": description,
        "default_recipients": recipients,
        "allowed_recipients": allowed_recipients
        if allowed_recipients is not None
        else sorted(RECIPIENT_CODES),
        "mandatory_recipients": mandatory_recipients or [],
    }


# The 15 events already emitted by the platform.  Keeping the defaults here
# means every project has a useful, documented configuration even before an
# administrator creates its first override.
AUTOMATION_EVENT_CATALOG = (
    _event(
        "project_created",
        _("Member added to project"),
        _("A user is added to a project."),
        [Recipient.TARGET_USERS],
        allowed_recipients=[
            Recipient.TARGET_USERS,
            Recipient.PROJECT_OWNER,
            Recipient.PROJECT_MEMBERS,
            Recipient.HAS_PERM_ORG_MANAGE,
        ],
        mandatory_recipients=[Recipient.TARGET_USERS],
    ),
    _event(
        "project_member_removed",
        _("Member removed from project"),
        _("A user loses access to a project."),
        [Recipient.TARGET_USERS],
        allowed_recipients=[
            Recipient.TARGET_USERS,
            Recipient.PROJECT_OWNER,
            Recipient.PROJECT_MEMBERS,
            Recipient.HAS_PERM_ORG_MANAGE,
        ],
        mandatory_recipients=[Recipient.TARGET_USERS],
    ),
    _event(
        "project_over_budget",
        _("Project budget warning"),
        _("The project budget requires attention."),
        [Recipient.PROJECT_OWNER, Recipient.HAS_PERM_ORG_MANAGE],
        allowed_recipients=[
            Recipient.PROJECT_OWNER,
            Recipient.PROJECT_MEMBERS,
            Recipient.HAS_PERM_ORG_MANAGE,
            Recipient.HAS_PERM_PROJECT_MANAGE,
        ],
    ),
    _event(
        "milestone_approaching",
        _("Milestone deadline approaching"),
        _("A milestone is due within 48 hours."),
        [Recipient.PROJECT_OWNER, Recipient.HAS_PERM_PROJECT_MANAGE],
        allowed_recipients=[
            Recipient.PROJECT_OWNER,
            Recipient.PROJECT_MEMBERS,
            Recipient.HAS_PERM_PROJECT_MANAGE,
            Recipient.HAS_PERM_ORG_MANAGE,
        ],
    ),
    _event(
        "milestone_completed",
        _("Milestone completed"),
        _("A project milestone is completed."),
        [Recipient.PROJECT_OWNER, Recipient.PROJECT_MEMBERS],
        allowed_recipients=[
            Recipient.PROJECT_OWNER,
            Recipient.PROJECT_MEMBERS,
            Recipient.HAS_PERM_PROJECT_MANAGE,
            Recipient.HAS_PERM_ORG_MANAGE,
        ],
    ),
    _event(
        "task_assigned",
        _("Task assigned"),
        _("A task is assigned to a user."),
        [Recipient.ASSIGNEE],
        allowed_recipients=[
            Recipient.ASSIGNEE,
            Recipient.REPORTER,
            Recipient.PROJECT_OWNER,
            Recipient.PROJECT_MEMBERS,
            Recipient.HAS_PERM_PROJECT_MANAGE,
            Recipient.HAS_PERM_ORG_MANAGE,
        ],
        mandatory_recipients=[Recipient.ASSIGNEE],
    ),
    _event(
        "task_needs_review",
        _("Task ready for review"),
        _("A task enters the review column."),
        [Recipient.REPORTER, Recipient.PROJECT_OWNER],
        allowed_recipients=[
            Recipient.ASSIGNEE,
            Recipient.REPORTER,
            Recipient.PROJECT_OWNER,
            Recipient.PROJECT_MEMBERS,
            Recipient.HAS_PERM_PROJECT_MANAGE,
            Recipient.HAS_PERM_ORG_MANAGE,
        ],
        mandatory_recipients=[Recipient.REPORTER],
    ),
    _event(
        "task_completed",
        _("Task completed"),
        _("A task is marked complete."),
        [Recipient.REPORTER, Recipient.PROJECT_OWNER, Recipient.HAS_PERM_PROJECT_MANAGE],
        allowed_recipients=[
            Recipient.ASSIGNEE,
            Recipient.REPORTER,
            Recipient.PROJECT_OWNER,
            Recipient.PROJECT_MEMBERS,
            Recipient.HAS_PERM_PROJECT_MANAGE,
            Recipient.HAS_PERM_ORG_MANAGE,
        ],
        mandatory_recipients=[Recipient.REPORTER],
    ),
    _event(
        "task_deadline_approaching",
        _("Task deadline approaching"),
        _("An unfinished task is due within 24 hours."),
        [Recipient.ASSIGNEE, Recipient.PROJECT_OWNER, Recipient.HAS_PERM_PROJECT_MANAGE],
        allowed_recipients=[
            Recipient.ASSIGNEE,
            Recipient.REPORTER,
            Recipient.PROJECT_OWNER,
            Recipient.PROJECT_MEMBERS,
            Recipient.HAS_PERM_PROJECT_MANAGE,
            Recipient.HAS_PERM_ORG_MANAGE,
        ],
        mandatory_recipients=[Recipient.ASSIGNEE],
    ),
    _event(
        "user_mentioned",
        _("User mentioned"),
        _("A user is mentioned in a task comment."),
        [Recipient.MENTIONED_USERS],
        allowed_recipients=[
            Recipient.MENTIONED_USERS,
            Recipient.ASSIGNEE,
            Recipient.REPORTER,
            Recipient.PROJECT_OWNER,
            Recipient.PROJECT_MEMBERS,
            Recipient.HAS_PERM_PROJECT_MANAGE,
            Recipient.HAS_PERM_ORG_MANAGE,
        ],
        mandatory_recipients=[Recipient.MENTIONED_USERS],
    ),
    _event(
        "task_commented",
        _("Task comment added"),
        _("A new comment is added to a task."),
        [Recipient.ASSIGNEE, Recipient.REPORTER],
        allowed_recipients=[
            Recipient.ASSIGNEE,
            Recipient.REPORTER,
            Recipient.PROJECT_OWNER,
            Recipient.PROJECT_MEMBERS,
            Recipient.HAS_PERM_PROJECT_MANAGE,
            Recipient.HAS_PERM_ORG_MANAGE,
        ],
    ),
    _event(
        "standup_submitted",
        _("Daily stand-up submitted"),
        _("A team member submits a daily stand-up."),
        [Recipient.HAS_PERM_ORG_MANAGE],
        allowed_recipients=[
            Recipient.HAS_PERM_ORG_MANAGE,
            Recipient.HAS_PERM_PROJECT_MANAGE,
            Recipient.PROJECT_OWNER,
            Recipient.PROJECT_MEMBERS,
        ],
    ),
    _event(
        "leave_requested",
        _("Leave requested"),
        _("A user submits a leave request."),
        [Recipient.HAS_PERM_LEAVE_APPROVE],
        allowed_recipients=[
            Recipient.HAS_PERM_LEAVE_APPROVE,
            Recipient.HAS_PERM_PROJECT_MANAGE,
            Recipient.REQUESTER,
        ],
        mandatory_recipients=[Recipient.HAS_PERM_LEAVE_APPROVE],
    ),
    _event(
        "leave_resolved",
        _("Leave request resolved"),
        _("A leave request is approved or rejected."),
        [Recipient.REQUESTER],
        allowed_recipients=[
            Recipient.REQUESTER,
            Recipient.HAS_PERM_LEAVE_APPROVE,
            Recipient.HAS_PERM_PROJECT_MANAGE,
        ],
        mandatory_recipients=[Recipient.REQUESTER],
    ),
    _event(
        "timer_started",
        _("Work timer started"),
        _("A work timer is started for a task."),
        [Recipient.HAS_PERM_ORG_MANAGE, Recipient.HAS_PERM_PROJECT_MANAGE],
        allowed_recipients=[
            Recipient.HAS_PERM_ORG_MANAGE,
            Recipient.HAS_PERM_PROJECT_MANAGE,
            Recipient.PROJECT_OWNER,
            Recipient.ASSIGNEE,
            Recipient.REPORTER,
        ],
    ),
    # ── Superuser-specific events ──────────────────────────────────────────
    _event(
        "organization_created",
        _("Organization created"),
        _("A new organization is created."),
        [Recipient.SUPERUSERS],
        allowed_recipients=[Recipient.SUPERUSERS],
    ),
    _event(
        "project_actually_created",
        _("Project created"),
        _("A new project is created in the system."),
        [Recipient.SUPERUSERS],
        allowed_recipients=[Recipient.SUPERUSERS],
    ),
    _event(
        "project_budget_set",
        _("Project budget set or changed"),
        _("The budget for a project is set or updated."),
        [Recipient.SUPERUSERS, Recipient.PROJECT_OWNER],
        allowed_recipients=[
            Recipient.SUPERUSERS,
            Recipient.PROJECT_OWNER,
            Recipient.HAS_PERM_ORG_MANAGE,
        ],
    ),
    _event(
        "member_added_to_project",
        _("Member added to project (admin view)"),
        _("A user is added to a project — admins and superusers are notified."),
        [Recipient.SUPERUSERS, Recipient.PROJECT_OWNER, Recipient.HAS_PERM_ORG_MANAGE],
        allowed_recipients=[
            Recipient.SUPERUSERS,
            Recipient.PROJECT_OWNER,
            Recipient.HAS_PERM_ORG_MANAGE,
        ],
    ),
    _event(
        "member_added_to_org",
        _("Member added to organization"),
        _(
            "A user is added to an organization — the new member, admins and superusers are notified."
        ),
        [Recipient.TARGET_USERS, Recipient.SUPERUSERS, Recipient.HAS_PERM_ORG_MANAGE],
        allowed_recipients=[
            Recipient.TARGET_USERS,
            Recipient.SUPERUSERS,
            Recipient.HAS_PERM_ORG_MANAGE,
        ],
    ),
    # ── Owner-specific events ──────────────────────────────────────────────
    _event(
        "board_created",
        _("Board created"),
        _("A new board is created in a project."),
        [Recipient.PROJECT_OWNER, Recipient.HAS_PERM_PROJECT_MANAGE],
        allowed_recipients=[Recipient.PROJECT_OWNER, Recipient.HAS_PERM_PROJECT_MANAGE],
    ),
    _event(
        "milestone_created",
        _("Milestone created"),
        _("A new milestone is created in a project."),
        [Recipient.PROJECT_OWNER],
        allowed_recipients=[Recipient.PROJECT_OWNER],
    ),
    # ── Team Lead-specific events ──────────────────────────────────────────
    _event(
        "task_created",
        _("Task created"),
        _("A new task is created in the project."),
        [Recipient.HAS_PERM_PROJECT_MANAGE],
        allowed_recipients=[Recipient.HAS_PERM_PROJECT_MANAGE, Recipient.PROJECT_OWNER],
    ),
)

EVENTS_BY_CODE = {event["code"]: event for event in AUTOMATION_EVENT_CATALOG}

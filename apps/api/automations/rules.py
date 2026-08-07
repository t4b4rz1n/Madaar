import logging
from django.contrib.auth import get_user_model
from automations.channels.email import send_email_notification
from automations.channels.telegram import send_telegram_notification

logger = logging.getLogger(__name__)
User = get_user_model()

def process_rules_for_event(event_type: str, payload: dict):
    """
    Evaluates business rules for an event and routes it to the appropriate channels.
    """
    logger.info(f"Evaluating rules for event: {event_type}")
    
    # 1. Determine Target Users based on the event payload.
    target_user_ids = determine_target_users(event_type, payload)
    
    if not target_user_ids:
        logger.info("No target users identified for this event.")
        return

    # 2. Prepare the generic message content based on event
    subject, message = format_message_for_event(event_type, payload)

    # 3. For each user, check their NotificationSettings on the User model
    users = User.objects.filter(id__in=target_user_ids)
    
    for user in users:
        # 4. Route to enabled channels
        if user.notify_via_email and user.email:
            send_email_notification(user.email, subject, message)
            
        if user.notify_via_telegram and user.telegram_chat_id:
            send_telegram_notification(user.telegram_chat_id, message)

def determine_target_users(event_type: str, payload: dict) -> set:
    """
    Extracts or looks up the users who should receive this event.
    """
    users = set()
    
    if event_type == "project_created":
        # If project_id is provided, fetch all members
        project_id = payload.get('project_id')
        if project_id:
            from projects.models import ProjectMember
            member_user_ids = ProjectMember.objects.filter(project_id=project_id).values_list('user_id', flat=True)
            users.update(member_user_ids)
            
    if 'target_user_id' in payload:
        users.add(payload['target_user_id'])
    if 'target_user_ids' in payload:
        users.update(payload['target_user_ids'])
        
    return users

def format_message_for_event(event_type: str, payload: dict) -> tuple:
    """
    Formats the message for the given event.
    Returns (subject, message_body)
    """
    # Fallback default
    subject = "Madaar Notification"
    message = f"An event occurred: {event_type}\nDetails: {payload}"
    
    if event_type == "project_created":
        subject = "New Project Created"
        project_title = payload.get('project_title', 'A new project')
        creator_name = payload.get('creator_name', 'Someone')
        message = f"🚀 New Project '{project_title}' has been created by {creator_name}.\nYou have been added as a member!"
        
    elif event_type == "task_assigned":
        subject = "New Task Assigned"
        task_title = payload.get('task_title', 'A task')
        message = f"You have been assigned to: {task_title}"
        
    elif event_type == "task_needs_review":
        subject = "Task Ready for Review"
        task_title = payload.get('task_title', 'A task')
        message = f"The task '{task_title}' is ready for your review."
        
    elif event_type == "task_completed":
        subject = "Task Completed"
        task_title = payload.get('task_title', 'A task')
        message = f"The task '{task_title}' has been marked as Done."
        
    elif event_type == "user_mentioned":
        subject = "You were mentioned"
        message = payload.get('comment_text', 'You were mentioned in a comment.')
        
    elif event_type == "leave_requested":
        subject = "New Leave Request"
        user_name = payload.get('user_name', 'An employee')
        message = f"{user_name} has requested leave. Please review."
        
    elif event_type == "leave_resolved":
        subject = "Leave Request Update"
        status = payload.get('status', 'processed')
        message = f"Your leave request has been {status}."
        
    return subject, message

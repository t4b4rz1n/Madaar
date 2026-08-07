from celery import shared_task
import logging

logger = logging.getLogger(__name__)

@shared_task(name="automations.process_event_task")
def process_event_task(event_type: str, payload: dict):
    """
    Celery task to process system events in the background.
    Routes the event through Notification Rules and dispatches it via channels.
    """
    logger.info(f"Processing event '{event_type}' with payload: {payload}")
    
    # We will import rules here to avoid circular imports if necessary
    from automations.rules import process_rules_for_event
    
    try:
        process_rules_for_event(event_type, payload)
    except Exception as e:
        logger.error(f"Error processing event '{event_type}': {e}", exc_info=True)

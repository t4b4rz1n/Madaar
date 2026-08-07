from celery import shared_task
import logging

logger = logging.getLogger(__name__)


@shared_task(
    name="automations.process_event_task",
    bind=True,
    max_retries=3,
    default_retry_delay=10,
    acks_late=True,
)
def process_event_task(self, event_type: str, payload: dict):
    """
    Celery task to process system events in the background.
    Includes retry logic for transient failures (e.g. network issues).
    """
    logger.info(f"Processing event: '{event_type}'")

    from automations.rules import process_rules_for_event

    try:
        process_rules_for_event(event_type, payload)
    except Exception as e:
        logger.error(f"Error processing event '{event_type}': {e}", exc_info=True)
        # Retry on transient failures (network, timeout, etc.)
        try:
            self.retry(exc=e)
        except self.MaxRetriesExceededError:
            logger.critical(f"Max retries exceeded for event '{event_type}'. Giving up.")

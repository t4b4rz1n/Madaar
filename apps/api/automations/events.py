import logging

from django.db import transaction

logger = logging.getLogger(__name__)


class EventDispatcher:
    """
    Central dispatcher for all business events in the platform.
    Ensures events are processed ONLY after the DB transaction commits.
    In EAGER mode (local dev), tasks run synchronously without needing Redis/Celery.
    """

    @classmethod
    def dispatch(cls, event_type: str, payload: dict):
        """
        Dispatches an event for async processing.
        Uses transaction.on_commit to guarantee data consistency.
        """
        logger.info(f"Event dispatched: '{event_type}'")

        # Import here to avoid circular imports at module load time
        from automations.tasks import process_event_task

        transaction.on_commit(
            lambda et=event_type, pl=payload: process_event_task.delay(et, pl)
        )

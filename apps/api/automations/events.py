from django.db import transaction
import logging
from automations.tasks import process_event_task

logger = logging.getLogger(__name__)

class EventDispatcher:
    """
    Central dispatcher for all business events in the platform.
    Ensures that events are pushed to the Celery queue ONLY if the DB transaction succeeds.
    """

    @classmethod
    def dispatch(cls, event_type: str, payload: dict):
        """
        Dispatches an event asynchronously.
        
        Args:
            event_type (str): The name of the event (e.g. 'task_completed').
            payload (dict): JSON-serializable dictionary containing event details.
        """
        logger.info(f"Dispatching event '{event_type}' with payload: {payload}")
        
        # We use transaction.on_commit to ensure the event is only sent 
        # to Celery if the surrounding database transaction actually commits.
        # This prevents sending emails for tasks that ultimately roll back.
        transaction.on_commit(lambda: process_event_task.delay(event_type, payload))

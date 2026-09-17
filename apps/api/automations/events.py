import logging

from django.db import transaction

logger = logging.getLogger(__name__)


class EventDispatcher:
    """
    Central dispatcher for all business events in the platform.
    Ensures events are processed ONLY after the DB transaction commits.
    Fault-tolerant: if Celery/Redis is unavailable, the main operation
    (e.g. task assignment) still succeeds and the event is logged for debugging.
    """

    @classmethod
    def dispatch(cls, event_type: str, payload: dict):
        """
        Dispatches an event for async processing.
        Uses transaction.on_commit to guarantee data consistency.
        Wrapped in try/except so notification failures never break business logic.
        """
        logger.info(f"Event dispatched: '{event_type}'")

        def _safe_dispatch(et, pl):
            try:
                from django.conf import settings

                from automations.tasks import process_event_task

                if getattr(settings, "CELERY_TASK_ALWAYS_EAGER", False):
                    import threading

                    # Run in a background thread so it doesn't block the HTTP response
                    # when Celery is in synchronous EAGER mode (local dev).
                    threading.Thread(target=process_event_task.delay, args=(et, pl)).start()
                else:
                    process_event_task.delay(et, pl)
            except Exception as exc:
                logger.error(
                    f"Failed to queue event '{et}': {exc}. "
                    f"The main operation succeeded but the notification was not sent.",
                    exc_info=True,
                )

        transaction.on_commit(lambda et=event_type, pl=payload: _safe_dispatch(et, pl))

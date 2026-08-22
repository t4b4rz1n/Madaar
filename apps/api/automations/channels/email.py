import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


@shared_task(
    name="automations.send_email_notification",
    bind=True,
    max_retries=3,
    default_retry_delay=10,
    acks_late=True,
)
def send_email_notification(self, to_email: str, subject: str, message: str):
    """
    Sends an email notification to the specified address.

    Runs as a Celery task so email delivery (SMTP / email provider) never
    blocks the event-processing worker and can be retried on transient
    failures (network errors, provider rate limits, etc.).

    To enable delivery, configure Django's email settings
    (EMAIL_BACKEND, EMAIL_HOST, DEFAULT_FROM_EMAIL, ...). Once a provider
    is configured, notifications are delivered over email automatically for
    users who have `notify_via_email = True` and an action_type that includes
    EMAIL (EMAIL or BOTH).
    """
    logger.info(f"Sending email to {to_email} | Subject: {subject}")

    try:
        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@madaar.io")

        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=[to_email],
            fail_silently=False,
        )
        logger.info(f"Successfully sent email to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}. Error: {e}", exc_info=True)
        try:
            self.retry(exc=e)
        except self.MaxRetriesExceededError:
            logger.critical(f"Max retries exceeded for email to {to_email}. Giving up.")

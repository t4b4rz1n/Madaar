import logging
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)

def send_email_notification(to_email: str, subject: str, message: str):
    """
    Sends an email notification to the specified address.
    """
    logger.info(f"Sending email to {to_email} | Subject: {subject}")
    
    try:
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@madaar.io')
        
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

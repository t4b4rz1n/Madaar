import logging

from celery import shared_task

from gamification.models import UserPointBalance

logger = logging.getLogger(__name__)

@shared_task
def reset_monthly_kudos_budget():
    """
    Cron job to reset the monthly kudos budget for all users to the default 100 points.
    Should be run at 00:00 on the 1st of every month via Celery Beat.
    """
    default_budget = 100
    updated_count = UserPointBalance.objects.filter(is_deleted=False).update(kudos_budget=default_budget)
    logger.info(f"Reset kudos budget to {default_budget} for {updated_count} users.")
    return updated_count

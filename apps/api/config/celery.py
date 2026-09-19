import os

from celery import Celery

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("base_project")

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
# - namespace='CELERY' means all celery-related configuration keys
#   should have a `CELERY_` prefix.
app.config_from_object("django.conf:settings", namespace="CELERY")

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

from celery.schedules import crontab

app.conf.beat_schedule = {
    'reset-kudos-budget-monthly': {
        'task': 'gamification.tasks.reset_monthly_kudos_budget',
        'schedule': crontab(day_of_month='1', hour='0', minute='0'),
    },
}

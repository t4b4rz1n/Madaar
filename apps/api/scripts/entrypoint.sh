#!/bin/sh
set -e

# Wait for the database to be ready and apply migrations

echo "Waiting for database and applying migrations..."
until python manage.py migrate --noinput; do
  echo "Database not ready yet or migration failed. Sleeping 5 seconds..."
  sleep 5
done


# Create superuser if it does not exist

echo "Creating superuser..."
python manage.py shell -c "
import os
from django.contrib.auth import get_user_model

User = get_user_model()
username = os.environ.get('SUPERUSER_USERNAME', 'admin')
email = os.environ.get('SUPERUSER_EMAIL', 'admin@example.com')
password = os.environ.get('SUPERUSER_PASSWORD', 'adminpass123')
first_name = os.environ.get('SUPERUSER_FIRST_NAME', 'Admin')
last_name = os.environ.get('SUPERUSER_LAST_NAME', 'User')

if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username=username, email=email, password=password, first_name=first_name, last_name=last_name)
    print(f'Superuser {username} created successfully!')
else:
    print(f'Superuser {username} already exists.')
"

echo "Starting server..."
if [ "$DEBUG" = "True" ] || [ "$DEBUG" = "true" ] || [ "$DEBUG" = "1" ]; then
    echo "Running in development mode (runserver)..."
    python manage.py runserver 0.0.0.0:8000
else
    echo "Running in production mode (gunicorn)..."
    exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3
fi

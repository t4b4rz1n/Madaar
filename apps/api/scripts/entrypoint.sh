#!/bin/sh
set -e

DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"

echo "Waiting for PostgreSQL ($DB_HOST:$DB_PORT)..."
while ! nc -z "$DB_HOST" "$DB_PORT"; do
  sleep 1
done

echo "PostgreSQL is up and accepting connections."

echo "Applying database migrations..."
python manage.py migrate --noinput

if [ -n "$SUPERUSER_USERNAME" ] && [ -n "$SUPERUSER_PASSWORD" ]; then
    echo "Ensuring superuser exists..."
    python manage.py shell -c "
import os
from django.contrib.auth import get_user_model

User = get_user_model()
username = os.environ.get('SUPERUSER_USERNAME')
email = os.environ.get('SUPERUSER_EMAIL', 'admin@example.com')
password = os.environ.get('SUPERUSER_PASSWORD')
first_name = os.environ.get('SUPERUSER_FIRST_NAME', 'Admin')
last_name = os.environ.get('SUPERUSER_LAST_NAME', 'User')

if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username=username, email=email, password=password, first_name=first_name, last_name=last_name)
    print(f'Superuser {username} created successfully.')
"
fi

echo "Starting server..."
if [ "$DEBUG" = "True" ] || [ "$DEBUG" = "true" ] || [ "$DEBUG" = "1" ]; then
    echo "Running in development mode (runserver)..."
    python manage.py runserver 0.0.0.0:8000
else
    echo "Running in production mode (gunicorn with gthread)..."
    exec gunicorn config.wsgi:application \
        --bind 0.0.0.0:8000 \
        --workers 3 \
        --threads 4 \
        --worker-class gthread \
        --max-requests 1000 \
        --max-requests-jitter 50 \
        --timeout 60
fi

FROM python:3.11-slim-bookworm

RUN apt-get update -o Acquire::Check-Valid-Until=false -o Acquire::Check-Date=false \
    && apt-get install -y --no-install-recommends \
       gcc \
       libpq-dev \
       gettext \
       curl \
       libmagic1 \
       netcat-openbsd \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

WORKDIR /app

RUN pip install --upgrade pip --no-cache-dir
COPY requirements/ ./requirements/
RUN pip install -r requirements/prod.txt --no-cache-dir

# Build-time env vars (safe defaults for collectstatic during build)
ENV SECRET_KEY='build-time-fake-key'
ENV DEBUG='False'
ENV DB_HOST='build-time-fake-db-host'
ENV DB_NAME='fake'
ENV DB_USER='fake'
ENV DB_PASSWORD='fake'
ENV DB_PORT='1234'
ENV USE_MINIO='False'
ENV USE_SQLITE='False'

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser -d /app appuser

# Create log directory and chown it for appuser
RUN mkdir -p /var/log/madar && chown -R appuser:appuser /var/log/madar
ENV LOGS_DIR=/var/log/madar

COPY . .

RUN python manage.py collectstatic --noinput

RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

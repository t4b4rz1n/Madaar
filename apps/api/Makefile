.PHONY: help build up down logs migrate makemigrations shell test lint format celery-up minio-up all-up

help:
	@echo "Available commands:"
	@echo "  build            - Build docker images"
	@echo "  up               - Start docker containers (without celery, minio)"
	@echo "  down             - Stop docker containers"
	@echo "  logs             - View docker logs"
	@echo "  migrate          - Run django migrations"
	@echo "  makemigrations   - Create django migrations"
	@echo "  shell            - Open django shell"
	@echo "  test             - Run tests"
	@echo "  lint             - Run ruff linter"
	@echo "  format           - Run ruff formatter"
	@echo "  setup-pre-commit - Install pre-commit hooks"
	@echo "  celery-up        - Start containers with celery"
	@echo "  minio-up         - Start containers with minio"
	@echo "  all-up           - Start containers with all services"

build:
	docker compose up --build -d

up:
	docker compose up -d

celery-up:
	docker compose --profile celery up -d

minio-up:
	docker compose --profile minio up -d

all-up:
	docker compose --profile "*" up -d

down:
	docker compose down

logs:
	docker compose logs -f

migrate:
	docker compose exec backend python manage.py migrate

makemigrations:
	docker compose exec backend python manage.py makemigrations

superuser:
	docker compose exec backend python manage.py createsuperuser

shell:
	docker compose exec backend python manage.py shell

test:
	docker compose exec backend python manage.py test

lint:
	ruff check .

format:
	ruff format .

setup-pre-commit:
	pre-commit install
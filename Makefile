.PHONY: help up up-build down logs api-shell api-migrate api-test api-lint worker-up

DOCKER_COMPOSE ?= $(shell command -v docker-compose 2>/dev/null || echo "docker compose")

help:
	@echo "Madar commands"
	@echo "  make up          Start local services"
	@echo "  make up-build    Build and start local services"
	@echo "  make down        Stop services"
	@echo "  make logs        Follow logs"
	@echo "  make api-test    Run API tests"
	@echo "  make worker-up   Start worker profile"

up:
	$(DOCKER_COMPOSE) up -d
	@echo ""
	@echo "🚀 Madaar services are up and running:"
	@echo "  🌐 Web (Frontend): http://localhost:3000"
	@echo "  🔌 API (Backend):  http://localhost:8000"
	@echo "  📦 MinIO Console:  http://localhost:9001"
	@echo ""

up-build:
	$(DOCKER_COMPOSE) up --build -d
	@echo ""
	@echo "🚀 Madaar services are built and running:"
	@echo "  🌐 Web (Frontend): http://localhost:3000"
	@echo "  🔌 API (Backend):  http://localhost:8000"
	@echo "  📦 MinIO Console:  http://localhost:9001"
	@echo ""

down:
	$(DOCKER_COMPOSE) down

logs:
	$(DOCKER_COMPOSE) logs -f

api-shell:
	$(DOCKER_COMPOSE) exec api python manage.py shell

api-migrate:
	$(DOCKER_COMPOSE) exec api python manage.py migrate

api-test:
	$(DOCKER_COMPOSE) exec api python manage.py test

api-lint:
	$(DOCKER_COMPOSE) exec api python -m ruff check .

worker-up:
	$(DOCKER_COMPOSE) --profile worker up worker



.PHONY: help up up-build dev down logs api-shell api-migrate api-test api-lint worker-up

DOCKER_COMPOSE ?= $(shell command -v docker-compose 2>/dev/null || echo "docker compose")

help:
	@echo "Madar commands"
	@echo "  make dev         Start backend in Docker & run Frontend locally (Hot Reload)"
	@echo "  make up          Start all services in Docker"
	@echo "  make up-build    Build and start all services in Docker"
	@echo "  make down        Stop services"
	@echo "  make logs        Follow logs"
	@echo "  make api-test    Run API tests"
	@echo "  make worker-up   Start worker profile"

dev:
	@$(DOCKER_COMPOSE) stop web 2>/dev/null || true
	$(DOCKER_COMPOSE) up -d --scale web=0
	@[ -d "apps/web/node_modules" ] || (echo "📦 Installing web dependencies..." && npm --prefix apps/web install)
	@echo ""
	@echo "🚀 Backend & Infrastructure services running in Docker:"
	@echo "  🔌 API (Backend):  http://localhost:8000"
	@echo "  📦 MinIO Console:  http://localhost:9001"
	@echo ""
	@echo "⚡ Starting Frontend locally on http://localhost:3000 (Hot Reload active)..."
	@echo ""
	cd apps/web && npm run dev

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

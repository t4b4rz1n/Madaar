.PHONY: help up up-build down logs api-shell api-migrate api-test api-lint worker-up

help:
	@echo "Madar commands"
	@echo "  make up          Start local services"
	@echo "  make up-build    Build and start local services"
	@echo "  make down        Stop services"
	@echo "  make logs        Follow logs"
	@echo "  make api-test    Run API tests"
	@echo "  make worker-up   Start worker profile"

up:
	docker-compose up

up-build:
	docker-compose up --build

down:
	docker-compose down

logs:
	docker-compose logs -f

api-shell:
	docker-compose exec api python manage.py shell

api-migrate:
	docker-compose exec api python manage.py migrate

api-test:
	docker-compose exec api python manage.py test

api-lint:
	docker-compose exec api python -m ruff check .

worker-up:
	docker-compose --profile worker up worker


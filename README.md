# Madar

Madar is the monorepo base for building the Madar product. It currently brings together:

- `apps/api`: the Django / Django REST Framework backend base.
- `apps/web`: the React / Vite admin panel base.
- `apps/worker`: the placeholder for future async/background work.
- `infra`, `docs`, `scripts`, and `.github`: the standard project support folders.

This repository is prepared so the current backend and frontend bases can run together now, and the real Madar modules can be added later with a clean structure.

## Project Structure

```text
Madar/
|-- apps/
|   |-- api/       # Django / DRF base
|   |-- web/       # React / Vite base
|   `-- worker/    # Future async jobs, queues, schedulers
|-- infra/         # Docker, Nginx, deployment notes
|-- docs/          # Product, architecture, standards, operations
|-- scripts/       # Bootstrap/check helper scripts
|-- .github/       # CI workflows and GitHub templates
|-- docker-compose.yml
|-- README.md
|-- Makefile
|-- LICENSE
|-- CONTRIBUTING.md
|-- SECURITY.md
`-- CODE_OF_CONDUCT.md
```

## Important Environment Rule

Real `.env` files must not be committed to GitHub.

Commit these:

```text
apps/api/.env.example
apps/web/.env.example
.env.example
```

Do not commit these:

```text
apps/api/.env
apps/web/.env
.env
```

The `.gitignore` is already configured for this. After a fresh clone, every developer must create local `.env` files from the examples.

## First Setup After Clone

From the repository root:

```powershell
cd C:\path\to\Madar
```

Create local environment files:

```powershell
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env
```

Or use the bootstrap script:

```powershell
.\scripts\bootstrap.ps1
```

The bootstrap script copies the env examples and runs Docker Compose.

## Run The Project

From the repository root:

```powershell
docker-compose up --build
```

To run in the background:

```powershell
docker-compose up -d --build
```

To stop everything:

```powershell
docker-compose down
```

To stop and remove volumes, including the local PostgreSQL data:

```powershell
docker-compose down -v
```

Use `down -v` only when you intentionally want to reset the local database.

## Local URLs

After the containers are running:

```text
Web app:
http://localhost:3000

API direct:
http://localhost:8000

API through web Nginx:
http://localhost:3000/api/v1/

Django admin through web Nginx:
http://localhost:3000/admin/
```

Default local admin user:

```text
username: admin
password: adminpass123
```

## Docker Services

The root `docker-compose.yml` defines:

```text
db       PostgreSQL 16
redis    Redis for cache/queues/background jobs
api      Django / DRF backend
web      React build served by Nginx
worker   Celery worker profile for future async work
```

Normal development starts only:

```text
db, redis, api, web
```

The worker is optional and can be started later:

```powershell
docker-compose --profile worker up worker
```

## Backend Base

Backend path:

```text
apps/api
```

Important files:

```text
apps/api/manage.py
apps/api/config/settings.py
apps/api/config/urls.py
apps/api/requirements/base.txt
apps/api/requirements/local.txt
apps/api/requirements/prod.txt
apps/api/scripts/entrypoint.sh
apps/api/.env.example
```

The old root `start.sh` is intentionally not used in this monorepo. Running the whole project must be controlled from the repository root with:

```text
docker-compose.yml
Makefile
scripts/
```

The API container starts with:

```text
sh scripts/entrypoint.sh
```

That entrypoint runs migrations, creates the local superuser if needed, and starts the Django server.

## Frontend Base

Frontend path:

```text
apps/web
```

Important files:

```text
apps/web/package.json
apps/web/vite.config.ts
apps/web/nginx.conf
apps/web/src/
apps/web/.env.example
```

The frontend is built with:

```text
VITE_API_BASE_URL=/api
VITE_API_VERSION=v1
```

So frontend requests go to:

```text
/api/v1/...
```

Nginx inside the `web` container proxies `/api/` to the `api` service.

## Why apps/api And apps/web?

This is the standard monorepo layout for a project that can grow later.

Current apps:

```text
apps/api
apps/web
apps/worker
```

Future apps can be added without changing the root structure:

```text
apps/mobile
apps/docs
apps/landing
```

For now, do not add random product modules at the repository root. Madar modules should be added inside the proper app:

- Backend modules go inside `apps/api`.
- Frontend modules go inside `apps/web/src/features`.
- Background jobs can later move into `apps/worker` or stay as Celery tasks in `apps/api` until they grow.

## Suggested Madar Development Direction

Based on the Madar project document, future work should follow these boundaries:

Backend:

- Keep business logic out of views and serializers.
- Put complex domain logic in service modules.
- Keep API routes versioned under `/api/v1/`.
- Use PostgreSQL for Docker/local parity.
- Use JWT for API authentication.
- Keep secrets in `.env`, never in code.

Frontend:

- Keep the feature-driven structure under `apps/web/src/features`.
- Use React Query for server state.
- Use Zustand only for local/global UI state.
- Keep API calls centralized.
- Prepare the UI for RTL/LTR and i18n.
- Keep route-level code splitting where possible.

## Useful Commands

Check Docker Compose config:

```powershell
docker-compose config
```

Show running containers:

```powershell
docker-compose ps
```

Follow logs:

```powershell
docker-compose logs -f
```

Follow only API logs:

```powershell
docker-compose logs -f api
```

Run backend migrations:

```powershell
docker-compose exec api python manage.py migrate
```

Open Django shell:

```powershell
docker-compose exec api python manage.py shell
```

Run backend tests:

```powershell
docker-compose exec api python manage.py test
```

Run frontend build locally from source:

```powershell
cd apps\web
npm ci
npm run build
```

## GitHub Push Checklist

Before pushing this repository to GitHub:

```powershell
git status
```

Make sure these files are not staged:

```text
apps/api/.env
apps/web/.env
.env
```

These files should be staged:

```text
apps/api/.env.example
apps/web/.env.example
.env.example
README.md
docker-compose.yml
```

## Troubleshooting

### `.env` file is missing

Create it from the examples:

```powershell
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env
```

### API cannot connect to PostgreSQL

Check this value:

```text
apps/api/.env
DB_HOST=madar_db
```

Then restart:

```powershell
docker-compose down
docker-compose up --build
```

### Port is already allocated

If `3000`, `8000`, or `5432` is already used, either stop the other service or change the published port in `docker-compose.yml`.

Redis is internal and does not need to publish port `6379` to the host.

### Frontend build shows npm audit warnings

Warnings from `npm audit` do not necessarily stop the build. Handle them separately after the base project is running.

## Repository Standard

This repository is intended to be open-source friendly. Keep these files updated:

```text
README.md
CONTRIBUTING.md
SECURITY.md
CODE_OF_CONDUCT.md
LICENSE
CHANGELOG.md
ROADMAP.md
docs/
.github/
```


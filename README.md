# Madaar - Enterprise Work OS

Madaar is not just a task manager; it is a unified, intelligent operating system for your team. From daily tasks and code commits to financial rewards, gamification, and high-level company OKRs, Madaar brings every process into precise harmony around the core of the organization.

By combining agile project management, a comprehensive gamification engine, and a deep focus on mental well-being, Madaar eliminates communication friction and allows every team member to achieve their goals with maximum productivity and peace of mind.

## 🌟 Core Modules

- **Identity & Org (RBAC):** Advanced role-based access, team squads, and automated onboarding/offboarding.
- **Projects & Tasks:** Kanban boards, sub-tasks, milestone tracking, and async standups.
- **Time & Attendance:** Live time tracking, timesheets, leave management, and remote work requests.
- **Gamification & Rewards:** Badges, leaderboards, quests, peer kudos, and automated bonus calculation.
- **Finance & Payroll:** Automated payroll engine tied to timesheets and gamification points.
- **Performance & OKRs:** 360 reviews, skill matrices, and alignment of daily tasks with company OKRs.
- **Well-being & Culture:** Pomodoro focus mode, burnout monitoring, anonymous feedback, and mood tracking.
- **Knowledge Management:** Internal Wiki, technical docs, lessons learned, and upvote-based rewards.
- **Developer Integrations:** Auto-close tasks via Git commits, PR monitoring, and seamless CI/CD tracking.

## 🏗️ Project Architecture

This is a monorepo containing the following core services:

```text
Madaar/
|-- apps/
|   |-- api/       # Backend (Django, DRF, Celery, PostgreSQL)
|   |-- web/       # Frontend (React, Vite, Tailwind CSS, Zustand, React Query)
|   `-- worker/    # Async jobs, queues, and schedulers
|-- infra/         # Docker, Nginx, deployment configs
|-- docs/          # Product PRD, architecture, and standards
`-- docker-compose.yml
```

### Tech Stack
- **Frontend:** React, TypeScript, Vite, Tailwind CSS (Glassmorphism UI), React Query, Zustand.
- **Backend:** Python, Django, Django REST Framework, PostgreSQL, Redis, Celery.
- **DevOps:** Docker, Docker Compose, Nginx, GitHub Actions.

## 🚀 Quick Start (Development)

### 1. Environment Setup
Never commit real `.env` files. Create your local environment variables from the examples provided:

```bash
# Linux / macOS
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Windows (PowerShell)
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env
```

### 2. Run with Docker Compose
The entire stack (DB, Redis, API, Web, Worker) is containerized for exact local/production parity.

```bash
# Build and start all services in the background
docker compose up --build -d
```

### 3. Access the Application
Once the containers are healthy, access the services locally:

- **Web App (Frontend):** `http://localhost:3000`
- **API Endpoint:** `http://localhost:3000/api/v1/`
- **Django Admin:** `http://localhost:3000/admin/`

*Default superuser credentials (created automatically on first boot):*
- **Username:** `admin`
- **Password:** `adminpass123`

## 🛠️ Useful Docker Commands

```bash
# View live logs for all services
docker compose logs -f

# View logs for a specific service (e.g., the backend api)
docker compose logs -f api

# Stop all services
docker compose down

# Stop all services AND wipe the database (use with caution!)
docker compose down -v

# Run Django migrations manually
docker compose exec api python manage.py migrate

# Open Django shell
docker compose exec api python manage.py shell
```

## 📜 Standards & Guidelines

- **Backend:** Business logic belongs in `services.py`, not views. Use soft-deletes. Keep API endpoints versioned (`/api/v1/...`).
- **Frontend:** Strictly Mobile-First (`md:`, `lg:` prefixes). Use logical properties (`ms-`, `ps-`) for seamless LTR/RTL support. Always cleanup timers and event listeners in `useEffect` to prevent memory leaks.
- **Database:** All dates and times must be stored in standard **UTC** ISO-8601 format.

## 📄 License
This project is proprietary. Refer to the internal documentation for licensing and distribution details.

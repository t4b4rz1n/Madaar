# 🚀 Base API Django

A production-ready Django REST Framework template for building backend APIs. Includes user authentication, ticketing system, notifications, feedback, billing, and more — all pre-configured and ready to customize.

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **Authentication** | JWT-based auth with register, login, logout, token refresh |
| 👤 **User Management** | Custom user model with profile image, admin panel for user management |
| 🎫 **Ticketing System** | Full support tickets with messages, multi-file attachments, priority & status tracking |
| 🔔 **Notifications** | User notification system with seen/unseen tracking |
| 💬 **Feedback** | User feedback collection system |
| 💰 **Billing** | Discount codes with validation, ZarinPal & NOWPayments integration ready |
| 📁 **MinIO/S3 Storage** | Optional S3-compatible object storage for media files |
| 📊 **Statistics Mixin** | `stat_field` query param on any list view for quick field-based grouping |
| 📄 **Swagger / ReDoc** | Auto-generated API documentation out of the box |
| 🐳 **Docker Ready** | One command to spin up the entire stack |

## 🏗️ Project Structure

```
├── accounts/           # Custom user model & profile management
├── authentication/     # JWT auth (register, login, logout)
├── billing/            # Discount codes & payment gateway integration
├── common/             # BaseModel (UUID + timestamps), utilities, mixins
├── config/             # Django settings, URLs, renderers, pagination
├── dashboard/          # User-facing APIs (tickets, notifications, feedback)
├── panel/              # Admin/Staff APIs (ticket management, users, discounts)
├── scripts/            # Utility scripts (MinIO setup)
├── start.sh            # 🎨 Interactive setup wizard
├── docker-compose.yml  # Docker Compose configuration
├── Dockerfile          # Container build instructions
└── .env.example        # Environment variables template
```

## 🚀 Quick Start

### Option 1: Interactive Setup (Recommended)
### Prerequisites
- Docker
- Make (optional, for using Makefile commands)

The setup wizard will guide you through:
1. **Project naming** — rename all references from `base_project`
2. **Run mode** — Docker or manual
3. **Database** — PostgreSQL or SQLite
4. **Services** — MinIO storage, Redis cache
5. **Superuser** — Admin credentials
6. **Launch** — optionally start everything immediately

### Option 2: Manual Docker Setup

```bash
cp .env.example .env    # edit values as needed
docker compose up --build
```

With optional services:
```bash
docker compose --profile minio --profile redis up --build
```

### Option 3: Manual Local Setup

```bash
cp .env.example .env
# Set USE_SQLITE=True in .env for zero-config database

python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

## 📚 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/` | Swagger UI Documentation |
| `/redoc/` | ReDoc Documentation |
| `/admin/` | Django Admin Panel |
| **Auth** | |
| `POST /api/v1/auth/register/` | User registration |
| `POST /api/v1/auth/login/` | Login (returns JWT + user data) |
| `POST /api/v1/auth/login/refresh/` | Refresh JWT token |
| `POST /api/v1/auth/logout/` | Logout (blacklists refresh token) |
| **User** | |
| `PATCH /api/v1/accounts/profile/update/` | Update profile |
| **Dashboard (User)** | |
| `/api/v1/dashboard/tickets/` | User's support tickets (CRUD) |
| `/api/v1/dashboard/notifications/` | User's notifications |
| `/api/v1/dashboard/feedbacks/` | Submit feedback |
| **Panel (Admin)** | |
| `/api/v1/panel/tickets/` | Manage all tickets |
| `/api/v1/panel/notifications/` | Manage notifications |
| `/api/v1/panel/users/` | User management |
| `/api/v1/panel/feedbacks/` | View all feedback |
| `/api/v1/panel/discounts/` | Manage discount codes |

## ⚙️ Environment Variables

See [`.env.example`](.env.example) for all available configuration options. Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | — | Django secret key |
| `DEBUG` | `True` | Debug mode |
| `USE_SQLITE` | `False` | Use SQLite instead of PostgreSQL |
| `USE_MINIO` | `False` | Use MinIO/S3 for media storage |
| `DB_HOST` | `localhost` | Database host (`db_postgres` for Docker) |

## 🏛️ Architecture

- **Custom User Model** — `accounts.User` extends `AbstractUser` with profile image
- **BaseModel** — All models use UUID primary keys + `created_at`/`updated_at` timestamps
- **ApiRenderer** — Consistent JSON response format: `{status, message, data, errors}`
- **DefaultPagination** — Rich pagination with `total_pages`, `has_next`, `current_page`, etc.
- **Panel vs Dashboard** — Admin APIs in `panel/`, user-facing APIs in `dashboard/`

## 🧪 Testing

This project comes with a comprehensive test suite covering authentication, user profiles, ticketing, and billing configurations.

To run the automated tests locally:
```bash
USE_SQLITE=True python manage.py test
```

## 🤝 Contributing

Contributions are welcome! Please check out our [Contributing Guidelines](CONTRIBUTING.md) to learn how you can help improve this boilerplate.

## 📝 License

This project is licensed under the **MIT License** — feel free to use and customize it for your personal or commercial applications. See the [LICENSE](LICENSE) file for details.

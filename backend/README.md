# AgriConnect Backend

AgriConnect is a modular Django 4.2 backend that powers an agricultural management platform. It delivers user authentication, farm management, marketplace listings, inventory tracking, analytics, and notifications backed by PostgreSQL, Redis, Celery, and JWT-secured APIs.

## Features
- Custom user model with email login, role-based authorization, and password policies.
- JWT authentication via Simple JWT with refresh, verify, and blacklist support.
- RESTful apps for farms, marketplace listings, inventory items, analytics metrics, and notifications.
- PostgreSQL storage with psycopg3, Redis-powered Celery hooks, and CORS-enabled API consumption.
- Production-ready settings: environment-based configuration, security hardening, structured logging, and health check endpoint.

## Tech Stack
- Django 4.2.7, Django REST Framework 3.14, Simple JWT 5.3
- PostgreSQL 15, psycopg[binary]
- Redis 7, Celery 5.3
- django-cors-headers, django-extensions, python-dotenv

## Getting Started
1. **Create environment**
   ```powershell
   python -m venv venv
   .\venv\Scripts\activate
   pip install -r backend/requirements.txt
   ```
2. **Environment variables**: Copy `backend/.env` and adjust secrets, database credentials, and allowed hosts.
3. **Database**:
   ```powershell
   cd backend
   python manage.py makemigrations
   python manage.py migrate
   python manage.py createsuperuser
   ```
4. **Run services**:
   - Start PostgreSQL & Redis via Docker: `docker compose up -d`
   - Django dev server: `python manage.py runserver`
   - Celery worker (optional background jobs): `celery -A agri_connect worker -l info`

## API Highlights
- `POST /api/auth/token/` obtain JWT pair, `/api/auth/token/refresh/`, `/api/auth/token/verify/`.
- `POST /api/auth/register/` create new account, `GET /api/auth/me/` inspect profile, `POST /api/auth/password-change/` rotate password.
- `/api/farms/`, `/api/listings/`, `/api/inventory/`, `/api/notifications/`, `/api/analytics/metrics/`, `/api/analytics/summary/` expose CRUD + reporting endpoints.
- `GET /health/` for container orchestration probes.

## Testing & Tooling
- Run tests with `python manage.py test`.
- Use `python manage.py shell_plus` (django-extensions) for richer shells.
- Lint/format per your preferred tooling (e.g., `ruff`, `black`).

## Deployment Notes
- Set `DJANGO_DEBUG=False`, configure `DJANGO_ALLOWED_HOSTS`, and provide strong `DJANGO_SECRET_KEY`.
- Point `DATABASE_URL` vars to managed PostgreSQL, and `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` to production Redis.
- Collect static assets with `python manage.py collectstatic` before deployment.

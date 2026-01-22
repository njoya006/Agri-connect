AgriConnect — Local development

Quick start (backend)

- Copy `.env.example` to `.env` and adjust values.
- Start services (Postgres + Redis + web + celery):

```powershell
# from backend folder
docker compose up -d db redis
# start web server
docker compose up -d web
# start celery worker
docker compose up -d celery
```

If you prefer running tasks synchronously during development, set `CELERY_TASK_ALWAYS_EAGER=True` in `.env` and run only the web service.

Frontend tests (local)

```powershell
cd frontend
# Use install to refresh lockfile if package.json changed locally
npm install --legacy-peer-deps
npm test
```

CI

- Backend tests run in `.github/workflows/backend-tests.yml`.
- Frontend tests run in `.github/workflows/frontend-tests.yml`.

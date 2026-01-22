<<<<<<< HEAD
AgriConnect — Local development

Quick start (backend)

- Copy `.env.example` to `.env` and adjust values.
- Start services (Postgres + Redis + web + celery):

```powershell
# from backend folder
docker compose up -d db redis
# AgriConnect

This repository contains the AgriConnect platform: backend (Django + DRF), frontend (Next.js), infrastructure code (Terraform), and the project documentation.

---

## Local development (backend)

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

### Frontend tests (local)

```powershell
cd frontend
# Use install to refresh lockfile if package.json changed locally
npm install --legacy-peer-deps
npm test
```

### CI

- Backend tests run in `.github/workflows/backend-tests.yml`.
- Frontend tests run in `.github/workflows/frontend-tests.yml`.

---

## Documentation (LaTeX)

The `document/` folder contains the formal written report for AgriConnect produced with LaTeX.

### Structure
- `document/main.tex`: Root document that stitches together every section.
- `document/sections/`: Individual chapter files (`01-abstract.tex` .. `09-conclusion.tex`).
- `document/images/`: Architectural and design diagrams.
- `document/references.bib`: BibTeX database for citations.

### Getting started with the docs
1. Edit the section files inside `document/sections/`.
2. Place diagram assets inside `document/images/` and update LaTeX references.
3. Compile with your preferred LaTeX workflow (e.g., `pdflatex`, `biber`, then `pdflatex` twice).

---

If anything in this merged README looks wrong, tell me what to keep/remove and I'll update it.

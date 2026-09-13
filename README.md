# Smart Civic Complaint & Issue Management System

DPA Hackathon 2026 -- Case Study 1, Stage 2. See `implementation-plan.md` for
the full design (data model, prioritization formula, dashboard spec, 7-day
build schedule). This repo is the runnable scaffold for it.

## Stack
FastAPI + Motor (async MongoDB) backend, React + Vite frontend, Docker Compose.
Backend deps managed with [uv](https://docs.astral.sh/uv/) (`pyproject.toml` +
`uv.lock`) on an Alpine image; frontend also on Alpine. No pip, no `requirements.txt`.

## Quick start
```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
docker compose up --build
```
- API docs: http://localhost:8000/docs
- Frontend: http://localhost:5173
- Health check: http://localhost:8000/health

## What's already working
- `POST /auth/register`, `POST /auth/login` -- JWT issued, bcrypt-hashed passwords
- `POST /complaints`, `GET /complaints`, `GET /complaints/{id}`, `PATCH /complaints/{id}/status`, `POST /complaints/{id}/comments` -- full CRUD against MongoDB, complaint IDs auto-generated (`CMP-2026-0001`)
- Rule-based priority scoring runs on every submission (age + category + nearby-similar-complaint count) -- see `backend/app/services/priority.py`
- `GET /analytics/summary`, `GET /analytics/aging` -- basic aggregations
- One passing backend test (`backend/tests/test_health.py`)
- 2dsphere geo index + compound query index created automatically on startup

## What's a stub, to be built by the team
See `TASKS.md` for the full breakdown, owner assignment, and what depends on what. Short version: citizen submission form, admin dashboard UI, analytics hotspot/SLA endpoints, priority-weight tuning, and the NYC 311 seed script are all marked `TODO` in place.

## Team workflow
See `CONTRIBUTING.md`.

# Smart Civic Complaint & Issue Management System

DPA Hackathon 2026 -- Case Study 1, Stage 2. See `implementation-plan.md` for
the full design (data model, prioritization formula, dashboard spec, 7-day
build schedule). This repo is the runnable scaffold for it.

## Stack
FastAPI + Motor (async MongoDB) backend, React + Vite frontend, Docker Compose.
Backend deps managed with [uv](https://docs.astral.sh/uv/) (`pyproject.toml` +
`uv.lock`) on an Alpine image; frontend also on Alpine. No pip, no `requirements.txt`.

## How to run

### Option A: Docker Compose (recommended)
```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
docker compose up --build
```
- API docs: http://localhost:8000/docs
- Frontend: http://localhost:5173
- Health check: http://localhost:8000/health

First time only: since `bun.lock` was generated before `@tailwindcss/postcss` was added to `frontend/package.json`, the frontend container needs it refreshed once -- either let `docker compose up --build` regenerate it automatically (bun updates the lock on install when it's out of sync with `package.json`), or run `cd frontend && bun install` yourself first.

### Option B: run backend and frontend manually (no Docker)
You'll need a MongoDB instance reachable at the URI in `backend/.env` (`mongo_uri`, defaults to `mongodb://localhost:27017`) -- either install MongoDB locally or run just the `mongo` service from `docker-compose.yml` (`docker compose up mongo`).

```bash
# backend
cd backend
python -m venv .venv && source .venv/bin/activate   # or your preferred env tool
pip install -r requirements.txt
cp ../.env.example .env   # adjust mongo_uri if not using the default
uvicorn app.main:app --reload --port 8000
```
```bash
# frontend, in a second terminal
cd frontend
cp .env.example .env
npm install   # or: bun install
npm run dev   # or: bun run dev
```

## First-time setup: create the admin account
There is no seeded admin. The very first thing to do against a fresh database is create one -- from the frontend, visit http://localhost:5173/bootstrap-admin, or via the API directly:
```bash
curl -X POST http://localhost:8000/auth/bootstrap-admin \
  -H "Content-Type: application/json" \
  -d '{"name": "Admin", "email": "admin@city.gov", "password": "change-me-immediately"}'
```
This only ever succeeds once -- see the Auth & RBAC section below.

## Seed sample data
`scripts/seed_from_311.py` pulls from NYC's real 311 Service Request dataset (the one named in the case study PDF) and maps each record onto this project's schema using rule-based keyword matching (see `CATEGORY_KEYWORDS` in the script) -- the same "real logic, clearly labeled as rule-based, not a fake AI claim" approach as the backend's duplicate detection and auto-assignment.

```bash
cd backend && pip install -r requirements.txt   # needs `requests`, already listed
cd ..
python scripts/seed_from_311.py --limit 100          # live call to NYC Open Data
python scripts/seed_from_311.py --limit 500 --days 7 # only complaints from the last week
python scripts/seed_from_311.py --dry-run --limit 20 # fetch + map, don't write anything
```
No internet access, or want deterministic data for a demo/CI? Use the bundled fixture instead of the live API:
```bash
python scripts/seed_from_311.py --sample-file scripts/sample_311.json
```
The script reads Mongo connection info from `backend/.env` (via the backend's own `Settings` class), creates the 5 default departments if they don't already exist, creates one clearly-labeled `nyc311-import@seed.local` system account to own the imported complaints (NYC's dataset has no user accounts, so this avoids inventing fake citizens), and runs every complaint through the real priority-scoring and duplicate-detection logic -- not a separate copy of it.

## Verify auth/RBAC across all three roles
`scripts/verify_multi_user.py` exercises the full flow over real HTTP against a running backend: bootstraps an admin, registers a citizen and an officer, logs in as each, and walks through submit -> blocked-until-assigned -> auto-assign -> officer resolves -> citizen sees the audit trail -> admin-only analytics -- printing PASS/FAIL per step.
```bash
# with the backend already running (Docker Compose or manual, from above)
python scripts/verify_multi_user.py --base-url http://localhost:8000
```
Safe to re-run -- emails are timestamped so accounts don't collide. If an admin already exists (i.e. this isn't the first run), it'll prompt for existing admin credentials to continue the admin-only checks, or you can just hit enter to skip those and still verify the citizen/officer flow.

## What's already working
### Auth & RBAC
- `POST /auth/register` -- citizen or officer self-registration (JWT issued, bcrypt-hashed passwords). Officers must supply `department`.
- `POST /auth/bootstrap-admin` -- creates the *one* admin account; permanently 403s once an admin exists. There is no public route that mints additional admins or lets someone self-register as admin (the original scaffold allowed `role: "admin"` at `/auth/register` -- closed that hole).
- `POST /auth/login`, `GET /auth/me`
- Three roles, enforced via `Depends(require_role(...))` on every route (`app/core/deps.py`): **citizen** (owns/submits complaints), **officer** (scoped to their own `department`), **admin** (everything)

### Complaints
- `POST /complaints` (citizen) -- submission auto-attaches the authenticated citizen's id
- `GET /complaints/mine` (citizen) -- personal complaint history
- `GET /complaints` (admin: full queue with filters; officer: auto-scoped to their own department's queue)
- `GET /complaints/{id}`, `GET /complaints/{id}/track` -- visible to the owning citizen, the assigned officer, or admin
- `PATCH /complaints/{id}/status` -- assigned officer or admin
- `PATCH /complaints/{id}/assign` (admin) -- assign/reassign to a department; **omit the body to auto-assign** via the category->department mapping in `app/routers/departments.py`; auto-advances `New -> Assigned`
- `POST /complaints/{id}/comments` -- owning citizen, assigned officer, or admin
- `DELETE /complaints/{id}` (admin)
- Rule-based priority scoring on every submission (age + category + nearby-similar-complaint count) -- `backend/app/services/priority.py`
- Rule-based duplicate detection (`is_duplicate`, `duplicate_group_id`) -- same category + within 200m + submitted in the last 14 days
- Full audit-trail `history` on every complaint (created / assigned / status changes / comments)

### Departments
- `GET /departments` (public) -- for populating a submission-form dropdown
- `POST /departments`, `PATCH /departments/{id}` (admin)
- Five departments auto-seeded on startup, one per complaint category (Roads, Sanitation, Electrical, Water Board, General Services)

### Analytics (admin-only)
- `GET /analytics/summary` -- by_status, by_category, by_priority, plus total/unresolved/duplicate/unassigned counts
- `GET /analytics/aging` -- unresolved complaints past an SLA cutoff
- `GET /analytics/hotspots` -- unresolved complaints clustered into coarse location buckets, ranked by total priority score (answers the case study's "high-priority locations")
- `GET /analytics/sla` -- SLA compliance %, average resolution time, complaints currently breaching SLA (answers "SLA performance")

### Infra
- Two backend test files: `backend/tests/test_health.py` (1 test) and `backend/tests/test_flow.py` (3 tests -- the full RBAC/assignment/history flow against an in-memory Mongo via `mongomock-motor`). Run with `cd backend && pytest`.
- 2dsphere geo index, compound query index, and `assigned_to`/`citizen_id` indexes created automatically on startup
- `bcrypt==4.0.1` pinned in `requirements.txt` -- newer bcrypt releases break `passlib`'s bundled backend detection
- `scripts/seed_from_311.py` + `scripts/sample_311.json` -- NYC 311 data import (see "Seed sample data" above)
- `scripts/verify_multi_user.py` -- end-to-end auth/RBAC verification over real HTTP (see "Verify auth/RBAC" above)

Assignment, RBAC, departments, audit history, and the richer analytics shape were adapted from a reference project (ResolveAI) that modeled multi-role auth, department assignment, and an audit-trail `/track` endpoint -- reimplemented here against this project's own schema with real rule-based logic (category auto-routing, duplicate detection), since that reference project's own AI/ML modules were unimplemented placeholders. Not ported: ResolveAI's separate department/admin account-management endpoints (password reset, admin replace, user deletion) -- out of scope for this case study.

## What's a stub, to be built by the team
See `TASKS.md` for the full breakdown. Short version: priority-weight tuning and the bonus AI (auto-classify/summarize/extract from free-text complaints) are still `TODO`. The citizen submission form, officer queue, admin dashboard/complaints/departments/analytics UI, and the NYC 311 seed script are now built -- see "How to run" / "Seed sample data" above and the Frontend section below.

## Frontend
React + Vite + Tailwind v4 (previously listed as a dependency but never wired up -- `postcss.config.js` and `src/index.css` didn't exist; both added). Full auth flow (register/login/bootstrap-admin) and role-scoped pages for citizen / officer / admin, all built against the backend endpoints above.

Page structure and several UX patterns (role-scoped nav, dashboard stat cards, expandable complaint rows with inline status update, a track/history view, admin reassign+delete, department management, analytics charts) were ported from ResolveAI's Streamlit app (`frontend/streamlit_app.py`) and reimplemented as React components wired to this project's own endpoints and schema. Notably NOT ported: ResolveAI's per-role login endpoints (its UI called `/admin/login`, `/department/login`, `/users/login` separately) -- this backend has a single `/auth/login` that returns a role-bearing token, so the frontend has one login form, not three.

Since `bun.lock` was generated before `@tailwindcss/postcss` was added to `package.json`, run `bun install` once (or `npm install`) to refresh it before `docker compose up --build`.

## Team workflow
See `CONTRIBUTING.md`.

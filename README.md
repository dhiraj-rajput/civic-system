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
- One passing backend test (`backend/tests/test_health.py`); a broader RBAC/flow smoke test was run manually against an in-memory Mongo during development (not checked in -- worth adding as `tests/test_flow.py` if you want it in CI)
- 2dsphere geo index, compound query index, and `assigned_to`/`citizen_id` indexes created automatically on startup
- `bcrypt==4.0.1` pinned in `requirements.txt` -- newer bcrypt releases break `passlib`'s bundled backend detection

Assignment, RBAC, departments, audit history, and the richer analytics shape were adapted from a reference project (ResolveAI) that modeled multi-role auth, department assignment, and an audit-trail `/track` endpoint -- reimplemented here against this project's own schema with real rule-based logic (category auto-routing, duplicate detection), since that reference project's own AI/ML modules were unimplemented placeholders. Not ported: ResolveAI's separate department/admin account-management endpoints (password reset, admin replace, user deletion) -- out of scope for this case study.

## What's a stub, to be built by the team
See `TASKS.md` for the full breakdown. Short version: priority-weight tuning, the NYC 311 seed script, and the bonus AI (auto-classify/summarize/extract from free-text complaints) are still `TODO`. The citizen submission form, officer queue, and admin dashboard/complaints/departments/analytics UI are now built (`frontend/src/pages/`) -- see the Frontend section below.

## Frontend
React + Vite + Tailwind v4 (previously listed as a dependency but never wired up -- `postcss.config.js` and `src/index.css` didn't exist; both added). Full auth flow (register/login/bootstrap-admin) and role-scoped pages for citizen / officer / admin, all built against the backend endpoints above.

Page structure and several UX patterns (role-scoped nav, dashboard stat cards, expandable complaint rows with inline status update, a track/history view, admin reassign+delete, department management, analytics charts) were ported from ResolveAI's Streamlit app (`frontend/streamlit_app.py`) and reimplemented as React components wired to this project's own endpoints and schema. Notably NOT ported: ResolveAI's per-role login endpoints (its UI called `/admin/login`, `/department/login`, `/users/login` separately) -- this backend has a single `/auth/login` that returns a role-bearing token, so the frontend has one login form, not three.

Since `bun.lock` was generated before `@tailwindcss/postcss` was added to `package.json`, run `bun install` once (or `npm install`) to refresh it before `docker compose up --build`.

## Team workflow
See `CONTRIBUTING.md`.

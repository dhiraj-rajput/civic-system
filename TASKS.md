# Task board & dependency graph

Goal: maximize the number of people who can branch off `main` on day 1 with
zero merge conflicts, and make every blocking dependency explicit so nobody
finds out they're blocked by opening a PR that fails to merge.

The scaffold in this repo already contains a runnable skeleton for every
track below -- `docker compose up` works today. Each track is "flesh out the
TODOs in these specific files", not "create files from scratch", which is
what keeps tracks from colliding on the same file.

## Wave 0 -- already done in this scaffold (nothing to assign)
DB connection, schemas, empty routers wired into `main.py`, Docker Compose,
health check, one passing test. This is the shared contract everyone builds
against. Read it before picking up a task.

## Wave 1 -- start immediately, fully parallel, no dependencies
| Track | Owns | Task |
|---|---|---|
| **auth** | `backend/app/routers/auth.py` | Add `get_current_user` dependency (decode JWT, fetch user), protect routes that need a real user instead of the `citizen_id="anonymous"` default param |
| **citizen-ui** | `frontend/src/pages/citizen/` | Build the submission form (category, description, location picker, address) against `POST /complaints` -- the endpoint already works, returns real data |
| **admin-ui** | `frontend/src/pages/admin/` | Build the queue table + status-change buttons against `GET /complaints` and `PATCH /complaints/{id}/status` -- both already work |
| **data-etl** | `scripts/seed_from_311.py` | Fill in the NYC 311 fetch + mapping + bulk insert. Only needs the schema in `backend/app/schemas/complaint.py`, doesn't touch any router |
| **devops** | `docker-compose.yml`, `.env.example` | Add a `.dockerignore`, tighten healthchecks, prep a Railway/Render deploy config for the demo fallback link |

## Wave 2 -- depends on Wave 1 (specifically: auth merged)
| Track | Owns | Depends on |
|---|---|---|
| **rbac-hardening** | `backend/app/routers/complaints.py` | `auth` track's `get_current_user` -- swap the `citizen_id`/`author_id` query params for the real authenticated user |

## Wave 3 -- depends on complaints data existing (seed script run, or a few
manual complaints submitted through the citizen UI)
| Track | Owns | Depends on |
|---|---|---|
| **priority-engine** | `backend/app/services/priority.py` | Needs real complaints in Mongo to tune weights against -- the formula skeleton already runs, this is about validating/adjusting `W_AGE`/`W_CATEGORY`/`W_CLUSTER` and the category weight table |
| **analytics** | `backend/app/routers/analytics.py` | Needs complaints data to test aggregations against; add the hotspot/SLA endpoints described in `implementation-plan.md` |
| **admin-ui-charts** | `frontend/src/pages/admin/` | Needs `analytics` endpoints returning real shapes before wiring up charts |

## How to avoid blocking each other in practice
1. Everyone branches off `main`, never off another open feature branch, unless the PR description says "depends on #X".
2. Stick to your track's owned paths (`.github/CODEOWNERS` maps these). Touching a file outside your track is the #1 cause of merge conflicts here -- if you need to, say so in the PR and ping the owner first.
3. A PR that depends on another PR gets labeled `blocked` and stays in draft until the dependency merges -- don't leave it open-but-invisible.
4. `main` should always run `docker compose up` cleanly. If your change breaks it, it doesn't merge, regardless of whose track it's on.

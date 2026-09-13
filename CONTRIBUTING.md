# Contributing

## One-time setup
```bash
git clone <your-repo-url>
cd civic-complaint-system
cp .env.example .env
cp frontend/.env.example frontend/.env
docker compose up --build
```
- Backend: http://localhost:8000/docs (FastAPI's auto-generated Swagger UI)
- Frontend: http://localhost:5173
- Mongo: localhost:27017 (use MongoDB Compass or `mongosh` to inspect data)

Both `backend/` and `frontend/` are bind-mounted into their containers, so
editing files locally hot-reloads inside Docker -- no rebuild needed for
normal code changes (only `docker compose up --build` again if you change
`backend/pyproject.toml` or `frontend/package.json`).

The backend uses [uv](https://docs.astral.sh/uv/) instead of pip. To add a
dependency: `cd backend && uv add <package>` (or `uv add --group dev <package>`
for a dev-only dependency) -- this updates `pyproject.toml` and `uv.lock`
together, commit both.

## Branching
- Branch off `main`: `git checkout -b <track>/<short-description>`, e.g. `citizen-ui/submission-form`.
- One track per branch. If your change spans two tracks, split it into two PRs.
- Before opening a PR, check `TASKS.md` for whether your track depends on another -- if it does and that PR hasn't merged yet, branch off that PR's branch instead of `main`, and say so in your PR description.

## Before opening a PR
- Backend: `cd backend && uv run pytest` must pass.
- Frontend: `cd frontend && npm run build` must succeed.
- `docker compose up` from the repo root must still boot cleanly end to end.
- Fill out `.github/PULL_REQUEST_TEMPLATE.md` fully, especially the "Depends on" field -- this is what keeps parallel PRs from silently conflicting.

## Code layout (why it's split this way)
```
backend/app/
  core/       # db connection, settings, security -- shared, changes here affect everyone, keep them rare
  schemas/    # the request/response contract -- change here = coordinate with whoever's dependent on it
  routers/    # one file per domain (auth / complaints / analytics) -- your track owns exactly one
  services/   # business logic that isn't HTTP-shaped (priority scoring) -- testable in isolation
frontend/src/
  pages/citizen/   # citizen-facing screens
  pages/admin/     # admin-facing screens
  api/client.js    # the one place that knows the backend URL -- don't hardcode fetch() elsewhere
```
Routers only orchestrate; scoring/business logic lives in `services/` so it can be unit-tested without spinning up Mongo. Keep new work inside your track's folder -- see `TASKS.md` for the assignment and `.github/CODEOWNERS` for enforcement.

## Commit messages
`<track>: <what changed>` -- e.g. `complaints: add duplicate-detection flag on create`.

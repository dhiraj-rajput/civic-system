"""End-to-end RBAC/flow test against an in-memory Mongo (mongomock-motor).

Covers: admin bootstrap lockdown, role-restricted registration, citizen
submission, officer/admin visibility scoping, category auto-assignment,
status transitions + audit history, and admin-only analytics/delete.

$near (used by the priority/duplicate-detection geo queries) isn't
implemented by mongomock, so those two functions are stubbed here -- this
test is about the auth/RBAC/assignment/history wiring, not the geo math
(which needs a real MongoDB with the 2dsphere index main.py creates).
"""
import pytest
from httpx import ASGITransport, AsyncClient
from mongomock_motor import AsyncMongoMockClient

import app.core.database as database_module
import app.routers.complaints as complaints_module
from app.main import app


@pytest.fixture
async def client():
    mock_db = AsyncMongoMockClient()["civic_test"]
    database_module.db = mock_db
    database_module.get_db = lambda: mock_db

    async def fake_score(db, doc):
        return 42.0, "Medium"

    async def fake_duplicate(db, doc):
        return False, None

    # complaints.py did `from app.services.priority import ...`, so the name
    # is bound in its own module namespace -- patch it there, not on
    # app.services.priority itself, or the route won't see the stub.
    complaints_module.score_complaint = fake_score
    complaints_module.detect_duplicate = fake_duplicate

    async with app.router.lifespan_context(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            yield c


@pytest.mark.anyio
async def test_admin_bootstrap_is_single_use(client):
    r = await client.post(
        "/auth/bootstrap-admin",
        json={"name": "Admin", "email": "admin@city.gov", "password": "adminpass"},
    )
    assert r.status_code == 200

    r = await client.post(
        "/auth/bootstrap-admin",
        json={"name": "Admin2", "email": "admin2@city.gov", "password": "x"},
    )
    assert r.status_code == 403


@pytest.mark.anyio
async def test_cannot_self_register_as_admin(client):
    r = await client.post(
        "/auth/register",
        json={"name": "Hacker", "email": "h@x.com", "password": "x", "role": "admin"},
    )
    assert r.status_code == 422


@pytest.mark.anyio
async def test_full_complaint_lifecycle(client):
    # admin
    r = await client.post(
        "/auth/bootstrap-admin",
        json={"name": "Admin", "email": "admin@city.gov", "password": "adminpass"},
    )
    admin_token = r.json()["access_token"]
    admin_h = {"Authorization": f"Bearer {admin_token}"}

    # citizen
    r = await client.post(
        "/auth/register",
        json={"name": "Priya", "email": "priya@example.com", "password": "pass123"},
    )
    citizen_h = {"Authorization": f"Bearer {r.json()['access_token']}"}

    # officer
    r = await client.post(
        "/auth/register",
        json={
            "name": "Officer Rao",
            "email": "rao@city.gov",
            "password": "pass123",
            "role": "officer",
            "department": "Roads & Public Works",
        },
    )
    officer_h = {"Authorization": f"Bearer {r.json()['access_token']}"}

    # citizen submits
    r = await client.post(
        "/complaints",
        headers=citizen_h,
        json={
            "category": "pothole",
            "description": "Big pothole near Gate 3",
            "location": {"lat": 18.55, "lng": 73.8},
        },
    )
    assert r.status_code == 201
    cid = r.json()["id"]

    # citizen sees it via /mine, cannot list all
    r = await client.get("/complaints/mine", headers=citizen_h)
    assert r.status_code == 200 and len(r.json()) == 1
    r = await client.get("/complaints", headers=citizen_h)
    assert r.status_code == 403

    # officer can't see it until assigned
    r = await client.get(f"/complaints/{cid}", headers=officer_h)
    assert r.status_code == 403

    # admin auto-assigns by category
    r = await client.patch(f"/complaints/{cid}/assign", headers=admin_h, json={})
    assert r.status_code == 200
    assert r.json()["assigned_to"] == "Roads & Public Works"
    assert r.json()["status"] == "Assigned"

    # officer can now manage it
    r = await client.get(f"/complaints/{cid}", headers=officer_h)
    assert r.status_code == 200
    r = await client.patch(f"/complaints/{cid}/status", headers=officer_h, json={"status": "In Progress"})
    assert r.status_code == 200
    r = await client.patch(f"/complaints/{cid}/status", headers=officer_h, json={"status": "Resolved"})
    assert r.status_code == 200
    assert r.json()["resolved_at"] is not None

    # audit trail
    r = await client.get(f"/complaints/{cid}/track", headers=citizen_h)
    assert r.status_code == 200
    events = [h["event"] for h in r.json()["history"]]
    assert events == ["created", "assigned", "status_changed", "status_changed"]

    # departments seeded
    r = await client.get("/departments")
    assert r.status_code == 200 and len(r.json()) == 5

    # analytics admin-only
    r = await client.get("/analytics/summary", headers=admin_h)
    assert r.status_code == 200
    r = await client.get("/analytics/summary", headers=citizen_h)
    assert r.status_code == 403

    # admin delete
    r = await client.delete(f"/complaints/{cid}", headers=admin_h)
    assert r.status_code == 204


@pytest.fixture
def anyio_backend():
    return "asyncio"

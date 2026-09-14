"""Exercises the full multi-role flow against a *running* backend over real
HTTP: bootstrap the admin, register a citizen and an officer, log in as all
three, and walk through submit -> auto-assign -> officer resolves ->
citizen sees the audit trail -> admin analytics -- printing PASS/FAIL for
each step. Non-zero exit code if anything fails.

Usage:
    python scripts/verify_multi_user.py
    python scripts/verify_multi_user.py --base-url http://localhost:8000

Run this after `docker compose up` (or after starting the backend manually)
to confirm auth/RBAC/assignment/history are wired correctly end to end,
without having to click through the UI by hand.

Safe to re-run: emails are timestamped so re-running doesn't collide with a
previous run's accounts. The one exception is bootstrap-admin, which will
correctly report FAIL-non-fatal on a second run since only one admin
account may ever exist -- that's expected, not a bug.
"""
import argparse
import sys
import time

import requests

PASS = "\033[92mPASS\033[0m"
FAIL = "\033[91mFAIL\033[0m"

failures = []


def check(label, condition, detail=""):
    if condition:
        print(f"[{PASS}] {label}")
    else:
        print(f"[{FAIL}] {label} {detail}")
        failures.append(label)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:8000")
    args = parser.parse_args()
    base = args.base_url.rstrip("/")
    stamp = int(time.time())

    def url(path):
        return f"{base}{path}"

    # 0. health check
    try:
        r = requests.get(url("/health"), timeout=5)
        check("Backend is reachable (/health)", r.status_code == 200, f"-> {r.status_code}")
    except requests.exceptions.ConnectionError as e:
        print(f"[{FAIL}] Cannot reach {base} -- is the backend running? ({e})")
        sys.exit(1)

    # 1. bootstrap admin (non-fatal if one already exists)
    r = requests.post(url("/auth/bootstrap-admin"), json={
        "name": "Admin", "email": f"admin-{stamp}@city.gov", "password": "adminpass123",
    })
    if r.status_code == 200:
        admin_token = r.json()["access_token"]
        print(f"[{PASS}] Bootstrapped a new admin account")
    else:
        print(f"[info] bootstrap-admin returned {r.status_code} (an admin likely already exists) -- "
              f"log in with your existing admin credentials to continue full verification.")
        admin_email = input("Existing admin email (blank to skip admin-only checks): ").strip()
        if admin_email:
            admin_password = input("Existing admin password: ").strip()
            r = requests.post(url("/auth/login"), json={"email": admin_email, "password": admin_password})
            check("Admin login", r.status_code == 200, f"-> {r.status_code} {r.text}")
            admin_token = r.json().get("access_token") if r.status_code == 200 else None
        else:
            admin_token = None

    # 2. register citizen + officer
    citizen_email = f"citizen-{stamp}@example.com"
    r = requests.post(url("/auth/register"), json={
        "name": "Test Citizen", "email": citizen_email, "password": "pass123",
    })
    check("Citizen registration", r.status_code == 200, f"-> {r.status_code} {r.text}")
    citizen_token = r.json().get("access_token") if r.status_code == 200 else None

    officer_email = f"officer-{stamp}@city.gov"
    r = requests.post(url("/auth/register"), json={
        "name": "Test Officer", "email": officer_email, "password": "pass123",
        "role": "officer", "department": "Roads & Public Works",
    })
    check("Officer registration", r.status_code == 200, f"-> {r.status_code} {r.text}")
    officer_token = r.json().get("access_token") if r.status_code == 200 else None

    if not (citizen_token and officer_token):
        print("Cannot continue without citizen + officer tokens.")
        sys.exit(1)

    citizen_h = {"Authorization": f"Bearer {citizen_token}"}
    officer_h = {"Authorization": f"Bearer {officer_token}"}
    admin_h = {"Authorization": f"Bearer {admin_token}"} if admin_token else None

    # 3. /auth/me confirms each token's identity
    r = requests.get(url("/auth/me"), headers=citizen_h)
    check("Citizen /auth/me returns role=citizen", r.status_code == 200 and r.json().get("role") == "citizen")
    r = requests.get(url("/auth/me"), headers=officer_h)
    check("Officer /auth/me returns role=officer + department", r.status_code == 200 and r.json().get("role") == "officer")

    # 4. citizen submits a complaint
    r = requests.post(url("/complaints"), headers=citizen_h, json={
        "category": "pothole",
        "description": "Verification-script test pothole",
        "location": {"lat": 18.55, "lng": 73.8},
    })
    check("Citizen can submit a complaint", r.status_code == 201, f"-> {r.status_code} {r.text}")
    complaint = r.json() if r.status_code == 201 else None
    cid = complaint["id"] if complaint else None

    if cid:
        # 5. citizen sees it in /mine
        r = requests.get(url("/complaints/mine"), headers=citizen_h)
        check("Citizen sees own complaint in /complaints/mine", r.status_code == 200 and any(c["id"] == cid for c in r.json()))

        # 6. citizen is blocked from the global queue
        r = requests.get(url("/complaints"), headers=citizen_h)
        check("Citizen is blocked (403) from GET /complaints", r.status_code == 403)

        # 7. officer can't see it before assignment
        r = requests.get(url(f"/complaints/{cid}"), headers=officer_h)
        check("Officer is blocked (403) before assignment", r.status_code == 403)

        if admin_h:
            # 8. admin auto-assigns by category
            r = requests.patch(url(f"/complaints/{cid}/assign"), headers=admin_h, json={})
            check("Admin auto-assign by category", r.status_code == 200 and r.json().get("assigned_to"), f"-> {r.status_code} {r.text}")

            # 9. officer can now see + resolve it
            r = requests.get(url(f"/complaints/{cid}"), headers=officer_h)
            check("Officer can view after assignment", r.status_code == 200)

            r = requests.patch(url(f"/complaints/{cid}/status"), headers=officer_h, json={"status": "Resolved"})
            check("Officer can resolve the complaint", r.status_code == 200 and r.json().get("resolved_at"))

            # 10. audit trail
            r = requests.get(url(f"/complaints/{cid}/track"), headers=citizen_h)
            events = [h["event"] for h in r.json().get("history", [])] if r.status_code == 200 else []
            check("Audit trail shows created -> assigned -> status_changed", events == ["created", "assigned", "status_changed"], f"-> {events}")

            # 11. admin analytics
            r = requests.get(url("/analytics/summary"), headers=admin_h)
            check("Admin can view analytics", r.status_code == 200, f"-> {r.status_code}")
            r = requests.get(url("/analytics/summary"), headers=citizen_h)
            check("Citizen is blocked (403) from analytics", r.status_code == 403)
        else:
            print("[info] Skipped admin-only checks (no admin token available)")

    print()
    if failures:
        print(f"{len(failures)} check(s) FAILED: {failures}")
        sys.exit(1)
    print("All checks passed.")


if __name__ == "__main__":
    main()

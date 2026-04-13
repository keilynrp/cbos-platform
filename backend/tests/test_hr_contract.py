"""
HR module contract tests.

Covers:
- Auth guards for all endpoints
- Workspace isolation
- Department lifecycle: create, list, update, delete
- Employee lifecycle: create, read, list, update, delete
- Status machine: valid and invalid transitions
- Filters: by status, by department
- Delete guard: terminated employees cannot be deleted
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

EMP_BASE  = "/api/v1/employees"
DEPT_BASE = "/api/v1/departments"
AUTH_BASE = "/api/v1/auth"


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _create_employee(client: AsyncClient, headers: dict, **overrides) -> dict:
    payload = {
        "full_name": "Ana Torres",
        "email": "ana.torres@example.com",
        "position": "Software Engineer",
        "employment_type": "full_time",
        **overrides,
    }
    resp = await client.post(EMP_BASE, headers=headers, json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _create_department(client: AsyncClient, headers: dict, **overrides) -> dict:
    payload = {"name": "Engineering", **overrides}
    resp = await client.post(DEPT_BASE, headers=headers, json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _get_second_auth_headers(client: AsyncClient) -> dict:
    resp = await client.post(f"{AUTH_BASE}/register", json={
        "full_name": "HR WS2",
        "email": "hr_ws2@test.com",
        "password": "Password123!",
        "workspace_name": "HR Workspace Two",
        "workspace_slug": "hr-workspace-two",
    })
    assert resp.status_code in (200, 201), resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


# ── Auth guards ───────────────────────────────────────────────────────────────

async def test_list_employees_requires_auth(client: AsyncClient):
    resp = await client.get(EMP_BASE)
    assert resp.status_code == 401


async def test_get_employee_requires_auth(client: AsyncClient):
    resp = await client.get(f"{EMP_BASE}/any-id")
    assert resp.status_code == 401


async def test_create_employee_requires_auth(client: AsyncClient):
    resp = await client.post(EMP_BASE, json={"full_name": "Test"})
    assert resp.status_code == 401


async def test_update_employee_requires_auth(client: AsyncClient):
    resp = await client.patch(f"{EMP_BASE}/any-id", json={"position": "CTO"})
    assert resp.status_code == 401


async def test_delete_employee_requires_auth(client: AsyncClient):
    resp = await client.delete(f"{EMP_BASE}/any-id")
    assert resp.status_code == 401


async def test_list_departments_requires_auth(client: AsyncClient):
    resp = await client.get(DEPT_BASE)
    assert resp.status_code == 401


# ── Department CRUD ───────────────────────────────────────────────────────────

async def test_create_department_returns_201(client: AsyncClient, auth_headers: dict):
    dept = await _create_department(client, auth_headers, description="Core engineering team")
    assert "id" in dept
    assert dept["name"] == "Engineering"
    assert dept["description"] == "Core engineering team"


async def test_create_department_requires_name(client: AsyncClient, auth_headers: dict):
    resp = await client.post(DEPT_BASE, headers=auth_headers, json={"description": "No name"})
    assert resp.status_code == 422


async def test_list_departments_returns_created(client: AsyncClient, auth_headers: dict):
    dept = await _create_department(client, auth_headers)
    resp = await client.get(DEPT_BASE, headers=auth_headers)
    assert resp.status_code == 200
    names = [d["name"] for d in resp.json()]
    assert dept["name"] in names


async def test_update_department_name(client: AsyncClient, auth_headers: dict):
    dept = await _create_department(client, auth_headers)
    resp = await client.patch(
        f"{DEPT_BASE}/{dept['id']}", headers=auth_headers, json={"name": "Platform Engineering"}
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Platform Engineering"


async def test_delete_department(client: AsyncClient, auth_headers: dict):
    dept = await _create_department(client, auth_headers, name="To Delete")
    resp = await client.delete(f"{DEPT_BASE}/{dept['id']}", headers=auth_headers)
    assert resp.status_code == 204


# ── Employee Create ───────────────────────────────────────────────────────────

async def test_create_employee_returns_201(client: AsyncClient, auth_headers: dict):
    emp = await _create_employee(client, auth_headers)
    assert "id" in emp
    assert emp["employee_number"].startswith("EMP-")
    assert emp["status"] == "active"
    assert emp["full_name"] == "Ana Torres"
    assert emp["employment_type"] == "full_time"


async def test_create_employee_without_optional_fields(client: AsyncClient, auth_headers: dict):
    resp = await client.post(EMP_BASE, headers=auth_headers, json={"full_name": "Minimal Employee"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["position"] is None
    assert data["department_id"] is None
    assert data["salary"] is None


async def test_create_employee_requires_full_name(client: AsyncClient, auth_headers: dict):
    resp = await client.post(EMP_BASE, headers=auth_headers, json={"position": "Engineer"})
    assert resp.status_code == 422


async def test_create_employee_with_department(client: AsyncClient, auth_headers: dict):
    dept = await _create_department(client, auth_headers)
    emp = await _create_employee(client, auth_headers, department_id=dept["id"])
    assert emp["department_id"] == dept["id"]


async def test_employee_number_is_sequential(client: AsyncClient, auth_headers: dict):
    emp1 = await _create_employee(client, auth_headers, full_name="First Employee")
    emp2 = await _create_employee(client, auth_headers, full_name="Second Employee")
    # Both should have EMP-YYYY-XXXX format; second number > first
    n1 = int(emp1["employee_number"].split("-")[-1])
    n2 = int(emp2["employee_number"].split("-")[-1])
    assert n2 == n1 + 1


# ── Employee Read ─────────────────────────────────────────────────────────────

async def test_get_employee_by_id(client: AsyncClient, auth_headers: dict):
    emp = await _create_employee(client, auth_headers)
    resp = await client.get(f"{EMP_BASE}/{emp['id']}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == emp["id"]


async def test_get_employee_not_found(client: AsyncClient, auth_headers: dict):
    resp = await client.get(f"{EMP_BASE}/nonexistent-id", headers=auth_headers)
    assert resp.status_code == 404


async def test_list_employees_returns_created(client: AsyncClient, auth_headers: dict):
    emp = await _create_employee(client, auth_headers)
    resp = await client.get(EMP_BASE, headers=auth_headers)
    assert resp.status_code == 200
    ids = [e["id"] for e in resp.json()]
    assert emp["id"] in ids


async def test_list_employees_filter_by_status(client: AsyncClient, auth_headers: dict):
    emp = await _create_employee(client, auth_headers)
    resp = await client.get(f"{EMP_BASE}?status=active", headers=auth_headers)
    assert resp.status_code == 200
    assert all(e["status"] == "active" for e in resp.json())

    resp2 = await client.get(f"{EMP_BASE}?status=terminated", headers=auth_headers)
    ids = [e["id"] for e in resp2.json()]
    assert emp["id"] not in ids


async def test_list_employees_filter_by_department(client: AsyncClient, auth_headers: dict):
    dept = await _create_department(client, auth_headers)
    emp = await _create_employee(client, auth_headers, department_id=dept["id"])
    resp = await client.get(f"{EMP_BASE}?department_id={dept['id']}", headers=auth_headers)
    assert resp.status_code == 200
    ids = [e["id"] for e in resp.json()]
    assert emp["id"] in ids


# ── Employee Update ───────────────────────────────────────────────────────────

async def test_update_employee_position(client: AsyncClient, auth_headers: dict):
    emp = await _create_employee(client, auth_headers)
    resp = await client.patch(
        f"{EMP_BASE}/{emp['id']}", headers=auth_headers, json={"position": "Senior Engineer"}
    )
    assert resp.status_code == 200
    assert resp.json()["position"] == "Senior Engineer"


# ── Delete guard ──────────────────────────────────────────────────────────────

async def test_delete_active_employee(client: AsyncClient, auth_headers: dict):
    emp = await _create_employee(client, auth_headers)
    resp = await client.delete(f"{EMP_BASE}/{emp['id']}", headers=auth_headers)
    assert resp.status_code == 204


async def test_delete_terminated_employee_rejected(client: AsyncClient, auth_headers: dict):
    emp = await _create_employee(client, auth_headers)
    await client.patch(f"{EMP_BASE}/{emp['id']}", headers=auth_headers, json={"status": "terminated"})
    resp = await client.delete(f"{EMP_BASE}/{emp['id']}", headers=auth_headers)
    assert resp.status_code == 409


# ── State machine ─────────────────────────────────────────────────────────────

async def test_valid_transition_active_to_on_leave(client: AsyncClient, auth_headers: dict):
    emp = await _create_employee(client, auth_headers)
    resp = await client.patch(
        f"{EMP_BASE}/{emp['id']}", headers=auth_headers, json={"status": "on_leave"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "on_leave"
    assert data["on_leave_since"] is not None


async def test_valid_transition_on_leave_to_active(client: AsyncClient, auth_headers: dict):
    emp = await _create_employee(client, auth_headers)
    await client.patch(f"{EMP_BASE}/{emp['id']}", headers=auth_headers, json={"status": "on_leave"})
    resp = await client.patch(
        f"{EMP_BASE}/{emp['id']}", headers=auth_headers, json={"status": "active"}
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "active"


async def test_valid_transition_active_to_terminated(client: AsyncClient, auth_headers: dict):
    emp = await _create_employee(client, auth_headers)
    resp = await client.patch(
        f"{EMP_BASE}/{emp['id']}", headers=auth_headers, json={"status": "terminated"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "terminated"
    assert data["terminated_at"] is not None


async def test_invalid_transition_from_terminal(client: AsyncClient, auth_headers: dict):
    emp = await _create_employee(client, auth_headers)
    await client.patch(f"{EMP_BASE}/{emp['id']}", headers=auth_headers, json={"status": "terminated"})
    resp = await client.patch(
        f"{EMP_BASE}/{emp['id']}", headers=auth_headers, json={"status": "active"}
    )
    assert resp.status_code == 422


# ── Workspace isolation ───────────────────────────────────────────────────────

async def test_employee_not_visible_across_workspaces(client: AsyncClient, auth_headers: dict):
    ws2 = await _get_second_auth_headers(client)
    emp = await _create_employee(client, auth_headers)

    resp = await client.get(EMP_BASE, headers=ws2)
    ids = [e["id"] for e in resp.json()]
    assert emp["id"] not in ids


async def test_employee_not_accessible_by_other_workspace(client: AsyncClient, auth_headers: dict):
    ws2 = await _get_second_auth_headers(client)
    emp = await _create_employee(client, auth_headers)

    resp = await client.get(f"{EMP_BASE}/{emp['id']}", headers=ws2)
    assert resp.status_code == 404

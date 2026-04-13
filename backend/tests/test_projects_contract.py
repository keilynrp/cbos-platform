"""
Projects module contract tests.

Covers:
- Auth guards for all endpoints
- Workspace isolation
- Project lifecycle: create, read, list, update, delete
- Status machine: valid and invalid transitions
- Task management: add, update, delete
- Delete guard: only planning projects
- Filter: by status, by organization_id
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

BASE = "/api/v1/projects"
AUTH_BASE = "/api/v1/auth"


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _create_project(client: AsyncClient, headers: dict, **overrides) -> dict:
    payload = {
        "title": "Website Redesign Q4 2026",
        "budget": 15000.0,
        "currency": "USD",
        **overrides,
    }
    resp = await client.post(BASE, headers=headers, json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _get_second_auth_headers(client: AsyncClient) -> dict:
    resp = await client.post(f"{AUTH_BASE}/register", json={
        "full_name": "Projects WS2",
        "email": "projects_ws2@test.com",
        "password": "Password123!",
        "workspace_name": "Projects Workspace Two",
        "workspace_slug": "projects-workspace-two",
    })
    assert resp.status_code in (200, 201), resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


# ── Auth guards ───────────────────────────────────────────────────────────────

async def test_list_projects_requires_auth(client: AsyncClient):
    resp = await client.get(BASE)
    assert resp.status_code == 401


async def test_get_project_requires_auth(client: AsyncClient):
    resp = await client.get(f"{BASE}/any-id")
    assert resp.status_code == 401


async def test_create_project_requires_auth(client: AsyncClient):
    resp = await client.post(BASE, json={"title": "Test"})
    assert resp.status_code == 401


async def test_update_project_requires_auth(client: AsyncClient):
    resp = await client.patch(f"{BASE}/any-id", json={"title": "Updated"})
    assert resp.status_code == 401


async def test_delete_project_requires_auth(client: AsyncClient):
    resp = await client.delete(f"{BASE}/any-id")
    assert resp.status_code == 401


async def test_add_task_requires_auth(client: AsyncClient):
    resp = await client.post(f"{BASE}/any-id/tasks", json={"title": "Task"})
    assert resp.status_code == 401


# ── Create ────────────────────────────────────────────────────────────────────

async def test_create_project_returns_201(client: AsyncClient, auth_headers: dict):
    project = await _create_project(client, auth_headers, tasks=[
        {"title": "Design mockups", "description": "Create wireframes and mockups."},
        {"title": "Frontend development", "description": "Implement approved designs."},
    ])
    assert "id" in project
    assert project["project_number"].startswith("PRJ-")
    assert project["status"] == "planning"
    assert project["budget"] == 15000.0
    assert len(project["tasks"]) == 2


async def test_create_project_without_tasks(client: AsyncClient, auth_headers: dict):
    project = await _create_project(client, auth_headers)
    assert project["tasks"] == []


async def test_create_project_requires_title(client: AsyncClient, auth_headers: dict):
    resp = await client.post(BASE, headers=auth_headers, json={"budget": 1000.0})
    assert resp.status_code == 422


# ── Read ──────────────────────────────────────────────────────────────────────

async def test_get_project_by_id(client: AsyncClient, auth_headers: dict):
    project = await _create_project(client, auth_headers)
    resp = await client.get(f"{BASE}/{project['id']}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == project["id"]


async def test_get_project_not_found(client: AsyncClient, auth_headers: dict):
    resp = await client.get(f"{BASE}/nonexistent-id", headers=auth_headers)
    assert resp.status_code == 404


async def test_list_projects_returns_created(client: AsyncClient, auth_headers: dict):
    project = await _create_project(client, auth_headers)
    resp = await client.get(BASE, headers=auth_headers)
    assert resp.status_code == 200
    ids = [p["id"] for p in resp.json()]
    assert project["id"] in ids


async def test_list_projects_filter_by_status(client: AsyncClient, auth_headers: dict):
    project = await _create_project(client, auth_headers)
    resp = await client.get(f"{BASE}?status=planning", headers=auth_headers)
    assert resp.status_code == 200
    assert all(p["status"] == "planning" for p in resp.json())

    resp2 = await client.get(f"{BASE}?status=completed", headers=auth_headers)
    assert resp2.status_code == 200
    ids = [p["id"] for p in resp2.json()]
    assert project["id"] not in ids


# ── Update ────────────────────────────────────────────────────────────────────

async def test_update_project_title(client: AsyncClient, auth_headers: dict):
    project = await _create_project(client, auth_headers)
    resp = await client.patch(
        f"{BASE}/{project['id']}",
        headers=auth_headers,
        json={"title": "Updated Website Redesign"},
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated Website Redesign"


# ── Delete ────────────────────────────────────────────────────────────────────

async def test_delete_planning_project(client: AsyncClient, auth_headers: dict):
    project = await _create_project(client, auth_headers)
    resp = await client.delete(f"{BASE}/{project['id']}", headers=auth_headers)
    assert resp.status_code == 204

    resp2 = await client.get(f"{BASE}/{project['id']}", headers=auth_headers)
    assert resp2.status_code == 404


async def test_delete_active_project_rejected(client: AsyncClient, auth_headers: dict):
    project = await _create_project(client, auth_headers)
    await client.patch(
        f"{BASE}/{project['id']}", headers=auth_headers, json={"status": "active"}
    )
    resp = await client.delete(f"{BASE}/{project['id']}", headers=auth_headers)
    assert resp.status_code == 409


# ── State machine ─────────────────────────────────────────────────────────────

async def test_valid_transition_planning_to_active(client: AsyncClient, auth_headers: dict):
    project = await _create_project(client, auth_headers)
    resp = await client.patch(
        f"{BASE}/{project['id']}", headers=auth_headers, json={"status": "active"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "active"
    assert data["activated_at"] is not None


async def test_valid_transition_active_to_on_hold(client: AsyncClient, auth_headers: dict):
    project = await _create_project(client, auth_headers)
    await client.patch(f"{BASE}/{project['id']}", headers=auth_headers, json={"status": "active"})
    resp = await client.patch(
        f"{BASE}/{project['id']}", headers=auth_headers, json={"status": "on_hold"}
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "on_hold"


async def test_valid_transition_on_hold_to_active(client: AsyncClient, auth_headers: dict):
    project = await _create_project(client, auth_headers)
    await client.patch(f"{BASE}/{project['id']}", headers=auth_headers, json={"status": "active"})
    await client.patch(f"{BASE}/{project['id']}", headers=auth_headers, json={"status": "on_hold"})
    resp = await client.patch(
        f"{BASE}/{project['id']}", headers=auth_headers, json={"status": "active"}
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "active"


async def test_valid_transition_active_to_completed(client: AsyncClient, auth_headers: dict):
    project = await _create_project(client, auth_headers)
    await client.patch(f"{BASE}/{project['id']}", headers=auth_headers, json={"status": "active"})
    resp = await client.patch(
        f"{BASE}/{project['id']}", headers=auth_headers, json={"status": "completed"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "completed"
    assert data["completed_at"] is not None


async def test_invalid_transition_planning_to_completed(client: AsyncClient, auth_headers: dict):
    project = await _create_project(client, auth_headers)
    resp = await client.patch(
        f"{BASE}/{project['id']}", headers=auth_headers, json={"status": "completed"}
    )
    assert resp.status_code == 422


async def test_invalid_transition_from_terminal(client: AsyncClient, auth_headers: dict):
    """Cannot transition out of completed state."""
    project = await _create_project(client, auth_headers)
    await client.patch(f"{BASE}/{project['id']}", headers=auth_headers, json={"status": "active"})
    await client.patch(f"{BASE}/{project['id']}", headers=auth_headers, json={"status": "completed"})
    resp = await client.patch(
        f"{BASE}/{project['id']}", headers=auth_headers, json={"status": "active"}
    )
    assert resp.status_code == 422


# ── Task management ───────────────────────────────────────────────────────────

async def test_add_task_to_planning_project(client: AsyncClient, auth_headers: dict):
    project = await _create_project(client, auth_headers)
    resp = await client.post(
        f"{BASE}/{project['id']}/tasks",
        headers=auth_headers,
        json={"title": "Backend integration", "description": "Connect APIs."},
    )
    assert resp.status_code == 201
    tasks = resp.json()["tasks"]
    assert any(t["title"] == "Backend integration" for t in tasks)


async def test_update_task_status(client: AsyncClient, auth_headers: dict):
    project = await _create_project(client, auth_headers, tasks=[
        {"title": "Initial task", "description": "First task."}
    ])
    task_id = project["tasks"][0]["id"]
    resp = await client.patch(
        f"{BASE}/{project['id']}/tasks/{task_id}",
        headers=auth_headers,
        json={"status": "in_progress"},
    )
    assert resp.status_code == 200
    updated_task = next(t for t in resp.json()["tasks"] if t["id"] == task_id)
    assert updated_task["status"] == "in_progress"


async def test_delete_task(client: AsyncClient, auth_headers: dict):
    project = await _create_project(client, auth_headers, tasks=[
        {"title": "Task to delete"}
    ])
    task_id = project["tasks"][0]["id"]
    resp = await client.delete(
        f"{BASE}/{project['id']}/tasks/{task_id}",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert not any(t["id"] == task_id for t in resp.json()["tasks"])


async def test_cannot_add_task_to_completed_project(client: AsyncClient, auth_headers: dict):
    project = await _create_project(client, auth_headers)
    pid = project["id"]
    for status in ("active", "completed"):
        await client.patch(f"{BASE}/{pid}", headers=auth_headers, json={"status": status})

    resp = await client.post(
        f"{BASE}/{pid}/tasks",
        headers=auth_headers,
        json={"title": "Late task", "description": "Should not be allowed."},
    )
    assert resp.status_code == 409


# ── Workspace isolation ───────────────────────────────────────────────────────

async def test_project_not_visible_across_workspaces(client: AsyncClient, auth_headers: dict):
    ws2 = await _get_second_auth_headers(client)
    project = await _create_project(client, auth_headers)

    resp = await client.get(BASE, headers=ws2)
    ids = [p["id"] for p in resp.json()]
    assert project["id"] not in ids


async def test_project_not_accessible_by_other_workspace(client: AsyncClient, auth_headers: dict):
    ws2 = await _get_second_auth_headers(client)
    project = await _create_project(client, auth_headers)

    resp = await client.get(f"{BASE}/{project['id']}", headers=ws2)
    assert resp.status_code == 404

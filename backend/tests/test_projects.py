"""
Projects module integration tests.

Covers flows not exercised by contract tests:
- Sequential project numbering
- Task ordering and auto-assignment
- Filter by organization_id
- Full lifecycle: planning → active → completed
- Terminal projects block budget/date edits (but allow title/notes)
- Task status machine in full sequence
- Multiple tasks: add, reorder, mark done, delete
- on_hold → active → completed flow
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

BASE = "/api/v1/projects"


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _create_project(client: AsyncClient, headers: dict, **overrides) -> dict:
    payload = {"title": "Integration Project", "budget": 8000.0, **overrides}
    resp = await client.post(BASE, headers=headers, json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _transition(client: AsyncClient, headers: dict, project_id: str, status: str) -> dict:
    resp = await client.patch(f"{BASE}/{project_id}", headers=headers, json={"status": status})
    assert resp.status_code == 200, resp.text
    return resp.json()


async def _add_task(client: AsyncClient, headers: dict, project_id: str, title: str, **kw) -> dict:
    resp = await client.post(
        f"{BASE}/{project_id}/tasks", headers=headers, json={"title": title, **kw}
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


# ── 1. Sequential project numbering ──────────────────────────────────────────

async def test_project_numbers_are_sequential(client: AsyncClient, auth_headers: dict):
    p1 = await _create_project(client, auth_headers, title="First")
    p2 = await _create_project(client, auth_headers, title="Second")
    p3 = await _create_project(client, auth_headers, title="Third")

    n1 = int(p1["project_number"].split("-")[-1])
    n2 = int(p2["project_number"].split("-")[-1])
    n3 = int(p3["project_number"].split("-")[-1])

    assert n2 == n1 + 1
    assert n3 == n2 + 1


async def test_project_number_format(client: AsyncClient, auth_headers: dict):
    project = await _create_project(client, auth_headers)
    parts = project["project_number"].split("-")
    assert len(parts) == 3
    assert parts[0] == "PRJ"
    assert parts[1].isdigit() and len(parts[1]) == 4  # year
    assert parts[2].isdigit() and len(parts[2]) == 4  # zero-padded seq


# ── 2. Full lifecycle flows ───────────────────────────────────────────────────

async def test_full_lifecycle_planning_to_completed(client: AsyncClient, auth_headers: dict):
    """planning → active → completed — verify timestamps."""
    project = await _create_project(client, auth_headers)
    pid = project["id"]
    assert project["activated_at"] is None
    assert project["completed_at"] is None

    active = await _transition(client, auth_headers, pid, "active")
    assert active["activated_at"] is not None
    assert active["completed_at"] is None

    completed = await _transition(client, auth_headers, pid, "completed")
    assert completed["completed_at"] is not None
    assert completed["status"] == "completed"


async def test_on_hold_resume_then_complete(client: AsyncClient, auth_headers: dict):
    """planning → active → on_hold → active → completed."""
    project = await _create_project(client, auth_headers)
    pid = project["id"]

    await _transition(client, auth_headers, pid, "active")
    on_hold = await _transition(client, auth_headers, pid, "on_hold")
    assert on_hold["status"] == "on_hold"

    resumed = await _transition(client, auth_headers, pid, "active")
    assert resumed["status"] == "active"
    # activated_at should still be set from first activation
    assert resumed["activated_at"] is not None

    completed = await _transition(client, auth_headers, pid, "completed")
    assert completed["status"] == "completed"


async def test_cancel_from_on_hold(client: AsyncClient, auth_headers: dict):
    """Can cancel directly from on_hold."""
    project = await _create_project(client, auth_headers)
    pid = project["id"]
    await _transition(client, auth_headers, pid, "active")
    await _transition(client, auth_headers, pid, "on_hold")
    cancelled = await _transition(client, auth_headers, pid, "cancelled")
    assert cancelled["status"] == "cancelled"
    assert cancelled["cancelled_at"] is not None


# ── 3. Terminal projects block budget edits ───────────────────────────────────

async def test_completed_project_blocks_budget_edit(client: AsyncClient, auth_headers: dict):
    project = await _create_project(client, auth_headers, budget=5000.0)
    pid = project["id"]
    await _transition(client, auth_headers, pid, "active")
    await _transition(client, auth_headers, pid, "completed")

    resp = await client.patch(f"{BASE}/{pid}", headers=auth_headers, json={"budget": 99999.0})
    assert resp.status_code == 200
    assert resp.json()["budget"] == 5000.0  # unchanged


async def test_completed_project_allows_title_edit(client: AsyncClient, auth_headers: dict):
    project = await _create_project(client, auth_headers)
    pid = project["id"]
    await _transition(client, auth_headers, pid, "active")
    await _transition(client, auth_headers, pid, "completed")

    resp = await client.patch(f"{BASE}/{pid}", headers=auth_headers, json={"title": "Renamed After Completion"})
    assert resp.status_code == 200
    assert resp.json()["title"] == "Renamed After Completion"


# ── 4. Task management flows ──────────────────────────────────────────────────

async def test_task_status_full_sequence(client: AsyncClient, auth_headers: dict):
    """todo → in_progress → done."""
    project = await _create_project(client, auth_headers)
    pid = project["id"]
    await _transition(client, auth_headers, pid, "active")

    result = await _add_task(client, auth_headers, pid, "Implement feature X")
    task_id = result["tasks"][-1]["id"]

    # todo → in_progress
    resp = await client.patch(
        f"{BASE}/{pid}/tasks/{task_id}", headers=auth_headers, json={"status": "in_progress"}
    )
    assert resp.status_code == 200
    task = next(t for t in resp.json()["tasks"] if t["id"] == task_id)
    assert task["status"] == "in_progress"

    # in_progress → done
    resp = await client.patch(
        f"{BASE}/{pid}/tasks/{task_id}", headers=auth_headers, json={"status": "done"}
    )
    assert resp.status_code == 200
    task = next(t for t in resp.json()["tasks"] if t["id"] == task_id)
    assert task["status"] == "done"


async def test_task_done_can_be_reopened(client: AsyncClient, auth_headers: dict):
    """done → todo (reopen)."""
    project = await _create_project(client, auth_headers, tasks=[{"title": "Reopenable task"}])
    pid = project["id"]
    task_id = project["tasks"][0]["id"]

    # Advance to done
    await client.patch(f"{BASE}/{pid}/tasks/{task_id}", headers=auth_headers, json={"status": "in_progress"})
    await client.patch(f"{BASE}/{pid}/tasks/{task_id}", headers=auth_headers, json={"status": "done"})

    # Reopen
    resp = await client.patch(
        f"{BASE}/{pid}/tasks/{task_id}", headers=auth_headers, json={"status": "todo"}
    )
    assert resp.status_code == 200
    task = next(t for t in resp.json()["tasks"] if t["id"] == task_id)
    assert task["status"] == "todo"


async def test_task_auto_order_increments(client: AsyncClient, auth_headers: dict):
    """Tasks added without explicit order get ascending task_order values."""
    project = await _create_project(client, auth_headers)
    pid = project["id"]

    for title in ("Task A", "Task B", "Task C"):
        await _add_task(client, auth_headers, pid, title)

    resp = await client.get(f"{BASE}/{pid}", headers=auth_headers)
    tasks = resp.json()["tasks"]
    orders = [t["task_order"] for t in tasks]
    assert orders == sorted(orders)


async def test_tasks_preserved_across_status_transitions(client: AsyncClient, auth_headers: dict):
    """Tasks are not lost when project transitions status."""
    project = await _create_project(client, auth_headers, tasks=[
        {"title": "Pre-existing task"}
    ])
    pid = project["id"]
    assert len(project["tasks"]) == 1

    active = await _transition(client, auth_headers, pid, "active")
    assert len(active["tasks"]) == 1
    assert active["tasks"][0]["title"] == "Pre-existing task"


# ── 5. Filter by organization_id ─────────────────────────────────────────────

async def test_filter_by_organization_id(client: AsyncClient, auth_headers: dict):
    # Create a real organization (FK constraint requires it)
    org_resp = await client.post(
        "/api/v1/organizations", headers=auth_headers,
        json={"legal_name": "BuildCo Test", "org_type": "customer"}
    )
    assert org_resp.status_code == 201, org_resp.text
    real_org_id = org_resp.json()["id"]

    tagged = await _create_project(client, auth_headers, organization_id=real_org_id)
    untagged = await _create_project(client, auth_headers)

    resp = await client.get(f"{BASE}?organization_id={real_org_id}", headers=auth_headers)
    ids = [p["id"] for p in resp.json()]
    assert tagged["id"] in ids
    assert untagged["id"] not in ids


# ── 6. Multiple projects with status filter ───────────────────────────────────

async def test_multiple_projects_status_filter(client: AsyncClient, auth_headers: dict):
    """Create 3 projects at different statuses, verify filter returns correct subset."""
    p1 = await _create_project(client, auth_headers, title="Planning project")

    p2 = await _create_project(client, auth_headers, title="Active project")
    await _transition(client, auth_headers, p2["id"], "active")

    p3 = await _create_project(client, auth_headers, title="Cancelled project")
    await _transition(client, auth_headers, p3["id"], "cancelled")

    planning_ids = [p["id"] for p in (await client.get(f"{BASE}?status=planning", headers=auth_headers)).json()]
    active_ids   = [p["id"] for p in (await client.get(f"{BASE}?status=active",   headers=auth_headers)).json()]
    cancelled_ids= [p["id"] for p in (await client.get(f"{BASE}?status=cancelled",headers=auth_headers)).json()]

    assert p1["id"] in planning_ids
    assert p2["id"] in active_ids
    assert p3["id"] in cancelled_ids

    assert p1["id"] not in active_ids
    assert p2["id"] not in planning_ids

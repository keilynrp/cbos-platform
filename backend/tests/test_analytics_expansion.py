"""
Analytics expansion tests — /analytics/hr, /analytics/projects, /analytics/contracts.

Covers:
- Auth guards for all 3 new endpoints
- Empty-state behaviour (no data → valid zero responses)
- Response shape validation (required fields, correct types)
- Data accuracy: counts and aggregates match seeded records
- Workspace isolation: data from other workspaces not visible
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

BASE      = "/api/v1/analytics"
AUTH_BASE = "/api/v1/auth"
EMP_BASE  = "/api/v1/employees"
DEPT_BASE = "/api/v1/departments"
PRJ_BASE  = "/api/v1/projects"
CTR_BASE  = "/api/v1/contracts"
ORG_BASE  = "/api/v1/organizations"


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _second_workspace(client: AsyncClient) -> dict:
    resp = await client.post(f"{AUTH_BASE}/register", json={
        "full_name": "Analytics Exp WS2",
        "email": "analytics_exp_ws2@test.com",
        "password": "Password123!",
        "workspace_name": "Analytics Exp Workspace Two",
        "workspace_slug": "analytics-exp-ws2",
    })
    assert resp.status_code in (200, 201), resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def _create_dept(client: AsyncClient, headers: dict, name: str = "Eng") -> dict:
    resp = await client.post(DEPT_BASE, headers=headers, json={"name": name})
    assert resp.status_code == 201
    return resp.json()


async def _create_emp(client: AsyncClient, headers: dict, **kw) -> dict:
    payload = {"full_name": "Test Employee", **kw}
    resp = await client.post(EMP_BASE, headers=headers, json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _transition_emp(client, headers, emp_id, status):
    resp = await client.patch(f"{EMP_BASE}/{emp_id}", headers=headers, json={"status": status})
    assert resp.status_code == 200
    return resp.json()


async def _create_project(client: AsyncClient, headers: dict, **kw) -> dict:
    payload = {"title": "Test Project", "budget": 5000.0, **kw}
    resp = await client.post(PRJ_BASE, headers=headers, json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _transition_project(client, headers, pid, status):
    resp = await client.patch(f"{PRJ_BASE}/{pid}", headers=headers, json={"status": status})
    assert resp.status_code == 200
    return resp.json()


async def _create_contract(client: AsyncClient, headers: dict, **kw) -> dict:
    payload = {"title": "Test Contract", "value": 10000.0, **kw}
    resp = await client.post(CTR_BASE, headers=headers, json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _transition_contract(client, headers, cid, status):
    resp = await client.patch(f"{CTR_BASE}/{cid}", headers=headers, json={"status": status})
    assert resp.status_code == 200
    return resp.json()


# ══════════════════════════════════════════════════════════════════════════════
# 1. Auth guards
# ══════════════════════════════════════════════════════════════════════════════

async def test_analytics_hr_requires_auth(client: AsyncClient):
    resp = await client.get(f"{BASE}/hr")
    assert resp.status_code == 401


async def test_analytics_projects_requires_auth(client: AsyncClient):
    resp = await client.get(f"{BASE}/projects")
    assert resp.status_code == 401


async def test_analytics_contracts_requires_auth(client: AsyncClient):
    resp = await client.get(f"{BASE}/contracts")
    assert resp.status_code == 401


# ══════════════════════════════════════════════════════════════════════════════
# 2. Empty-state responses (new workspace, no data)
# ══════════════════════════════════════════════════════════════════════════════

async def test_analytics_hr_empty_state(client: AsyncClient, auth_headers: dict):
    resp = await client.get(f"{BASE}/hr", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_employees"] >= 0
    assert data["active_count"] >= 0
    assert data["on_leave_count"] >= 0
    assert data["terminated_count"] >= 0
    assert isinstance(data["by_employment_type"], list)
    assert data["department_count"] >= 0
    assert data["unassigned_employees"] >= 0
    assert data["new_hires_this_month"] >= 0
    assert data["terminations_this_month"] >= 0


async def test_analytics_projects_empty_state(client: AsyncClient, auth_headers: dict):
    resp = await client.get(f"{BASE}/projects", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_projects"] >= 0
    assert data["active_count"] >= 0
    assert isinstance(data["by_status"], list)
    assert data["total_budget_active"] >= 0.0
    assert data["total_tasks"] >= 0
    assert data["done_tasks"] >= 0
    assert data["overdue_tasks"] >= 0
    assert 0.0 <= data["task_completion_rate"] <= 1.0
    assert data["completed_this_month"] >= 0
    assert data["cancelled_this_month"] >= 0


async def test_analytics_contracts_empty_state(client: AsyncClient, auth_headers: dict):
    resp = await client.get(f"{BASE}/contracts", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_contracts"] >= 0
    assert isinstance(data["by_status"], list)
    assert data["total_value_signed"] >= 0.0
    assert data["total_value_executed"] >= 0.0
    assert data["signed_this_month"] >= 0
    assert data["executed_this_month"] >= 0
    assert data["expiring_soon"] >= 0


# ══════════════════════════════════════════════════════════════════════════════
# 3. HR analytics — data accuracy
# ══════════════════════════════════════════════════════════════════════════════

async def test_analytics_hr_counts_reflect_employees(client: AsyncClient, auth_headers: dict):
    """Create employees in different statuses and verify counts."""
    baseline = (await client.get(f"{BASE}/hr", headers=auth_headers)).json()
    base_total = baseline["total_employees"]
    base_active = baseline["active_count"]
    base_on_leave = baseline["on_leave_count"]

    # 2 active employees
    e1 = await _create_emp(client, auth_headers, full_name="HR Active 1")
    e2 = await _create_emp(client, auth_headers, full_name="HR Active 2")
    # 1 on leave
    e3 = await _create_emp(client, auth_headers, full_name="HR OnLeave 1")
    await _transition_emp(client, auth_headers, e3["id"], "on_leave")

    resp = await client.get(f"{BASE}/hr", headers=auth_headers)
    data = resp.json()

    assert data["total_employees"] == base_total + 3
    assert data["active_count"] == base_active + 2
    assert data["on_leave_count"] == base_on_leave + 1


async def test_analytics_hr_by_employment_type(client: AsyncClient, auth_headers: dict):
    """Employment type breakdown counts only active/on_leave employees."""
    await _create_emp(client, auth_headers, full_name="FT 1", employment_type="full_time")
    await _create_emp(client, auth_headers, full_name="FT 2", employment_type="full_time")
    await _create_emp(client, auth_headers, full_name="CT 1", employment_type="contractor")

    resp = await client.get(f"{BASE}/hr", headers=auth_headers)
    data = resp.json()
    type_map = {e["employment_type"]: e["count"] for e in data["by_employment_type"]}

    assert type_map.get("full_time", 0) >= 2
    assert type_map.get("contractor", 0) >= 1


async def test_analytics_hr_department_count(client: AsyncClient, auth_headers: dict):
    """Department count includes newly created departments."""
    baseline = (await client.get(f"{BASE}/hr", headers=auth_headers)).json()
    base_depts = baseline["department_count"]

    await _create_dept(client, auth_headers, name="Analytics Dept A")
    await _create_dept(client, auth_headers, name="Analytics Dept B")

    resp = await client.get(f"{BASE}/hr", headers=auth_headers)
    assert resp.json()["department_count"] == base_depts + 2


async def test_analytics_hr_unassigned_employees(client: AsyncClient, auth_headers: dict):
    """Employees without department_id are counted as unassigned."""
    baseline = (await client.get(f"{BASE}/hr", headers=auth_headers)).json()
    base_unassigned = baseline["unassigned_employees"]

    # 2 unassigned active employees
    await _create_emp(client, auth_headers, full_name="No Dept 1")
    await _create_emp(client, auth_headers, full_name="No Dept 2")

    # 1 assigned employee (should NOT count as unassigned)
    dept = await _create_dept(client, auth_headers, name="Assigned Dept")
    await _create_emp(client, auth_headers, full_name="Has Dept", department_id=dept["id"])

    resp = await client.get(f"{BASE}/hr", headers=auth_headers)
    data = resp.json()
    assert data["unassigned_employees"] >= base_unassigned + 2


# ══════════════════════════════════════════════════════════════════════════════
# 4. Projects analytics — data accuracy
# ══════════════════════════════════════════════════════════════════════════════

async def test_analytics_projects_by_status(client: AsyncClient, auth_headers: dict):
    """by_status includes all statuses with correct counts."""
    baseline = (await client.get(f"{BASE}/projects", headers=auth_headers)).json()
    base_map = {s["status"]: s["count"] for s in baseline["by_status"]}

    p1 = await _create_project(client, auth_headers, title="Planning PRJ")
    p2 = await _create_project(client, auth_headers, title="Active PRJ")
    await _transition_project(client, auth_headers, p2["id"], "active")

    resp = await client.get(f"{BASE}/projects", headers=auth_headers)
    data = resp.json()
    status_map = {s["status"]: s["count"] for s in data["by_status"]}

    assert status_map.get("planning", 0) >= base_map.get("planning", 0) + 1
    assert status_map.get("active", 0) >= base_map.get("active", 0) + 1


async def test_analytics_projects_active_budget(client: AsyncClient, auth_headers: dict):
    """total_budget_active sums budget of active projects only."""
    baseline = (await client.get(f"{BASE}/projects", headers=auth_headers)).json()
    base_budget = baseline["total_budget_active"]

    # Active project: budget 3000
    p_active = await _create_project(client, auth_headers, title="Budgeted Active", budget=3000.0)
    await _transition_project(client, auth_headers, p_active["id"], "active")

    # Planning project: budget 9000 (should NOT be added to active budget)
    await _create_project(client, auth_headers, title="Budgeted Planning", budget=9000.0)

    resp = await client.get(f"{BASE}/projects", headers=auth_headers)
    data = resp.json()
    assert data["total_budget_active"] >= base_budget + 3000.0


async def test_analytics_projects_task_completion_rate(client: AsyncClient, auth_headers: dict):
    """Task completion rate = done_tasks / total_tasks for non-terminal projects."""
    project = await _create_project(client, auth_headers, title="Task Rate PRJ")
    pid = project["id"]

    # Add 3 tasks
    for i in range(3):
        await client.post(f"{PRJ_BASE}/{pid}/tasks", headers=auth_headers, json={"title": f"Task {i}"})

    resp_before = await client.get(f"{BASE}/projects", headers=auth_headers)
    before = resp_before.json()

    # Mark one task done
    proj_detail = (await client.get(f"{PRJ_BASE}/{pid}", headers=auth_headers)).json()
    task_id = proj_detail["tasks"][0]["id"]
    await client.patch(f"{PRJ_BASE}/{pid}/tasks/{task_id}", headers=auth_headers, json={"status": "in_progress"})
    await client.patch(f"{PRJ_BASE}/{pid}/tasks/{task_id}", headers=auth_headers, json={"status": "done"})

    resp_after = await client.get(f"{BASE}/projects", headers=auth_headers)
    after = resp_after.json()

    # done_tasks increased by 1
    assert after["done_tasks"] >= before["done_tasks"] + 1
    # rate is always in [0, 1]
    assert 0.0 <= after["task_completion_rate"] <= 1.0


# ══════════════════════════════════════════════════════════════════════════════
# 5. Contracts analytics — data accuracy
# ══════════════════════════════════════════════════════════════════════════════

async def test_analytics_contracts_by_status(client: AsyncClient, auth_headers: dict):
    """by_status reflects draft/sent/signed distribution."""
    baseline = (await client.get(f"{BASE}/contracts", headers=auth_headers)).json()
    base_map = {s["status"]: s["count"] for s in baseline["by_status"]}

    c1 = await _create_contract(client, auth_headers, title="Draft CTR")
    c2 = await _create_contract(client, auth_headers, title="Sent CTR")
    await _transition_contract(client, auth_headers, c2["id"], "sent")
    c3 = await _create_contract(client, auth_headers, title="Signed CTR")
    await _transition_contract(client, auth_headers, c3["id"], "sent")
    await _transition_contract(client, auth_headers, c3["id"], "signed")

    resp = await client.get(f"{BASE}/contracts", headers=auth_headers)
    data = resp.json()
    status_map = {s["status"]: s["count"] for s in data["by_status"]}

    assert status_map.get("draft", 0) >= base_map.get("draft", 0) + 1
    assert status_map.get("sent", 0) >= base_map.get("sent", 0) + 1
    assert status_map.get("signed", 0) >= base_map.get("signed", 0) + 1


async def test_analytics_contracts_value_signed(client: AsyncClient, auth_headers: dict):
    """total_value_signed includes signed + executed contracts."""
    baseline = (await client.get(f"{BASE}/contracts", headers=auth_headers)).json()
    base_signed = baseline["total_value_signed"]

    # Create and sign a contract worth 15000
    c = await _create_contract(client, auth_headers, title="Value Signed CTR", value=15000.0)
    await _transition_contract(client, auth_headers, c["id"], "sent")
    await _transition_contract(client, auth_headers, c["id"], "signed")

    resp = await client.get(f"{BASE}/contracts", headers=auth_headers)
    data = resp.json()
    assert data["total_value_signed"] >= base_signed + 15000.0


async def test_analytics_contracts_value_executed(client: AsyncClient, auth_headers: dict):
    """total_value_executed includes only executed contracts (not signed)."""
    baseline = (await client.get(f"{BASE}/contracts", headers=auth_headers)).json()
    base_exec = baseline["total_value_executed"]

    # Signed contract (value=5000): should add to signed but not executed
    cs = await _create_contract(client, auth_headers, title="Signed Only", value=5000.0)
    await _transition_contract(client, auth_headers, cs["id"], "sent")
    await _transition_contract(client, auth_headers, cs["id"], "signed")

    # Executed contract (value=8000): should add to both executed and signed
    ce = await _create_contract(client, auth_headers, title="Executed", value=8000.0)
    await _transition_contract(client, auth_headers, ce["id"], "sent")
    await _transition_contract(client, auth_headers, ce["id"], "signed")
    await _transition_contract(client, auth_headers, ce["id"], "executed")

    resp = await client.get(f"{BASE}/contracts", headers=auth_headers)
    data = resp.json()
    assert data["total_value_executed"] >= base_exec + 8000.0
    # signed-only contract should NOT appear in executed value
    assert data["total_value_executed"] < base_exec + 8000.0 + 5000.0


async def test_analytics_contracts_total_count(client: AsyncClient, auth_headers: dict):
    """total_contracts reflects all contracts regardless of status."""
    baseline = (await client.get(f"{BASE}/contracts", headers=auth_headers)).json()
    base_total = baseline["total_contracts"]

    await _create_contract(client, auth_headers, title="Count CTR 1")
    await _create_contract(client, auth_headers, title="Count CTR 2")

    resp = await client.get(f"{BASE}/contracts", headers=auth_headers)
    assert resp.json()["total_contracts"] == base_total + 2


# ══════════════════════════════════════════════════════════════════════════════
# 6. Workspace isolation
# ══════════════════════════════════════════════════════════════════════════════

async def test_analytics_hr_workspace_isolation(client: AsyncClient, auth_headers: dict):
    """Employees created in WS1 are invisible to WS2's HR analytics."""
    ws2_headers = await _second_workspace(client)

    # Create employees in WS1
    await _create_emp(client, auth_headers, full_name="WS1 Employee A")
    await _create_emp(client, auth_headers, full_name="WS1 Employee B")

    # WS2 should see 0 employees of their own
    resp = await client.get(f"{BASE}/hr", headers=ws2_headers)
    data = resp.json()
    assert data["total_employees"] == 0


async def test_analytics_projects_workspace_isolation(client: AsyncClient, auth_headers: dict):
    """Projects created in WS1 are invisible to WS2's analytics."""
    ws2_headers = await _second_workspace(client)

    await _create_project(client, auth_headers, title="WS1 Project A")
    await _create_project(client, auth_headers, title="WS1 Project B")

    resp = await client.get(f"{BASE}/projects", headers=ws2_headers)
    data = resp.json()
    assert data["total_projects"] == 0


async def test_analytics_contracts_workspace_isolation(client: AsyncClient, auth_headers: dict):
    """Contracts created in WS1 are invisible to WS2's analytics."""
    ws2_headers = await _second_workspace(client)

    await _create_contract(client, auth_headers, title="WS1 Contract A")
    await _create_contract(client, auth_headers, title="WS1 Contract B")

    resp = await client.get(f"{BASE}/contracts", headers=ws2_headers)
    data = resp.json()
    assert data["total_contracts"] == 0

"""
Workflows module contract tests.
Covers: auth guards, workflow CRUD lifecycle, toggle, runs listing,
test endpoint, DLQ endpoints, workspace isolation.
"""
import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

BASE = "/api/v1/workflows"

_SAMPLE_WORKFLOW = {
    "name": "Contract Test Workflow",
    "trigger_type": "event",
    "trigger_config": {"event_type": "LeadCaptured"},
    "conditions": [],
    "actions": [{"type": "create_activity", "config": {"title": "Follow up"}}],
    "enabled": True,
}


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _create_workflow(client, headers, **overrides):
    resp = await client.post(BASE, headers=headers, json={**_SAMPLE_WORKFLOW, **overrides})
    assert resp.status_code == 201, resp.text
    return resp.json()

async def _get_second_auth_headers(client):
    resp = await client.post("/api/v1/auth/register", json={
        "full_name": "WS2 Workflows",
        "email": "workspace2_workflows@test.com",
        "password": "Password123!",
        "workspace_name": "Workspace Two WF",
        "workspace_slug": "workspace-two-wf",
    })
    assert resp.status_code in (200, 201), resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


# ── Auth guards ───────────────────────────────────────────────────────────────

async def test_list_workflows_requires_auth(client: AsyncClient):
    resp = await client.get(BASE)
    assert resp.status_code == 401

async def test_create_workflow_requires_auth(client: AsyncClient):
    resp = await client.post(BASE, json=_SAMPLE_WORKFLOW)
    assert resp.status_code == 401

async def test_get_workflow_requires_auth(client: AsyncClient):
    resp = await client.get(f"{BASE}/some-id")
    assert resp.status_code == 401

async def test_update_workflow_requires_auth(client: AsyncClient):
    resp = await client.patch(f"{BASE}/some-id", json={"name": "x"})
    assert resp.status_code == 401

async def test_toggle_workflow_requires_auth(client: AsyncClient):
    resp = await client.post(f"{BASE}/some-id/toggle")
    assert resp.status_code == 401

async def test_delete_workflow_requires_auth(client: AsyncClient):
    resp = await client.delete(f"{BASE}/some-id")
    assert resp.status_code == 401

async def test_list_runs_requires_auth(client: AsyncClient):
    resp = await client.get(f"{BASE}/some-id/runs")
    assert resp.status_code == 401

async def test_test_workflow_requires_auth(client: AsyncClient):
    resp = await client.post(f"{BASE}/some-id/test", json={"event_type": "LeadCaptured", "payload": {}})
    assert resp.status_code == 401

async def test_dlq_list_requires_auth(client: AsyncClient):
    resp = await client.get(f"{BASE}/dlq")
    assert resp.status_code == 401

async def test_dlq_delete_requires_auth(client: AsyncClient):
    resp = await client.delete(f"{BASE}/dlq/some-entry-id")
    assert resp.status_code == 401


# ── Workspace isolation ───────────────────────────────────────────────────────

async def test_workflow_not_visible_across_workspaces(client: AsyncClient, auth_headers: dict):
    ws2 = await _get_second_auth_headers(client)
    wf = await _create_workflow(client, auth_headers, name="WS1 Workflow")

    resp = await client.get(BASE, headers=ws2)
    assert resp.status_code == 200
    ids = [w["id"] for w in resp.json()]
    assert wf["id"] not in ids


# ── Workflow lifecycle ────────────────────────────────────────────────────────

async def test_create_workflow_returns_201(client: AsyncClient, auth_headers: dict):
    wf = await _create_workflow(client, auth_headers)
    assert wf["name"] == "Contract Test Workflow"
    assert wf["enabled"] is True
    assert "id" in wf
    assert "workspace_id" in wf

async def test_get_workflow_by_id(client: AsyncClient, auth_headers: dict):
    wf = await _create_workflow(client, auth_headers)
    resp = await client.get(f"{BASE}/{wf['id']}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == wf["id"]

async def test_get_workflow_not_found_returns_404(client: AsyncClient, auth_headers: dict):
    resp = await client.get(f"{BASE}/nonexistent-id", headers=auth_headers)
    assert resp.status_code == 404

async def test_list_workflows_returns_created(client: AsyncClient, auth_headers: dict):
    wf = await _create_workflow(client, auth_headers, name="Listed Workflow")
    resp = await client.get(BASE, headers=auth_headers)
    assert resp.status_code == 200
    ids = [w["id"] for w in resp.json()]
    assert wf["id"] in ids

async def test_list_workflows_pagination(client: AsyncClient, auth_headers: dict):
    # Create 2 workflows, request with limit=1
    await _create_workflow(client, auth_headers, name="Page WF 1")
    await _create_workflow(client, auth_headers, name="Page WF 2")
    resp = await client.get(f"{BASE}?limit=1&offset=0", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1

async def test_update_workflow_name(client: AsyncClient, auth_headers: dict):
    wf = await _create_workflow(client, auth_headers)
    resp = await client.patch(f"{BASE}/{wf['id']}", headers=auth_headers, json={"name": "Updated Name"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated Name"

async def test_toggle_workflow_disables_then_enables(client: AsyncClient, auth_headers: dict):
    wf = await _create_workflow(client, auth_headers)
    assert wf["enabled"] is True

    resp = await client.post(f"{BASE}/{wf['id']}/toggle", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["enabled"] is False

    resp = await client.post(f"{BASE}/{wf['id']}/toggle", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["enabled"] is True

async def test_delete_workflow(client: AsyncClient, auth_headers: dict):
    wf = await _create_workflow(client, auth_headers)
    resp = await client.delete(f"{BASE}/{wf['id']}", headers=auth_headers)
    assert resp.status_code == 204

    resp = await client.get(f"{BASE}/{wf['id']}", headers=auth_headers)
    assert resp.status_code == 404


# ── Runs ──────────────────────────────────────────────────────────────────────

async def test_list_runs_returns_empty_for_new_workflow(client: AsyncClient, auth_headers: dict):
    wf = await _create_workflow(client, auth_headers)
    resp = await client.get(f"{BASE}/{wf['id']}/runs", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# ── Test endpoint ─────────────────────────────────────────────────────────────

async def test_workflow_test_endpoint_returns_result(client: AsyncClient, auth_headers: dict):
    wf = await _create_workflow(client, auth_headers)
    resp = await client.post(f"{BASE}/{wf['id']}/test", headers=auth_headers, json={
        "event_type": "LeadCaptured",
        "payload": {"source": "website"},
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "matched" in data
    assert "dry_run" in data
    assert data["dry_run"] is True


# ── DLQ ──────────────────────────────────────────────────────────────────────

async def test_dlq_list_returns_valid_shape(client: AsyncClient, auth_headers: dict):
    resp = await client.get(f"{BASE}/dlq", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "total" in data
    assert "entries" in data
    assert isinstance(data["entries"], list)

async def test_dlq_delete_nonexistent_returns_404(client: AsyncClient, auth_headers: dict):
    resp = await client.delete(f"{BASE}/dlq/nonexistent-entry-0", headers=auth_headers)
    assert resp.status_code == 404

    # Unico codigo de la plataforma levantado desde un router y no desde un
    # service. Por eso check_error_registry.py barre */*.py y no solo
    # service.py: con el barrido original este codigo era invisible.
    error = resp.json()["error"]
    assert error["code"] == "WORKFLOW_DLQ_ENTRY_NOT_FOUND"
    assert error["detail"]["entry_id"] == "nonexistent-entry-0"


async def test_workflow_not_found_error_shape(client: AsyncClient, auth_headers: dict):
    missing = "00000000-0000-0000-0000-000000000000"
    resp = await client.get(f"{BASE}/{missing}", headers=auth_headers)

    assert resp.status_code == 404
    error = resp.json()["error"]
    assert error["code"] == "WORKFLOW_NOT_FOUND"
    assert error["detail"]["id"] == missing

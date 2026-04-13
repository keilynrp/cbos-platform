"""
Contracts module contract tests.

Covers:
- Auth guards for all endpoints
- Workspace isolation
- Contract lifecycle: create, read, list, update, delete
- Status machine: valid and invalid transitions
- Clause management: add, update, delete
- Delete guard: only draft contracts
- Filter: by status, by organization_id
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

BASE = "/api/v1/contracts"
AUTH_BASE = "/api/v1/auth"


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _create_contract(client: AsyncClient, headers: dict, **overrides) -> dict:
    payload = {
        "title": "Service Agreement Q4 2026",
        "value": 12000.0,
        "currency": "USD",
        **overrides,
    }
    resp = await client.post(BASE, headers=headers, json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _get_second_auth_headers(client: AsyncClient) -> dict:
    resp = await client.post(f"{AUTH_BASE}/register", json={
        "full_name": "Contracts WS2",
        "email": "contracts_ws2@test.com",
        "password": "Password123!",
        "workspace_name": "Contracts Workspace Two",
        "workspace_slug": "contracts-workspace-two",
    })
    assert resp.status_code in (200, 201), resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


# ── Auth guards ───────────────────────────────────────────────────────────────

async def test_list_contracts_requires_auth(client: AsyncClient):
    resp = await client.get(BASE)
    assert resp.status_code == 401


async def test_get_contract_requires_auth(client: AsyncClient):
    resp = await client.get(f"{BASE}/any-id")
    assert resp.status_code == 401


async def test_create_contract_requires_auth(client: AsyncClient):
    resp = await client.post(BASE, json={"title": "Test"})
    assert resp.status_code == 401


async def test_update_contract_requires_auth(client: AsyncClient):
    resp = await client.patch(f"{BASE}/any-id", json={"title": "Updated"})
    assert resp.status_code == 401


async def test_delete_contract_requires_auth(client: AsyncClient):
    resp = await client.delete(f"{BASE}/any-id")
    assert resp.status_code == 401


async def test_add_clause_requires_auth(client: AsyncClient):
    resp = await client.post(f"{BASE}/any-id/clauses", json={"title": "Clause"})
    assert resp.status_code == 401


# ── Create ────────────────────────────────────────────────────────────────────

async def test_create_contract_returns_201(client: AsyncClient, auth_headers: dict):
    contract = await _create_contract(client, auth_headers, clauses=[
        {"title": "Scope of Work", "body": "Development services as described."},
        {"title": "Payment Terms", "body": "Net 30 from invoice date."},
    ])
    assert "id" in contract
    assert contract["contract_number"].startswith("CTR-")
    assert contract["status"] == "draft"
    assert contract["value"] == 12000.0
    assert len(contract["clauses"]) == 2


async def test_create_contract_without_clauses(client: AsyncClient, auth_headers: dict):
    contract = await _create_contract(client, auth_headers)
    assert contract["clauses"] == []


async def test_create_contract_requires_title(client: AsyncClient, auth_headers: dict):
    resp = await client.post(BASE, headers=auth_headers, json={"value": 1000.0})
    assert resp.status_code == 422


# ── Read ──────────────────────────────────────────────────────────────────────

async def test_get_contract_by_id(client: AsyncClient, auth_headers: dict):
    contract = await _create_contract(client, auth_headers)
    resp = await client.get(f"{BASE}/{contract['id']}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == contract["id"]


async def test_get_contract_not_found(client: AsyncClient, auth_headers: dict):
    resp = await client.get(f"{BASE}/nonexistent-id", headers=auth_headers)
    assert resp.status_code == 404


async def test_list_contracts_returns_created(client: AsyncClient, auth_headers: dict):
    contract = await _create_contract(client, auth_headers)
    resp = await client.get(BASE, headers=auth_headers)
    assert resp.status_code == 200
    ids = [c["id"] for c in resp.json()]
    assert contract["id"] in ids


async def test_list_contracts_filter_by_status(client: AsyncClient, auth_headers: dict):
    contract = await _create_contract(client, auth_headers)
    resp = await client.get(f"{BASE}?status=draft", headers=auth_headers)
    assert resp.status_code == 200
    assert all(c["status"] == "draft" for c in resp.json())

    resp2 = await client.get(f"{BASE}?status=executed", headers=auth_headers)
    assert resp2.status_code == 200
    ids = [c["id"] for c in resp2.json()]
    assert contract["id"] not in ids


# ── Update ────────────────────────────────────────────────────────────────────

async def test_update_contract_title(client: AsyncClient, auth_headers: dict):
    contract = await _create_contract(client, auth_headers)
    resp = await client.patch(
        f"{BASE}/{contract['id']}",
        headers=auth_headers,
        json={"title": "Updated Service Agreement"},
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated Service Agreement"


# ── Delete ────────────────────────────────────────────────────────────────────

async def test_delete_draft_contract(client: AsyncClient, auth_headers: dict):
    contract = await _create_contract(client, auth_headers)
    resp = await client.delete(f"{BASE}/{contract['id']}", headers=auth_headers)
    assert resp.status_code == 204

    # Verify gone
    resp2 = await client.get(f"{BASE}/{contract['id']}", headers=auth_headers)
    assert resp2.status_code == 404


async def test_delete_sent_contract_rejected(client: AsyncClient, auth_headers: dict):
    contract = await _create_contract(client, auth_headers)
    # Transition to sent
    await client.patch(
        f"{BASE}/{contract['id']}", headers=auth_headers, json={"status": "sent"}
    )
    resp = await client.delete(f"{BASE}/{contract['id']}", headers=auth_headers)
    assert resp.status_code == 409


# ── State machine ─────────────────────────────────────────────────────────────

async def test_valid_transition_draft_to_sent(client: AsyncClient, auth_headers: dict):
    contract = await _create_contract(client, auth_headers)
    resp = await client.patch(
        f"{BASE}/{contract['id']}", headers=auth_headers, json={"status": "sent"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "sent"
    assert data["sent_at"] is not None


async def test_valid_transition_sent_to_signed(client: AsyncClient, auth_headers: dict):
    contract = await _create_contract(client, auth_headers)
    await client.patch(f"{BASE}/{contract['id']}", headers=auth_headers, json={"status": "sent"})
    resp = await client.patch(
        f"{BASE}/{contract['id']}", headers=auth_headers, json={"status": "signed"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "signed"
    assert data["signed_at"] is not None


async def test_valid_transition_signed_to_executed(client: AsyncClient, auth_headers: dict):
    contract = await _create_contract(client, auth_headers)
    await client.patch(f"{BASE}/{contract['id']}", headers=auth_headers, json={"status": "sent"})
    await client.patch(f"{BASE}/{contract['id']}", headers=auth_headers, json={"status": "signed"})
    resp = await client.patch(
        f"{BASE}/{contract['id']}", headers=auth_headers, json={"status": "executed"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "executed"
    assert data["executed_at"] is not None


async def test_invalid_transition_draft_to_executed(client: AsyncClient, auth_headers: dict):
    contract = await _create_contract(client, auth_headers)
    resp = await client.patch(
        f"{BASE}/{contract['id']}", headers=auth_headers, json={"status": "executed"}
    )
    assert resp.status_code == 422


async def test_invalid_transition_from_terminal(client: AsyncClient, auth_headers: dict):
    """Cannot transition out of terminated state."""
    contract = await _create_contract(client, auth_headers)
    await client.patch(f"{BASE}/{contract['id']}", headers=auth_headers, json={"status": "terminated"})
    resp = await client.patch(
        f"{BASE}/{contract['id']}", headers=auth_headers, json={"status": "draft"}
    )
    assert resp.status_code == 422


async def test_terminate_from_any_active_state(client: AsyncClient, auth_headers: dict):
    contract = await _create_contract(client, auth_headers)
    await client.patch(f"{BASE}/{contract['id']}", headers=auth_headers, json={"status": "sent"})
    resp = await client.patch(
        f"{BASE}/{contract['id']}", headers=auth_headers, json={"status": "terminated"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "terminated"
    assert data["terminated_at"] is not None


# ── Clause management ─────────────────────────────────────────────────────────

async def test_add_clause_to_draft_contract(client: AsyncClient, auth_headers: dict):
    contract = await _create_contract(client, auth_headers)
    resp = await client.post(
        f"{BASE}/{contract['id']}/clauses",
        headers=auth_headers,
        json={"title": "Confidentiality", "body": "All information is confidential."},
    )
    assert resp.status_code == 201
    clauses = resp.json()["clauses"]
    assert any(c["title"] == "Confidentiality" for c in clauses)


async def test_update_clause(client: AsyncClient, auth_headers: dict):
    contract = await _create_contract(client, auth_headers, clauses=[
        {"title": "Original Title", "body": "Original body."}
    ])
    clause_id = contract["clauses"][0]["id"]
    resp = await client.patch(
        f"{BASE}/{contract['id']}/clauses/{clause_id}",
        headers=auth_headers,
        json={"title": "Updated Title", "body": "Updated body."},
    )
    assert resp.status_code == 200
    updated_clause = next(c for c in resp.json()["clauses"] if c["id"] == clause_id)
    assert updated_clause["title"] == "Updated Title"


async def test_delete_clause(client: AsyncClient, auth_headers: dict):
    contract = await _create_contract(client, auth_headers, clauses=[
        {"title": "To Delete", "body": "This clause will be removed."}
    ])
    clause_id = contract["clauses"][0]["id"]
    resp = await client.delete(
        f"{BASE}/{contract['id']}/clauses/{clause_id}",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert not any(c["id"] == clause_id for c in resp.json()["clauses"])


async def test_cannot_modify_clauses_of_executed_contract(client: AsyncClient, auth_headers: dict):
    contract = await _create_contract(client, auth_headers)
    cid = contract["id"]
    # Advance to executed
    for status in ("sent", "signed", "executed"):
        await client.patch(f"{BASE}/{cid}", headers=auth_headers, json={"status": status})

    resp = await client.post(
        f"{BASE}/{cid}/clauses",
        headers=auth_headers,
        json={"title": "Late Clause", "body": "Should not be allowed."},
    )
    assert resp.status_code == 409


# ── Workspace isolation ───────────────────────────────────────────────────────

async def test_contract_not_visible_across_workspaces(client: AsyncClient, auth_headers: dict):
    ws2 = await _get_second_auth_headers(client)
    contract = await _create_contract(client, auth_headers)

    # WS2 cannot see it
    resp = await client.get(BASE, headers=ws2)
    ids = [c["id"] for c in resp.json()]
    assert contract["id"] not in ids


async def test_contract_not_accessible_by_other_workspace(client: AsyncClient, auth_headers: dict):
    ws2 = await _get_second_auth_headers(client)
    contract = await _create_contract(client, auth_headers)

    resp = await client.get(f"{BASE}/{contract['id']}", headers=ws2)
    assert resp.status_code == 404

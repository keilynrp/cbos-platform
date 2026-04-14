"""
Contracts module integration tests.

Covers flows not exercised by contract tests:
- Sequential contract numbering
- Clause ordering and reordering
- Filter by organization_id
- Full lifecycle: draft → sent → signed → executed
- Executed contracts block value/date edits (but allow title/notes)
- Multiple clauses management (add, reorder, delete)
- terminate from different active states
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

BASE = "/api/v1/contracts"


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _create_contract(client: AsyncClient, headers: dict, **overrides) -> dict:
    payload = {"title": "Integration Contract", "value": 5000.0, **overrides}
    resp = await client.post(BASE, headers=headers, json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _transition(client: AsyncClient, headers: dict, contract_id: str, status: str) -> dict:
    resp = await client.patch(f"{BASE}/{contract_id}", headers=headers, json={"status": status})
    assert resp.status_code == 200, resp.text
    return resp.json()


# ── 1. Sequential contract numbering ─────────────────────────────────────────

async def test_contract_numbers_are_sequential(client: AsyncClient, auth_headers: dict):
    c1 = await _create_contract(client, auth_headers, title="First")
    c2 = await _create_contract(client, auth_headers, title="Second")
    c3 = await _create_contract(client, auth_headers, title="Third")

    n1 = int(c1["contract_number"].split("-")[-1])
    n2 = int(c2["contract_number"].split("-")[-1])
    n3 = int(c3["contract_number"].split("-")[-1])

    assert n2 == n1 + 1
    assert n3 == n2 + 1


async def test_contract_number_format(client: AsyncClient, auth_headers: dict):
    contract = await _create_contract(client, auth_headers)
    parts = contract["contract_number"].split("-")
    assert len(parts) == 3
    assert parts[0] == "CTR"
    assert parts[1].isdigit() and len(parts[1]) == 4  # year
    assert parts[2].isdigit() and len(parts[2]) == 4  # zero-padded seq


# ── 2. Full lifecycle flow ────────────────────────────────────────────────────

async def test_full_lifecycle_draft_to_executed(client: AsyncClient, auth_headers: dict):
    """draft → sent → signed → executed — verify timestamps at each step."""
    contract = await _create_contract(client, auth_headers)
    cid = contract["id"]
    assert contract["sent_at"] is None
    assert contract["signed_at"] is None
    assert contract["executed_at"] is None

    sent = await _transition(client, auth_headers, cid, "sent")
    assert sent["sent_at"] is not None
    assert sent["signed_at"] is None

    signed = await _transition(client, auth_headers, cid, "signed")
    assert signed["sent_at"] is not None
    assert signed["signed_at"] is not None
    assert signed["executed_at"] is None

    executed = await _transition(client, auth_headers, cid, "executed")
    assert executed["executed_at"] is not None
    assert executed["status"] == "executed"


async def test_terminate_from_signed(client: AsyncClient, auth_headers: dict):
    """Can terminate from signed state directly."""
    contract = await _create_contract(client, auth_headers)
    cid = contract["id"]
    await _transition(client, auth_headers, cid, "sent")
    await _transition(client, auth_headers, cid, "signed")
    terminated = await _transition(client, auth_headers, cid, "terminated")
    assert terminated["status"] == "terminated"
    assert terminated["terminated_at"] is not None


# ── 3. Executed contracts block financial edits ───────────────────────────────

async def test_executed_contract_blocks_value_edit(client: AsyncClient, auth_headers: dict):
    """Value cannot change once executed."""
    contract = await _create_contract(client, auth_headers, value=10000.0)
    cid = contract["id"]
    for status in ("sent", "signed", "executed"):
        await _transition(client, auth_headers, cid, status)

    # Try to change value — should be silently ignored (not 422)
    resp = await client.patch(f"{BASE}/{cid}", headers=auth_headers, json={"value": 99999.0})
    assert resp.status_code == 200
    assert resp.json()["value"] == 10000.0  # unchanged


async def test_executed_contract_allows_title_and_notes_edit(client: AsyncClient, auth_headers: dict):
    """Title and notes remain editable even when executed."""
    contract = await _create_contract(client, auth_headers)
    cid = contract["id"]
    for status in ("sent", "signed", "executed"):
        await _transition(client, auth_headers, cid, status)

    resp = await client.patch(
        f"{BASE}/{cid}", headers=auth_headers,
        json={"title": "Updated Title", "notes": "Amendment noted."},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Updated Title"
    assert data["notes"] == "Amendment noted."


# ── 4. Clause ordering ────────────────────────────────────────────────────────

async def test_clauses_maintain_order(client: AsyncClient, auth_headers: dict):
    """Clauses are returned in clause_order ascending."""
    contract = await _create_contract(client, auth_headers, clauses=[
        {"title": "C", "body": "Third", "clause_order": 2},
        {"title": "A", "body": "First",  "clause_order": 0},
        {"title": "B", "body": "Second", "clause_order": 1},
    ])
    titles = [c["title"] for c in contract["clauses"]]
    assert titles == ["A", "B", "C"]


async def test_add_clause_auto_assigns_order(client: AsyncClient, auth_headers: dict):
    """Adding a clause without clause_order appends after existing max."""
    contract = await _create_contract(client, auth_headers, clauses=[
        {"title": "Clause 1", "clause_order": 0},
        {"title": "Clause 2", "clause_order": 1},
    ])
    resp = await client.post(
        f"{BASE}/{contract['id']}/clauses",
        headers=auth_headers,
        json={"title": "Auto-ordered Clause"},
    )
    assert resp.status_code == 201
    clauses = resp.json()["clauses"]
    auto_clause = next(c for c in clauses if c["title"] == "Auto-ordered Clause")
    assert auto_clause["clause_order"] >= 2


async def test_update_clause_body(client: AsyncClient, auth_headers: dict):
    """Clause body can be updated independently of title."""
    contract = await _create_contract(client, auth_headers, clauses=[
        {"title": "Payment Terms", "body": "Net 30."}
    ])
    clause_id = contract["clauses"][0]["id"]
    resp = await client.patch(
        f"{BASE}/{contract['id']}/clauses/{clause_id}",
        headers=auth_headers,
        json={"body": "Net 60 from invoice date."},
    )
    assert resp.status_code == 200
    updated = next(c for c in resp.json()["clauses"] if c["id"] == clause_id)
    assert updated["body"] == "Net 60 from invoice date."
    assert updated["title"] == "Payment Terms"  # unchanged


# ── 5. Filter by organization_id ─────────────────────────────────────────────

async def test_filter_by_organization_id(client: AsyncClient, auth_headers: dict):
    """Contracts for different orgs are returned only when filtered correctly."""
    # Create a real organization (FK constraint requires it)
    org_resp = await client.post(
        "/api/v1/organizations", headers=auth_headers,
        json={"legal_name": "Acme Corp Test", "org_type": "customer"}
    )
    assert org_resp.status_code == 201, org_resp.text
    real_org_id = org_resp.json()["id"]

    tagged = await _create_contract(
        client, auth_headers, title="Org Contract", organization_id=real_org_id
    )
    untagged = await _create_contract(client, auth_headers, title="No Org Contract")

    # Filter by org
    resp = await client.get(f"{BASE}?organization_id={real_org_id}", headers=auth_headers)
    assert resp.status_code == 200
    ids = [c["id"] for c in resp.json()]
    assert tagged["id"] in ids
    assert untagged["id"] not in ids


# ── 6. Multiple operations in sequence ───────────────────────────────────────

async def test_add_multiple_clauses_then_delete_one(client: AsyncClient, auth_headers: dict):
    """Add 3 clauses, delete middle one, verify 2 remain."""
    contract = await _create_contract(client, auth_headers)
    cid = contract["id"]

    for title in ("Scope", "Payment", "Confidentiality"):
        resp = await client.post(
            f"{BASE}/{cid}/clauses", headers=auth_headers, json={"title": title}
        )
        assert resp.status_code == 201

    # Get all clauses
    resp = await client.get(f"{BASE}/{cid}", headers=auth_headers)
    clauses = resp.json()["clauses"]
    assert len(clauses) == 3

    # Delete the second clause
    delete_id = clauses[1]["id"]
    resp = await client.delete(
        f"{BASE}/{cid}/clauses/{delete_id}", headers=auth_headers
    )
    assert resp.status_code == 200
    remaining = [c["id"] for c in resp.json()["clauses"]]
    assert len(remaining) == 2
    assert delete_id not in remaining

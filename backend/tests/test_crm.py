"""
CRM module integration tests.
Covers: leads CRUD, lead convert, opportunity stage machine, pipeline summary.
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

BASE = "/api/v1/crm"


# ── Leads ─────────────────────────────────────────────────────────────────────

async def test_create_lead_returns_201(client: AsyncClient, auth_headers: dict):
    resp = await client.post(f"{BASE}/leads", headers=auth_headers, json={
        "first_name": "Alice",
        "last_name": "Smith",
        "email": "alice@example.com",
        "source": "website",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["first_name"] == "Alice"
    assert data["status"] == "new"


async def test_list_leads_scoped_to_workspace(client: AsyncClient, auth_headers: dict):
    # Create a lead first
    await client.post(f"{BASE}/leads", headers=auth_headers, json={
        "first_name": "Bob",
        "source": "manual",
    })
    resp = await client.get(f"{BASE}/leads", headers=auth_headers)
    assert resp.status_code == 200
    leads = resp.json()
    assert isinstance(leads, list)
    assert len(leads) >= 1


async def test_list_leads_filter_by_status(client: AsyncClient, auth_headers: dict):
    await client.post(f"{BASE}/leads", headers=auth_headers, json={
        "first_name": "Carol", "source": "manual",
    })
    resp = await client.get(f"{BASE}/leads?status=new", headers=auth_headers)
    assert resp.status_code == 200
    for lead in resp.json():
        assert lead["status"] == "new"


async def test_convert_lead_creates_opportunity(client: AsyncClient, auth_headers: dict):
    # Create lead
    resp = await client.post(f"{BASE}/leads", headers=auth_headers, json={
        "first_name": "Dave", "source": "referral",
    })
    lead_id = resp.json()["id"]

    # Convert
    resp = await client.post(f"{BASE}/leads/{lead_id}/convert", headers=auth_headers, json={
        "title": "Dave's Deal",
        "value": 5000.0,
    })
    assert resp.status_code == 201
    opp = resp.json()
    assert opp["title"] == "Dave's Deal"
    assert opp["stage"] == "new"


async def test_convert_already_converted_lead_returns_409(client: AsyncClient, auth_headers: dict):
    resp = await client.post(f"{BASE}/leads", headers=auth_headers, json={
        "first_name": "Eve", "source": "manual",
    })
    lead_id = resp.json()["id"]
    await client.post(f"{BASE}/leads/{lead_id}/convert", headers=auth_headers, json={
        "title": "Eve Deal",
    })
    # Second convert
    resp = await client.post(f"{BASE}/leads/{lead_id}/convert", headers=auth_headers, json={
        "title": "Eve Deal 2",
    })
    assert resp.status_code == 409


# ── Opportunities ─────────────────────────────────────────────────────────────

async def _create_opp(client: AsyncClient, auth_headers: dict, title: str = "Test Opp") -> dict:
    resp = await client.post(f"{BASE}/opportunities", headers=auth_headers, json={
        "title": title,
        "stage": "new",
        "value": 10000.0,
    })
    assert resp.status_code == 201
    return resp.json()


async def test_create_opportunity_returns_201(client: AsyncClient, auth_headers: dict):
    opp = await _create_opp(client, auth_headers)
    assert opp["stage"] == "new"


async def test_opportunity_valid_stage_transition(client: AsyncClient, auth_headers: dict):
    opp = await _create_opp(client, auth_headers, "Stage Test")
    opp_id = opp["id"]

    # new → qualified
    resp = await client.patch(f"{BASE}/opportunities/{opp_id}/stage", headers=auth_headers, json={
        "stage": "qualified",
    })
    assert resp.status_code == 200
    assert resp.json()["stage"] == "qualified"


async def test_opportunity_invalid_stage_transition_returns_422(client: AsyncClient, auth_headers: dict):
    opp = await _create_opp(client, auth_headers, "Invalid Transition")
    opp_id = opp["id"]

    # new → won (invalid — must go through qualified/proposal/negotiation)
    resp = await client.patch(f"{BASE}/opportunities/{opp_id}/stage", headers=auth_headers, json={
        "stage": "won",
    })
    assert resp.status_code == 422


async def test_stage_lost_without_lost_reason_returns_422(client: AsyncClient, auth_headers: dict):
    opp = await _create_opp(client, auth_headers, "No Reason")
    opp_id = opp["id"]

    resp = await client.patch(f"{BASE}/opportunities/{opp_id}/stage", headers=auth_headers, json={
        "stage": "lost",
        # no lost_reason
    })
    assert resp.status_code == 422


async def test_stage_lost_with_lost_reason_succeeds(client: AsyncClient, auth_headers: dict):
    opp = await _create_opp(client, auth_headers, "Lost With Reason")
    opp_id = opp["id"]

    resp = await client.patch(f"{BASE}/opportunities/{opp_id}/stage", headers=auth_headers, json={
        "stage": "lost",
        "lost_reason": "Budget constraints",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["stage"] == "lost"
    assert data["lost_reason"] == "Budget constraints"


async def test_pipeline_summary(client: AsyncClient, auth_headers: dict):
    await _create_opp(client, auth_headers, "Summary Opp 1")
    await _create_opp(client, auth_headers, "Summary Opp 2")

    resp = await client.get(f"{BASE}/pipeline/summary", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_opportunities" in data
    assert data["total_opportunities"] >= 2

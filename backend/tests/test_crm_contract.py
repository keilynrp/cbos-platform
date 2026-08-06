"""
CRM module — contract completeness tests (Sprint 2).
Covers: auth guards, get/update by ID, source filter, full stage traversal,
        activities CRUD, workspace isolation.

Complements test_crm.py (basic flows) with endpoint coverage gaps
identified in IMPLEMENTATION_ALIGNMENT.md.
"""

import logging
from unittest.mock import patch

import pytest
from httpx import AsyncClient

from app.modules.crm import service as crm_service
from app.modules.identity.models import PublicSite

pytestmark = pytest.mark.asyncio

BASE = "/api/v1/crm"


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _create_lead(
    client: AsyncClient, headers: dict, first_name: str = "Test", source: str = "manual"
) -> dict:
    resp = await client.post(f"{BASE}/leads", headers=headers, json={
        "first_name": first_name,
        "source": source,
    })
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _create_opp(
    client: AsyncClient,
    headers: dict,
    title: str = "Test Opp",
    value: float = 5000.0,
) -> dict:
    resp = await client.post(f"{BASE}/opportunities", headers=headers, json={
        "title": title,
        "stage": "new",
        "value": value,
    })
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _create_public_site(session_factory, workspace_id: str, site_slug: str = "inbounduxd") -> PublicSite:
    async with session_factory() as db:
        site = PublicSite(
            workspace_id=workspace_id,
            site_slug=site_slug,
            domain=f"{site_slug}.example.com",
            api_key=f"{site_slug}-public-key",
            allowed_origins=[f"https://{site_slug}.example.com"],
            is_active=True,
        )
        db.add(site)
        await db.commit()
        await db.refresh(site)
        return site


async def _change_stage(
    client: AsyncClient,
    headers: dict,
    opp_id: str,
    stage: str,
    lost_reason: str | None = None,
) -> dict:
    body: dict = {"stage": stage}
    if lost_reason:
        body["lost_reason"] = lost_reason
    resp = await client.patch(
        f"{BASE}/opportunities/{opp_id}/stage", headers=headers, json=body
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


async def _advance_to(
    client: AsyncClient, headers: dict, opp_id: str, target: str
) -> None:
    """Advance opportunity through the stage machine up to (and including) target."""
    path = ["new", "qualified", "proposal", "negotiation", "won"]
    for stage in path[1:]:  # skip "new" (starting state)
        await _change_stage(client, headers, opp_id, stage)
        if stage == target:
            break


# ── Auth guards ───────────────────────────────────────────────────────────────

async def test_leads_list_requires_auth(client: AsyncClient):
    resp = await client.get(f"{BASE}/leads")
    assert resp.status_code == 401


async def test_opportunities_list_requires_auth(client: AsyncClient):
    resp = await client.get(f"{BASE}/opportunities")
    assert resp.status_code == 401


async def test_activities_list_requires_auth(client: AsyncClient):
    resp = await client.get(f"{BASE}/activities")
    assert resp.status_code == 401


async def test_pipeline_summary_requires_auth(client: AsyncClient):
    resp = await client.get(f"{BASE}/pipeline/summary")
    assert resp.status_code == 401


async def test_public_lead_create_requires_site_key(client: AsyncClient):
    resp = await client.post(
        f"{BASE}/public/leads",
        headers={"Origin": "https://inbounduxd.example.com"},
        json={"first_name": "Kei", "email": "kei@example.com"},
    )
    assert resp.status_code == 401


async def test_public_lead_create_rejects_disallowed_origin(
    client: AsyncClient, session_factory, workspace
):
    site = await _create_public_site(session_factory, workspace.id)
    resp = await client.post(
        f"{BASE}/public/leads",
        headers={
            "X-CBOS-Site-Key": site.api_key,
            "Origin": "https://evil.example.com",
        },
        json={"first_name": "Kei", "email": "kei@example.com"},
    )
    assert resp.status_code == 403


async def test_public_lead_create_creates_workspace_scoped_lead(
    client: AsyncClient, session_factory, workspace, auth_headers: dict
):
    site = await _create_public_site(session_factory, workspace.id)
    resp = await client.post(
        f"{BASE}/public/leads",
        headers={
            "X-CBOS-Site-Key": site.api_key,
            "Origin": "https://inbounduxd.example.com",
        },
        json={
            "first_name": "Kei",
            "email": "kei@example.com",
            "company_name": "InboundUXD",
            "form_id": "hero-form",
            "source_page": "https://inbounduxd.example.com/ai-diagnostic",
        },
    )
    assert resp.status_code == 201, resp.text
    payload = resp.json()
    assert payload["status"] == "new"
    assert payload["source"] == "website:inbounduxd"

    leads_resp = await client.get(f"{BASE}/leads?source=website:inbounduxd", headers=auth_headers)
    assert leads_resp.status_code == 200
    leads = leads_resp.json()
    assert len(leads) == 1
    assert leads[0]["id"] == payload["id"]
    assert leads[0]["email"] == "kei@example.com"


async def test_public_lead_create_emits_site_metadata_event(
    client: AsyncClient, session_factory, workspace
):
    site = await _create_public_site(session_factory, workspace.id)
    published_events = []

    async def capture_event(event):
        published_events.append(event)

    with patch("app.modules.crm.service.publish_event", side_effect=capture_event):
        resp = await client.post(
            f"{BASE}/public/leads",
            headers={
                "X-CBOS-Site-Key": site.api_key,
                "Origin": "https://inbounduxd.example.com",
            },
            json={
                "first_name": "Kei",
                "email": "kei@example.com",
                "form_id": "hero-form",
                "source_page": "https://inbounduxd.example.com/ai-diagnostic",
            },
        )

    assert resp.status_code == 201, resp.text
    lead_events = [e for e in published_events if e.event_type == "LeadCaptured"]
    assert len(lead_events) == 1
    event = lead_events[0]
    assert event.source_module == "crm"
    assert event.workspace_id == workspace.id
    assert event.actor_id is None
    assert event.payload["source"] == "website:inbounduxd"
    assert event.payload["site_slug"] == "inbounduxd"
    assert event.payload["form_id"] == "hero-form"
    assert event.payload["source_page"] == "https://inbounduxd.example.com/ai-diagnostic"
    assert event.payload["public_intake"] is True


async def test_public_lead_create_idempotency_returns_same_lead(
    client: AsyncClient, session_factory, workspace, auth_headers: dict
):
    site = await _create_public_site(session_factory, workspace.id)
    headers = {
        "X-CBOS-Site-Key": site.api_key,
        "Origin": "https://inbounduxd.example.com",
        "Idempotency-Key": "lead-001",
    }
    body = {"first_name": "Kei", "email": "kei@example.com"}

    first = await client.post(f"{BASE}/public/leads", headers=headers, json=body)
    second = await client.post(f"{BASE}/public/leads", headers=headers, json=body)

    assert first.status_code == 201, first.text
    assert second.status_code == 200, second.text
    assert first.json()["id"] == second.json()["id"]

    leads_resp = await client.get(f"{BASE}/leads?source=website:inbounduxd", headers=auth_headers)
    assert len(leads_resp.json()) == 1


async def test_public_lead_create_idempotency_conflicts_on_different_payload(
    client: AsyncClient, session_factory, workspace
):
    site = await _create_public_site(session_factory, workspace.id)
    headers = {
        "X-CBOS-Site-Key": site.api_key,
        "Origin": "https://inbounduxd.example.com",
        "Idempotency-Key": "lead-001",
    }

    first = await client.post(
        f"{BASE}/public/leads",
        headers=headers,
        json={"first_name": "Kei", "email": "kei@example.com"},
    )
    assert first.status_code == 201, first.text

    second = await client.post(
        f"{BASE}/public/leads",
        headers=headers,
        json={"first_name": "Different", "email": "different@example.com"},
    )
    assert second.status_code == 409, second.text
    assert second.json()["error"]["code"] == "CRM_PUBLIC_INTAKE_IDEMPOTENCY_CONFLICT"


async def test_public_lead_create_rate_limit_returns_retry_after(
    client: AsyncClient, session_factory, workspace, monkeypatch
):
    site = await _create_public_site(session_factory, workspace.id)
    crm_service._public_rate_limit_buckets.clear()
    monkeypatch.setattr(crm_service.settings, "public_site_rate_limit_per_minute", 1)
    headers = {
        "X-CBOS-Site-Key": site.api_key,
        "Origin": "https://inbounduxd.example.com",
    }

    first = await client.post(
        f"{BASE}/public/leads",
        headers=headers,
        json={"first_name": "Kei", "email": "kei@example.com"},
    )
    second = await client.post(
        f"{BASE}/public/leads",
        headers=headers,
        json={"first_name": "Another", "email": "another@example.com"},
    )

    assert first.status_code == 201, first.text
    assert second.status_code == 429, second.text
    # La cabecera y el sobre de error tienen que convivir: CBOSException pasa
    # `headers` y el handler los propaga. Sin eso, migrar el shape se llevaba
    # por delante el Retry-After sin que nada lo notara.
    assert second.headers["retry-after"] == "60"
    assert second.json()["error"]["code"] == "CRM_PUBLIC_INTAKE_RATE_LIMITED"
    assert second.json()["error"]["detail"]["retry_after_seconds"] == 60
    crm_service._public_rate_limit_buckets.clear()


async def test_public_lead_create_logs_rejected_origin(
    client: AsyncClient, session_factory, workspace, caplog
):
    site = await _create_public_site(session_factory, workspace.id)

    with caplog.at_level(logging.INFO, logger="app.modules.crm.service"):
        resp = await client.post(
            f"{BASE}/public/leads",
            headers={
                "X-CBOS-Site-Key": site.api_key,
                "Origin": "https://evil.example.com",
            },
            json={"first_name": "Kei", "email": "kei@example.com"},
        )

    assert resp.status_code == 403
    assert "public_lead_intake outcome=rejected" in caplog.text
    assert "site_slug=inbounduxd" in caplog.text
    assert "reason=origin_not_allowed" in caplog.text

    error = resp.json()["error"]
    assert error["code"] == "CRM_PUBLIC_SITE_ORIGIN_NOT_ALLOWED"
    assert error["detail"]["origin"] == "https://evil.example.com"


async def test_public_lead_create_missing_site_key_error_shape(
    client: AsyncClient, session_factory, workspace
):
    resp = await client.post(
        f"{BASE}/public/leads",
        headers={"Origin": "https://inbounduxd.example.com"},
        json={"first_name": "Kei", "email": "kei@example.com"},
    )

    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "CRM_PUBLIC_SITE_KEY_INVALID"


# ── Leads — get and update by ID ─────────────────────────────────────────────

async def test_get_lead_by_id_returns_correct_lead(
    client: AsyncClient, auth_headers: dict
):
    lead = await _create_lead(client, auth_headers, first_name="Retrieve Me")
    resp = await client.get(f"{BASE}/leads/{lead['id']}", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == lead["id"]
    assert data["first_name"] == "Retrieve Me"


async def test_get_lead_not_found_returns_404(client: AsyncClient, auth_headers: dict):
    resp = await client.get(
        f"{BASE}/leads/00000000-0000-0000-0000-000000000000", headers=auth_headers
    )
    assert resp.status_code == 404


async def test_update_lead_patches_fields(client: AsyncClient, auth_headers: dict):
    lead = await _create_lead(client, auth_headers, first_name="Original")
    resp = await client.patch(
        f"{BASE}/leads/{lead['id']}",
        headers=auth_headers,
        json={"first_name": "Updated", "email": "updated@example.com"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["first_name"] == "Updated"
    assert data["email"] == "updated@example.com"


async def test_update_lead_returns_unchanged_fields(
    client: AsyncClient, auth_headers: dict
):
    lead = await _create_lead(client, auth_headers, first_name="Stable", source="website")
    resp = await client.patch(
        f"{BASE}/leads/{lead['id']}",
        headers=auth_headers,
        json={"first_name": "Changed"},
    )
    assert resp.status_code == 200
    # source was not patched — must remain intact
    assert resp.json()["source"] == "website"


async def test_list_leads_filter_by_source(client: AsyncClient, auth_headers: dict):
    await _create_lead(client, auth_headers, first_name="Web Lead", source="website")
    await _create_lead(client, auth_headers, first_name="Manual Lead", source="manual")
    resp = await client.get(f"{BASE}/leads?source=website", headers=auth_headers)
    assert resp.status_code == 200
    leads = resp.json()
    assert len(leads) >= 1
    assert all(lead["source"] == "website" for lead in leads)


# ── Opportunities — get and update by ID ─────────────────────────────────────

async def test_get_opportunity_by_id_returns_correct_opp(
    client: AsyncClient, auth_headers: dict
):
    opp = await _create_opp(client, auth_headers, title="Find Me")
    resp = await client.get(f"{BASE}/opportunities/{opp['id']}", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == opp["id"]
    assert data["title"] == "Find Me"


async def test_get_opportunity_not_found_returns_404(
    client: AsyncClient, auth_headers: dict
):
    resp = await client.get(
        f"{BASE}/opportunities/00000000-0000-0000-0000-000000000000",
        headers=auth_headers,
    )
    assert resp.status_code == 404


async def test_update_opportunity_patches_fields(
    client: AsyncClient, auth_headers: dict
):
    opp = await _create_opp(client, auth_headers, title="Before Update", value=1000.0)
    resp = await client.patch(
        f"{BASE}/opportunities/{opp['id']}",
        headers=auth_headers,
        json={"title": "After Update", "value": 9999.0},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "After Update"
    assert data["value"] == 9999.0


async def test_list_opportunities_filter_by_stage(
    client: AsyncClient, auth_headers: dict
):
    await _create_opp(client, auth_headers, title="Stays New")
    opp = await _create_opp(client, auth_headers, title="Goes Qualified")
    await _change_stage(client, auth_headers, opp["id"], "qualified")

    resp = await client.get(f"{BASE}/opportunities?stage=qualified", headers=auth_headers)
    assert resp.status_code == 200
    opps = resp.json()
    assert len(opps) >= 1
    assert all(o["stage"] == "qualified" for o in opps)


# ── Stage machine — full traversal ───────────────────────────────────────────

async def test_full_stage_traversal_new_to_won(
    client: AsyncClient, auth_headers: dict
):
    opp = await _create_opp(client, auth_headers, title="Journey to Won")
    opp_id = opp["id"]

    data = await _change_stage(client, auth_headers, opp_id, "qualified")
    assert data["stage"] == "qualified"

    data = await _change_stage(client, auth_headers, opp_id, "proposal")
    assert data["stage"] == "proposal"

    data = await _change_stage(client, auth_headers, opp_id, "negotiation")
    assert data["stage"] == "negotiation"

    data = await _change_stage(client, auth_headers, opp_id, "won")
    assert data["stage"] == "won"
    assert data["won_at"] is not None


async def test_full_stage_traversal_new_to_lost(
    client: AsyncClient, auth_headers: dict
):
    opp = await _create_opp(client, auth_headers, title="Journey to Lost")
    opp_id = opp["id"]

    await _change_stage(client, auth_headers, opp_id, "qualified")
    await _change_stage(client, auth_headers, opp_id, "proposal")

    data = await _change_stage(
        client, auth_headers, opp_id, "lost", lost_reason="No budget"
    )
    assert data["stage"] == "lost"
    assert data["lost_reason"] == "No budget"
    assert data["lost_at"] is not None


async def test_won_opportunity_cannot_transition_to_any_stage(
    client: AsyncClient, auth_headers: dict
):
    opp = await _create_opp(client, auth_headers, title="Already Won")
    opp_id = opp["id"]
    await _advance_to(client, auth_headers, opp_id, "won")

    resp = await client.patch(
        f"{BASE}/opportunities/{opp_id}/stage",
        headers=auth_headers,
        json={"stage": "negotiation"},
    )
    assert resp.status_code == 422


# ── Activities ────────────────────────────────────────────────────────────────

async def test_create_activity_returns_201(client: AsyncClient, auth_headers: dict):
    lead = await _create_lead(client, auth_headers, first_name="Activity Lead")
    resp = await client.post(f"{BASE}/activities", headers=auth_headers, json={
        "entity_type": "lead",
        "entity_id": lead["id"],
        "activity_type": "call",
        "title": "First call",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["entity_type"] == "lead"
    assert data["entity_id"] == lead["id"]
    assert data["activity_type"] == "call"
    assert data["title"] == "First call"
    assert data["completed_at"] is None   # not yet completed
    assert "id" in data


async def test_list_activities_returns_list(client: AsyncClient, auth_headers: dict):
    lead = await _create_lead(client, auth_headers, first_name="List Lead")
    await client.post(f"{BASE}/activities", headers=auth_headers, json={
        "entity_type": "lead",
        "entity_id": lead["id"],
        "activity_type": "email",
        "title": "Follow-up email",
    })
    resp = await client.get(f"{BASE}/activities", headers=auth_headers)
    assert resp.status_code == 200
    activities = resp.json()
    assert isinstance(activities, list)
    assert len(activities) >= 1


async def test_list_activities_filter_by_entity_returns_only_matching(
    client: AsyncClient, auth_headers: dict
):
    lead_a = await _create_lead(client, auth_headers, first_name="Lead A")
    lead_b = await _create_lead(client, auth_headers, first_name="Lead B")

    for lead, subject in ((lead_a, "Call A"), (lead_b, "Call B")):
        await client.post(f"{BASE}/activities", headers=auth_headers, json={
            "entity_type": "lead",
            "entity_id": lead["id"],
            "activity_type": "call",
            "title": subject,
        })

    resp = await client.get(
        f"{BASE}/activities?entity_type=lead&entity_id={lead_a['id']}",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    activities = resp.json()
    assert len(activities) == 1
    assert activities[0]["entity_id"] == lead_a["id"]
    assert activities[0]["title"] == "Call A"


async def test_complete_activity_marks_completed_true(
    client: AsyncClient, auth_headers: dict
):
    lead = await _create_lead(client, auth_headers, first_name="Complete Lead")
    create_resp = await client.post(f"{BASE}/activities", headers=auth_headers, json={
        "entity_type": "lead",
        "entity_id": lead["id"],
        "activity_type": "meeting",
        "title": "Kickoff meeting",
    })
    activity_id = create_resp.json()["id"]

    resp = await client.patch(
        f"{BASE}/activities/{activity_id}/complete", headers=auth_headers
    )
    assert resp.status_code == 200
    assert resp.json()["completed_at"] is not None  # marked done


async def test_activities_on_opportunity_entity(
    client: AsyncClient, auth_headers: dict
):
    opp = await _create_opp(client, auth_headers, title="Opp with Activity")
    resp = await client.post(f"{BASE}/activities", headers=auth_headers, json={
        "entity_type": "opportunity",
        "entity_id": opp["id"],
        "activity_type": "call",
        "title": "Product demo call",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["entity_type"] == "opportunity"
    assert data["entity_id"] == opp["id"]


# ── Workspace isolation ───────────────────────────────────────────────────────

async def _register_workspace(client: AsyncClient, slug: str, email: str) -> dict:
    resp = await client.post("/api/v1/auth/register", json={
        "full_name": "Isolated User",
        "email": email,
        "password": "securepassIso123",
        "workspace_name": f"Isolated Corp {slug}",
        "workspace_slug": slug,
    })
    assert resp.status_code == 201, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


async def test_leads_not_visible_across_workspaces(
    client: AsyncClient, auth_headers: dict
):
    await _create_lead(client, auth_headers, first_name="Workspace A Lead")

    headers_b = await _register_workspace(
        client, "iso-leads-b", "iso-leads-b@isolation.example.com"
    )
    resp = await client.get(f"{BASE}/leads", headers=headers_b)
    assert resp.status_code == 200
    assert resp.json() == []


async def test_opportunities_not_visible_across_workspaces(
    client: AsyncClient, auth_headers: dict
):
    await _create_opp(client, auth_headers, title="Private Opportunity")

    headers_b = await _register_workspace(
        client, "iso-opps-b", "iso-opps-b@isolation.example.com"
    )
    resp = await client.get(f"{BASE}/opportunities", headers=headers_b)
    assert resp.status_code == 200
    assert resp.json() == []

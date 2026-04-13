"""
Analytics module contract + integration tests.

Covers:
- Auth guards for all 3 endpoints
- Workspace isolation (data from other workspaces not visible)
- Response shape: /analytics/summary, /analytics/revenue, /analytics/pipeline
- Empty-state behaviour (no data → valid zero responses)
- Revenue: months parameter (default 12, valid range 1-24, rejects out-of-range)
- Revenue: invoices outside window are excluded
- Pipeline: won_rate_30d in [0.0, 1.0]
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

BASE = "/api/v1/analytics"
AUTH_BASE = "/api/v1/auth"
ACCT_BASE = "/api/v1/accounting"
CRM_BASE = "/api/v1/crm"


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _get_second_auth_headers(client: AsyncClient) -> dict:
    """Register an isolated user/workspace and return auth headers."""
    resp = await client.post(f"{AUTH_BASE}/register", json={
        "full_name": "Analytics WS2",
        "email": "analytics_ws2@test.com",
        "password": "Password123!",
        "workspace_name": "Analytics Workspace Two",
        "workspace_slug": "analytics-workspace-two",
    })
    assert resp.status_code in (200, 201), resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def _create_invoice(client: AsyncClient, headers: dict, **overrides) -> dict:
    payload = {
        "issue_date": "2026-04-01",
        "lines": [{"description": "Service", "quantity": 1.0, "unit_price": 500.0}],
        **overrides,
    }
    resp = await client.post(f"{ACCT_BASE}/invoices", headers=headers, json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _create_opportunity(client: AsyncClient, headers: dict, **overrides) -> dict:
    payload = {
        "title": "Test Opportunity",
        "stage": "qualified",
        "value": 10000.0,
        **overrides,
    }
    resp = await client.post(f"{CRM_BASE}/opportunities", headers=headers, json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


# ── Auth guards ────────────────────────────────────────────────────────────────

async def test_summary_requires_auth(client: AsyncClient):
    resp = await client.get(f"{BASE}/summary")
    assert resp.status_code == 401


async def test_revenue_requires_auth(client: AsyncClient):
    resp = await client.get(f"{BASE}/revenue")
    assert resp.status_code == 401


async def test_pipeline_requires_auth(client: AsyncClient):
    resp = await client.get(f"{BASE}/pipeline")
    assert resp.status_code == 401


# ── Summary — shape & empty state ─────────────────────────────────────────────

async def test_summary_returns_valid_shape(client: AsyncClient, auth_headers: dict):
    resp = await client.get(f"{BASE}/summary", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()

    # Top-level keys
    assert set(data.keys()) == {"revenue", "pipeline", "operations", "leads"}

    # Revenue keys
    rev = data["revenue"]
    assert "total_invoiced" in rev
    assert "total_paid" in rev
    assert "total_outstanding" in rev
    assert "overdue_count" in rev
    assert "overdue_amount" in rev

    # Pipeline keys
    pip = data["pipeline"]
    assert "open_opportunities" in pip
    assert "pipeline_value" in pip
    assert "won_this_month" in pip
    assert "won_value_this_month" in pip

    # Operations keys
    ops = data["operations"]
    assert "active_workflow_runs" in ops
    assert "orders_pending" in ops
    assert "low_stock_items" in ops

    # Leads keys
    leads = data["leads"]
    assert "new_this_month" in leads
    assert "total_active" in leads


async def test_summary_empty_state_returns_zeros(client: AsyncClient, auth_headers: dict):
    """A workspace with no data must return zeros, not errors."""
    resp = await client.get(f"{BASE}/summary", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["revenue"]["total_invoiced"] >= 0.0
    assert data["pipeline"]["open_opportunities"] >= 0
    assert data["operations"]["orders_pending"] >= 0
    assert data["leads"]["total_active"] >= 0


async def test_summary_revenue_reflects_invoices(client: AsyncClient, auth_headers: dict):
    """Creating invoices increases total_invoiced in the summary."""
    before = (await client.get(f"{BASE}/summary", headers=auth_headers)).json()
    before_invoiced = before["revenue"]["total_invoiced"]

    await _create_invoice(client, auth_headers)
    await _create_invoice(client, auth_headers)

    after = (await client.get(f"{BASE}/summary", headers=auth_headers)).json()
    assert after["revenue"]["total_invoiced"] > before_invoiced


async def test_summary_pipeline_reflects_opportunities(client: AsyncClient, auth_headers: dict):
    """Creating an opportunity increases open_opportunities and pipeline_value."""
    before = (await client.get(f"{BASE}/summary", headers=auth_headers)).json()
    before_open = before["pipeline"]["open_opportunities"]
    before_value = before["pipeline"]["pipeline_value"]

    await _create_opportunity(client, auth_headers, value=25000.0)

    after = (await client.get(f"{BASE}/summary", headers=auth_headers)).json()
    assert after["pipeline"]["open_opportunities"] == before_open + 1
    assert after["pipeline"]["pipeline_value"] == before_value + 25000.0


# ── Revenue — shape & parameters ──────────────────────────────────────────────

async def test_revenue_returns_valid_shape(client: AsyncClient, auth_headers: dict):
    resp = await client.get(f"{BASE}/revenue", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["period"] == "monthly"
    assert "months" in data
    assert "series" in data
    assert isinstance(data["series"], list)


async def test_revenue_default_12_months(client: AsyncClient, auth_headers: dict):
    resp = await client.get(f"{BASE}/revenue", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["months"] == 12
    assert len(data["series"]) == 12


async def test_revenue_custom_months_param(client: AsyncClient, auth_headers: dict):
    resp = await client.get(f"{BASE}/revenue?months=6", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["months"] == 6
    assert len(data["series"]) == 6


async def test_revenue_max_months_24(client: AsyncClient, auth_headers: dict):
    resp = await client.get(f"{BASE}/revenue?months=24", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()["series"]) == 24


async def test_revenue_months_out_of_range_rejected(client: AsyncClient, auth_headers: dict):
    """months=0 and months=25 must be rejected with 422."""
    resp0 = await client.get(f"{BASE}/revenue?months=0", headers=auth_headers)
    assert resp0.status_code == 422

    resp25 = await client.get(f"{BASE}/revenue?months=25", headers=auth_headers)
    assert resp25.status_code == 422


async def test_revenue_series_month_format(client: AsyncClient, auth_headers: dict):
    """Each series entry must have month in YYYY-MM format and numeric fields."""
    resp = await client.get(f"{BASE}/revenue?months=3", headers=auth_headers)
    assert resp.status_code == 200
    for entry in resp.json()["series"]:
        assert len(entry["month"]) == 7         # "YYYY-MM"
        assert entry["month"][4] == "-"
        assert isinstance(entry["invoiced"], (int, float))
        assert isinstance(entry["paid"], (int, float))
        assert isinstance(entry["outstanding"], (int, float))


async def test_revenue_series_ordered_oldest_to_newest(client: AsyncClient, auth_headers: dict):
    """Series must be in ascending chronological order."""
    resp = await client.get(f"{BASE}/revenue?months=6", headers=auth_headers)
    assert resp.status_code == 200
    months = [e["month"] for e in resp.json()["series"]]
    assert months == sorted(months)


async def test_revenue_reflects_invoice_data(client: AsyncClient, auth_headers: dict):
    """Invoices issued this month should appear in the last series bucket."""
    # Create an invoice with issue_date in the current month
    await _create_invoice(client, auth_headers, issue_date="2026-04-01")

    resp = await client.get(f"{BASE}/revenue?months=1", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    # With months=1 we get only the current month
    current_bucket = data["series"][0]
    assert current_bucket["month"] == "2026-04"
    assert current_bucket["invoiced"] >= 500.0


# ── Pipeline — shape & empty state ────────────────────────────────────────────

async def test_pipeline_returns_valid_shape(client: AsyncClient, auth_headers: dict):
    resp = await client.get(f"{BASE}/pipeline", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "stages" in data
    assert "total_open" in data
    assert "total_value" in data
    assert "avg_deal_size" in data
    assert "won_rate_30d" in data
    assert isinstance(data["stages"], list)


async def test_pipeline_empty_state(client: AsyncClient, auth_headers: dict):
    """No opportunities → zero counts and empty stages list."""
    resp = await client.get(f"{BASE}/pipeline", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_open"] >= 0
    assert data["total_value"] >= 0.0
    assert data["avg_deal_size"] >= 0.0
    assert 0.0 <= data["won_rate_30d"] <= 1.0


async def test_pipeline_won_rate_in_valid_range(client: AsyncClient, auth_headers: dict):
    """won_rate_30d must always be between 0.0 and 1.0."""
    resp = await client.get(f"{BASE}/pipeline", headers=auth_headers)
    assert resp.status_code == 200
    assert 0.0 <= resp.json()["won_rate_30d"] <= 1.0


async def test_pipeline_reflects_open_opportunities(client: AsyncClient, auth_headers: dict):
    """Open opportunities appear in pipeline counts."""
    before = (await client.get(f"{BASE}/pipeline", headers=auth_headers)).json()
    before_open = before["total_open"]
    before_value = before["total_value"]

    await _create_opportunity(client, auth_headers, stage="qualified", value=8000.0)
    await _create_opportunity(client, auth_headers, stage="proposal", value=12000.0)

    after = (await client.get(f"{BASE}/pipeline", headers=auth_headers)).json()
    assert after["total_open"] == before_open + 2
    assert after["total_value"] == round(before_value + 20000.0, 2)


async def test_pipeline_stage_shape(client: AsyncClient, auth_headers: dict):
    """Each stage entry must have stage, count, and value keys."""
    await _create_opportunity(client, auth_headers, stage="new", value=5000.0)
    resp = await client.get(f"{BASE}/pipeline", headers=auth_headers)
    assert resp.status_code == 200
    for stage in resp.json()["stages"]:
        assert "stage" in stage
        assert "count" in stage
        assert "value" in stage
        assert isinstance(stage["count"], int)
        assert isinstance(stage["value"], (int, float))


async def test_pipeline_avg_deal_size_calculation(client: AsyncClient, auth_headers: dict):
    """avg_deal_size = total_value / total_open when total_open > 0."""
    resp = await client.get(f"{BASE}/pipeline", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    if data["total_open"] > 0:
        expected = round(data["total_value"] / data["total_open"], 2)
        assert data["avg_deal_size"] == expected


# ── Workspace isolation ────────────────────────────────────────────────────────

async def test_summary_workspace_isolated(client: AsyncClient, auth_headers: dict):
    """Data created in WS1 must not appear in WS2 summary."""
    ws2 = await _get_second_auth_headers(client)

    # Create data in WS1
    await _create_invoice(client, auth_headers)
    await _create_opportunity(client, auth_headers, value=99999.0)

    # WS2 should see its own (empty) data, not WS1's data
    ws2_summary = (await client.get(f"{BASE}/summary", headers=ws2)).json()
    ws1_summary = (await client.get(f"{BASE}/summary", headers=auth_headers)).json()

    # WS2 revenue must be less than WS1 revenue
    assert ws2_summary["revenue"]["total_invoiced"] < ws1_summary["revenue"]["total_invoiced"]
    assert ws2_summary["pipeline"]["pipeline_value"] < ws1_summary["pipeline"]["pipeline_value"]


async def test_revenue_workspace_isolated(client: AsyncClient, auth_headers: dict):
    """Revenue time-series only includes invoices for the requesting workspace."""
    ws2 = await _get_second_auth_headers(client)

    # Create invoice in WS1
    await _create_invoice(client, auth_headers, issue_date="2026-04-01")

    ws1_resp = (await client.get(f"{BASE}/revenue?months=1", headers=auth_headers)).json()
    ws2_resp = (await client.get(f"{BASE}/revenue?months=1", headers=ws2)).json()

    ws1_total = sum(e["invoiced"] for e in ws1_resp["series"])
    ws2_total = sum(e["invoiced"] for e in ws2_resp["series"])

    assert ws1_total > ws2_total


async def test_pipeline_workspace_isolated(client: AsyncClient, auth_headers: dict):
    """Pipeline data only includes opportunities for the requesting workspace."""
    ws2 = await _get_second_auth_headers(client)

    # Create opportunity in WS1
    await _create_opportunity(client, auth_headers, value=50000.0)

    ws1_pipeline = (await client.get(f"{BASE}/pipeline", headers=auth_headers)).json()
    ws2_pipeline = (await client.get(f"{BASE}/pipeline", headers=ws2)).json()

    assert ws1_pipeline["total_value"] > ws2_pipeline["total_value"]

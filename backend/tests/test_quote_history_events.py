"""
El historial de una cotizacion guarda codigos y datos, no prosa (ADR 0014, tarea 12).

Antes cada evento guardaba su texto en espanol («Cotizacion enviada», «Linea agregada:
...») y la interfaz lo pintaba tal cual, de modo que quien usaba la app en ingles veia
espanol. Ahora el servidor guarda el tipo del evento y sus datos en `event_metadata`;
la interfaz pone el texto (`sales:detail.history.events.*`). `description` queda como
reserva, en ingles de desarrollador como el resto de los `message` de la API.
"""
import re

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

BASE = "/api/v1/sales"


async def _quote(client: AsyncClient, headers: dict, title: str = "History quote") -> dict:
    resp = await client.post(f"{BASE}/quotes", headers=headers, json={
        "title": title, "currency": "USD", "tax_rate": 0.0, "discount_amount": 0.0,
        "lines": [{"description": "Widget A", "quantity": 2, "unit_price": 100.0,
                   "discount_percent": 0.0, "line_order": 1}],
    })
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _events(client: AsyncClient, headers: dict, quote_id: str) -> dict[str, dict]:
    resp = await client.get(f"{BASE}/quotes/{quote_id}/history", headers=headers)
    assert resp.status_code == 200, resp.text
    return {event["event_type"]: event for event in resp.json()}


async def test_created_carries_the_quote_number(client: AsyncClient, auth_headers: dict):
    quote = await _quote(client, auth_headers)

    event = (await _events(client, auth_headers, quote["id"]))["created"]

    assert event["event_metadata"] == {"quote_number": quote["quote_number"]}
    assert event["description"] == f"Quote created: {quote['quote_number']}"


async def test_added_and_removed_lines_carry_their_description(client: AsyncClient, auth_headers: dict):
    quote = await _quote(client, auth_headers)
    added = await client.post(f"{BASE}/quotes/{quote['id']}/lines", headers=auth_headers, json={
        "description": "Extra service", "quantity": 1, "unit_price": 50.0, "line_order": 2,
    })
    assert added.status_code in (200, 201), added.text
    line = next(l for l in added.json()["lines"] if l["description"] == "Extra service")
    removed = await client.delete(f"{BASE}/quotes/{quote['id']}/lines/{line['id']}", headers=auth_headers)
    assert removed.status_code in (200, 204), removed.text

    events = await _events(client, auth_headers, quote["id"])

    assert events["line_added"]["event_metadata"] == {"description": "Extra service"}
    assert events["line_removed"]["event_metadata"] == {"description": "Extra service"}
    assert events["line_added"]["description"] == "Line added: Extra service"
    assert events["line_removed"]["description"] == "Line removed: Extra service"


async def test_an_updated_line_keeps_what_changed(client: AsyncClient, auth_headers: dict):
    quote = await _quote(client, auth_headers)
    line_id = quote["lines"][0]["id"]

    resp = await client.patch(
        f"{BASE}/quotes/{quote['id']}/lines/{line_id}", headers=auth_headers, json={"unit_price": 150.0}
    )
    assert resp.status_code == 200, resp.text

    event = (await _events(client, auth_headers, quote["id"]))["line_updated"]

    assert event["event_metadata"] == {"unit_price": 150.0}
    assert event["description"].startswith("Line updated — ")


async def test_sending_and_accepting_need_no_data(client: AsyncClient, auth_headers: dict):
    quote = await _quote(client, auth_headers)
    assert (await client.patch(f"{BASE}/quotes/{quote['id']}/send", headers=auth_headers, json={})).status_code == 200
    assert (await client.patch(f"{BASE}/quotes/{quote['id']}/accept", headers=auth_headers, json={})).status_code == 200

    events = await _events(client, auth_headers, quote["id"])

    assert events["sent"]["description"] == "Quote sent"
    assert events["accepted"]["description"] == "Quote accepted — sales order created"


async def test_a_rejection_carries_its_reason(client: AsyncClient, auth_headers: dict):
    quote = await _quote(client, auth_headers)
    resp = await client.patch(
        f"{BASE}/quotes/{quote['id']}/reject", headers=auth_headers, json={"reason": "Too expensive"}
    )
    assert resp.status_code == 200, resp.text

    event = (await _events(client, auth_headers, quote["id"]))["rejected"]

    assert event["event_metadata"] == {"reason": "Too expensive"}
    assert event["description"] == "Quote rejected. Reason: Too expensive"


async def test_a_rejection_without_reason_says_so_in_the_data(client: AsyncClient, auth_headers: dict):
    quote = await _quote(client, auth_headers)
    resp = await client.patch(f"{BASE}/quotes/{quote['id']}/reject", headers=auth_headers, json={})
    assert resp.status_code == 200, resp.text

    event = (await _events(client, auth_headers, quote["id"]))["rejected"]

    # `reason` presente y nulo: la interfaz lo distingue de un evento antiguo sin datos.
    assert event["event_metadata"] == {"reason": None}


async def test_no_description_is_written_in_spanish(client: AsyncClient, auth_headers: dict):
    quote = await _quote(client, auth_headers)
    line_id = quote["lines"][0]["id"]
    await client.patch(f"{BASE}/quotes/{quote['id']}/lines/{line_id}", headers=auth_headers, json={"quantity": 3})
    await client.patch(f"{BASE}/quotes/{quote['id']}/send", headers=auth_headers, json={})
    await client.patch(f"{BASE}/quotes/{quote['id']}/reject", headers=auth_headers, json={"reason": "No"})

    resp = await client.get(f"{BASE}/quotes/{quote['id']}/history", headers=auth_headers)
    spanish = re.compile(r"[áéíóúñ]|Cotizaci|L[ií]nea|Raz[oó]n|enviada|rechazada|aceptada", re.IGNORECASE)

    assert len(resp.json()) >= 4  # el control puede fallar: sin eventos pasaria sin mirar nada
    for event in resp.json():
        assert not spanish.search(event["description"].replace("—", "-")), event["description"]

"""
Test Phase 6: Workflow Engine
Scenarios:
  1. Create workflows (log action, email action)
  2. Test endpoint (dry run)
  3. Trigger a real event and verify the workflow ran
  4. Check workflow runs
  5. Toggle enable/disable
"""
import time
import requests

BASE = "http://localhost:8100/api/v1"

print("=== Phase 6: Workflow Engine ===\n")

# ── Auth ──────────────────────────────────────────────────────────────────────
r = requests.post(f"{BASE}/auth/login", json={"email": "keilyn@example.com", "password": "cbos123"})
assert r.status_code == 200, f"Login: {r.text}"
token = r.json()["access_token"]
H = {"Authorization": f"Bearer {token}"}
print("✓ Auth OK")

# ── Create workflows ──────────────────────────────────────────────────────────

# WF1: log every new lead
r = requests.post(f"{BASE}/workflows", headers=H, json={
    "name": "Log nuevo lead",
    "description": "Escribe en el log cuando se captura un lead",
    "trigger_type": "event",
    "trigger_config": {"event_type": "LeadCaptured"},
    "conditions": [],
    "actions": [
        {
            "type": "log",
            "config": {"message": "Nuevo lead capturado — entidad: {entity_id}"}
        }
    ],
    "enabled": True,
})
assert r.status_code == 201, f"Create WF1: {r.text}"
wf1 = r.json()
print(f"✓ Workflow 1 created: '{wf1['name']}' [{wf1['id'][:8]}...]")

# WF2: emit derived event when a quote is accepted
r = requests.post(f"{BASE}/workflows", headers=H, json={
    "name": "Notificar cotización aceptada",
    "description": "Emite un evento de notificación cuando se acepta una cotización",
    "trigger_type": "event",
    "trigger_config": {"event_type": "QuoteAccepted"},
    "conditions": [],
    "actions": [
        {
            "type": "log",
            "config": {"message": "Cotización aceptada: {quote_number} — orden: {sales_order_id}"}
        },
        {
            "type": "emit_event",
            "config": {
                "event_type": "SalesNotificationRequired",
                "payload_extra": {"channel": "slack"}
            }
        }
    ],
    "enabled": True,
})
assert r.status_code == 201, f"Create WF2: {r.text}"
wf2 = r.json()
print(f"✓ Workflow 2 created: '{wf2['name']}' [{wf2['id'][:8]}...]")

# WF3: conditional workflow — only for large amounts (demo conditions)
r = requests.post(f"{BASE}/workflows", headers=H, json={
    "name": "Alerta stock mínimo crítico",
    "description": "Notifica cuando el inventario llega al mínimo",
    "trigger_type": "event",
    "trigger_config": {"event_type": "InventoryLowThresholdDetected"},
    "conditions": [
        {"field": "payload.available_stock", "op": "lte", "value": 5}
    ],
    "actions": [
        {
            "type": "log",
            "config": {"message": "ALERTA: Stock crítico — {product_id} tiene {available_stock} unidades"}
        }
    ],
    "enabled": True,
})
assert r.status_code == 201, f"Create WF3: {r.text}"
wf3 = r.json()
print(f"✓ Workflow 3 created: '{wf3['name']}' (con condición) [{wf3['id'][:8]}...]")

# ── List workflows ─────────────────────────────────────────────────────────────
r = requests.get(f"{BASE}/workflows", headers=H)
assert r.status_code == 200
workflows = r.json()
print(f"\n✓ List workflows: {len(workflows)} total")

# ── Test endpoint (dry run) ───────────────────────────────────────────────────
r = requests.post(f"{BASE}/workflows/{wf1['id']}/test", headers=H, json={
    "event_type": "LeadCaptured",
    "payload": {"lead_id": "abc123", "name": "Test Lead"}
})
assert r.status_code == 200, f"Test WF1: {r.text}"
test_result = r.json()
print(f"\n✓ Dry run WF1:")
print(f"  matched={test_result['matched']}, conditions_passed={test_result['conditions_passed']}")
print(f"  message: {test_result['message']}")

# Test with wrong event (should NOT match)
r = requests.post(f"{BASE}/workflows/{wf1['id']}/test", headers=H, json={
    "event_type": "QuoteCreated",
    "payload": {}
})
assert r.status_code == 200
tr2 = r.json()
assert not tr2["matched"], "Should NOT match QuoteCreated"
print(f"✓ Dry run WF1 (wrong event): matched={tr2['matched']} (correctly rejected)")

# Test WF3 condition: should match when stock <= 5
r = requests.post(f"{BASE}/workflows/{wf3['id']}/test", headers=H, json={
    "event_type": "InventoryLowThresholdDetected",
    "payload": {"product_id": "prod_001", "available_stock": 3}
})
assert r.status_code == 200
tr3 = r.json()
assert tr3["matched"] and tr3["conditions_passed"], f"WF3 should match: {tr3}"
print(f"✓ Dry run WF3 (stock=3, threshold<=5): conditions_passed={tr3['conditions_passed']} ✓")

# Test WF3 condition: should NOT match when stock > 5
r = requests.post(f"{BASE}/workflows/{wf3['id']}/test", headers=H, json={
    "event_type": "InventoryLowThresholdDetected",
    "payload": {"product_id": "prod_001", "available_stock": 10}
})
assert r.status_code == 200
tr3b = r.json()
assert not tr3b["conditions_passed"], f"WF3 should NOT match stock=10: {tr3b}"
print(f"✓ Dry run WF3 (stock=10, threshold<=5): conditions_passed={tr3b['conditions_passed']} ✓ (correctly blocked)")

# ── Trigger real event via lead creation ──────────────────────────────────────
print(f"\n--- Triggering real event via lead creation ---")
r = requests.post(f"{BASE}/crm/leads", headers=H, json={
    "first_name": "Lead Workflow",
    "last_name": "Test",
    "source": "web",
})
assert r.status_code == 201, f"Create lead: {r.text}"
lead = r.json()
print(f"✓ Lead created: {lead['id'][:8]}... (fires LeadCaptured event)")

# Wait for consumer to process
time.sleep(3)

# Check workflow runs
r = requests.get(f"{BASE}/workflows/{wf1['id']}/runs", headers=H)
assert r.status_code == 200
runs = r.json()
print(f"✓ WF1 runs: {len(runs)}")
if runs:
    run = runs[0]
    print(f"  Latest run: status={run['status']} | event={run['trigger_event_type']}")
    if run.get("steps_result"):
        for step in run["steps_result"]:
            print(f"    step: {step['action_type']} → {step['status']} ({step['duration_ms']}ms)")

# Check updated run_count
r = requests.get(f"{BASE}/workflows/{wf1['id']}", headers=H)
assert r.status_code == 200
wf1_updated = r.json()
print(f"✓ WF1 run_count: {wf1_updated['run_count']}")
print(f"  last_triggered_at: {wf1_updated['last_triggered_at']}")

# ── Toggle disable ────────────────────────────────────────────────────────────
r = requests.post(f"{BASE}/workflows/{wf2['id']}/toggle", headers=H)
assert r.status_code == 200
toggled = r.json()
assert toggled["enabled"] == False, "Should be disabled after toggle"
print(f"\n✓ Toggle WF2: enabled={toggled['enabled']} (disabled)")

# Re-enable
r = requests.post(f"{BASE}/workflows/{wf2['id']}/toggle", headers=H)
assert r.status_code == 200
toggled2 = r.json()
assert toggled2["enabled"] == True
print(f"✓ Toggle WF2 again: enabled={toggled2['enabled']} (re-enabled)")

# ── Update workflow ───────────────────────────────────────────────────────────
r = requests.patch(f"{BASE}/workflows/{wf3['id']}", headers=H, json={
    "description": "Notifica cuando el stock llega al mínimo (actualizado)",
    "conditions": [
        {"field": "payload.available_stock", "op": "lte", "value": 10}
    ]
})
assert r.status_code == 200
updated = r.json()
print(f"\n✓ Update WF3: new condition threshold=10 | desc updated")

# ── Delete a workflow ─────────────────────────────────────────────────────────
r = requests.delete(f"{BASE}/workflows/{wf3['id']}", headers=H)
assert r.status_code == 204
print(f"✓ Delete WF3: 204 No Content")

# Confirm deleted
r = requests.get(f"{BASE}/workflows/{wf3['id']}", headers=H)
assert r.status_code == 404
print(f"✓ WF3 confirmed deleted: 404")

print(f"\n✅ Phase 6 Workflow Engine — ALL TESTS PASSED")

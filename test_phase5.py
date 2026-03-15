"""
Test Phase 5: Solution Discovery Engine
"""
import requests

BASE = "http://localhost:8100/api/v1"

# ── Auth ──────────────────────────────────────────────────────────────────────
print("=== Phase 5: Solution Discovery Engine ===\n")

# Login
r = requests.post(f"{BASE}/auth/login", json={"email": "keilyn@example.com", "password": "cbos123"})
assert r.status_code == 200, f"Login failed: {r.text}"
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print("✓ Auth OK")

# Get workspace
r = requests.get(f"{BASE}/workspaces/me", headers=headers)
assert r.status_code == 200, f"Workspace failed: {r.text}"
workspace_id = r.json()["id"]
print(f"✓ Workspace: {workspace_id[:8]}...")

# ── Capabilities catalog ──────────────────────────────────────────────────────
r = requests.get(f"{BASE}/discovery/capabilities", headers=headers)
assert r.status_code == 200
caps = r.json()["capabilities"]
print(f"✓ Capabilities catalog: {len(caps)} capabilities")

r = requests.get(f"{BASE}/discovery/packages", headers=headers)
assert r.status_code == 200
pkgs = r.json()["packages"]
print(f"✓ Solution packages: {list(pkgs.keys())}")

# ── Create discovery session ──────────────────────────────────────────────────
r = requests.post(f"{BASE}/discovery/sessions", headers=headers, json={
    "business_description": "Somos una empresa de servicios de tecnología",
    "industry": "technology",
    "company_size": "small",
})
assert r.status_code == 201, f"Create session failed: {r.text}"
session = r.json()
session_id = session["id"]
print(f"\n✓ Discovery session created: {session_id[:8]}...")
print(f"  Status: {session['status']}")

# ── Chat conversation ─────────────────────────────────────────────────────────
messages = [
    "Somos una empresa de 15 personas. Vendemos software y consultoría. Nuestro mayor problema es el seguimiento de prospectos y la generación de cotizaciones profesionales.",
    "También tenemos problemas con el inventario de licencias y el proceso de aprobación de cotizaciones con los clientes.",
    "Actualmente usamos Excel para todo, y perdemos mucho tiempo en cotizaciones y seguimiento de pipeline de ventas.",
]

for i, msg in enumerate(messages, 1):
    r = requests.post(
        f"{BASE}/discovery/sessions/{session_id}/messages",
        headers=headers,
        json={"content": msg}
    )
    assert r.status_code == 200, f"Message {i} failed: {r.text}"
    resp = r.json()
    print(f"\n✓ Message {i} sent")
    print(f"  User: {msg[:60]}...")
    print(f"  Assistant: {resp['message']['content'][:120]}...")
    print(f"  Session status: {resp['session']['status']}")

# ── Generate blueprint ────────────────────────────────────────────────────────
r = requests.post(
    f"{BASE}/discovery/sessions/{session_id}/generate-blueprint",
    headers=headers
)
assert r.status_code == 200, f"Blueprint failed: {r.text}"
bp = r.json()
print(f"\n✓ Blueprint generated!")
print(f"  Recommended package: {bp['recommended_package']}")
print(f"  Capabilities matched: {len(bp['matched_capabilities'])}")
for cap in bp['matched_capabilities'][:4]:
    print(f"    - {cap['name']} ({cap['module']})")
print(f"  Summary: {bp['blueprint'].get('executive_summary', '')[:120]}...")

# ── Apply blueprint ───────────────────────────────────────────────────────────
r = requests.post(
    f"{BASE}/discovery/sessions/{session_id}/apply",
    headers=headers
)
assert r.status_code == 200, f"Apply failed: {r.text}"
result = r.json()
print(f"\n✓ Blueprint applied!")
print(f"  Success: {result['success']}")
print(f"  Message: {result['message']}")
print(f"  Activated modules: {result['activated_modules']}")

# ── List sessions ─────────────────────────────────────────────────────────────
r = requests.get(f"{BASE}/discovery/sessions", headers=headers)
assert r.status_code == 200
sessions = r.json()
print(f"\n✓ Sessions list: {len(sessions)} session(s)")
for s in sessions:
    print(f"  - {s['id'][:8]}... | {s['status']} | pkg:{s['recommended_package']}")

print("\n✅ Phase 5 Solution Discovery Engine — ALL TESTS PASSED")

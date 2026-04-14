"""
HR module integration tests.

Covers flows not exercised by contract tests:
- Sequential employee numbering
- Department → employee relationship
- Filter combinations (status + department, status + employment_type)
- Employee lifecycle with department assignment/change
- Delete department unlinking employees (not cascade delete)
- Multiple employees in same department
- Status transitions reset timestamps correctly
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

EMP_BASE  = "/api/v1/employees"
DEPT_BASE = "/api/v1/departments"


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _create_dept(client: AsyncClient, headers: dict, name: str = "Engineering") -> dict:
    resp = await client.post(DEPT_BASE, headers=headers, json={"name": name})
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _create_emp(client: AsyncClient, headers: dict, full_name: str = "Ana Torres", **kw) -> dict:
    resp = await client.post(EMP_BASE, headers=headers, json={"full_name": full_name, **kw})
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _transition(client: AsyncClient, headers: dict, emp_id: str, status: str) -> dict:
    resp = await client.patch(f"{EMP_BASE}/{emp_id}", headers=headers, json={"status": status})
    assert resp.status_code == 200, resp.text
    return resp.json()


# ── 1. Sequential employee numbering ─────────────────────────────────────────

async def test_employee_numbers_are_sequential(client: AsyncClient, auth_headers: dict):
    e1 = await _create_emp(client, auth_headers, full_name="First Employee")
    e2 = await _create_emp(client, auth_headers, full_name="Second Employee")
    e3 = await _create_emp(client, auth_headers, full_name="Third Employee")

    n1 = int(e1["employee_number"].split("-")[-1])
    n2 = int(e2["employee_number"].split("-")[-1])
    n3 = int(e3["employee_number"].split("-")[-1])

    assert n2 == n1 + 1
    assert n3 == n2 + 1


async def test_employee_number_format(client: AsyncClient, auth_headers: dict):
    emp = await _create_emp(client, auth_headers)
    parts = emp["employee_number"].split("-")
    assert len(parts) == 3
    assert parts[0] == "EMP"
    assert parts[1].isdigit() and len(parts[1]) == 4  # year
    assert parts[2].isdigit() and len(parts[2]) == 4  # zero-padded seq


# ── 2. Department → employee relationship ────────────────────────────────────

async def test_employees_in_department_visible_via_filter(client: AsyncClient, auth_headers: dict):
    dept = await _create_dept(client, auth_headers, name="Product")
    e1 = await _create_emp(client, auth_headers, full_name="PM Alice", department_id=dept["id"])
    e2 = await _create_emp(client, auth_headers, full_name="PM Bob",   department_id=dept["id"])
    e3 = await _create_emp(client, auth_headers, full_name="No Dept")  # no department

    resp = await client.get(f"{EMP_BASE}?department_id={dept['id']}", headers=auth_headers)
    ids = [e["id"] for e in resp.json()]
    assert e1["id"] in ids
    assert e2["id"] in ids
    assert e3["id"] not in ids


async def test_employee_can_change_department(client: AsyncClient, auth_headers: dict):
    d1 = await _create_dept(client, auth_headers, name="Design")
    d2 = await _create_dept(client, auth_headers, name="Engineering")
    emp = await _create_emp(client, auth_headers, department_id=d1["id"])
    assert emp["department_id"] == d1["id"]

    # Move to d2
    resp = await client.patch(
        f"{EMP_BASE}/{emp['id']}", headers=auth_headers, json={"department_id": d2["id"]}
    )
    assert resp.status_code == 200
    assert resp.json()["department_id"] == d2["id"]


async def test_delete_department_unlinks_employees(client: AsyncClient, auth_headers: dict):
    """Deleting a dept should NOT delete its employees — only unlink them."""
    dept = await _create_dept(client, auth_headers, name="Temp Dept")
    emp = await _create_emp(client, auth_headers, department_id=dept["id"])

    # Delete dept
    await client.delete(f"{DEPT_BASE}/{dept['id']}", headers=auth_headers)

    # Employee still exists, department_id is now null
    resp = await client.get(f"{EMP_BASE}/{emp['id']}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["department_id"] is None


# ── 3. Filter combinations ────────────────────────────────────────────────────

async def test_filter_by_status_and_employment_type(client: AsyncClient, auth_headers: dict):
    """Filters compose: status=active + employment_type=contractor."""
    ft = await _create_emp(client, auth_headers, full_name="FT Active",  employment_type="full_time")
    ct = await _create_emp(client, auth_headers, full_name="CT Active",  employment_type="contractor")

    # Terminate the full_time employee
    await _transition(client, auth_headers, ft["id"], "terminated")

    resp = await client.get(
        f"{EMP_BASE}?status=active&employment_type=contractor", headers=auth_headers
    )
    ids = [e["id"] for e in resp.json()]
    assert ct["id"] in ids
    assert ft["id"] not in ids


async def test_filter_employment_type_returns_correct_subset(client: AsyncClient, auth_headers: dict):
    await _create_emp(client, auth_headers, full_name="Intern A",  employment_type="intern")
    await _create_emp(client, auth_headers, full_name="Intern B",  employment_type="intern")
    await _create_emp(client, auth_headers, full_name="FT Worker", employment_type="full_time")

    resp = await client.get(f"{EMP_BASE}?employment_type=intern", headers=auth_headers)
    assert resp.status_code == 200
    assert all(e["employment_type"] == "intern" for e in resp.json())
    assert len(resp.json()) >= 2


# ── 4. Status transitions and timestamp semantics ─────────────────────────────

async def test_on_leave_sets_timestamp_returning_clears_it(client: AsyncClient, auth_headers: dict):
    emp = await _create_emp(client, auth_headers)
    eid = emp["id"]

    on_leave = await _transition(client, auth_headers, eid, "on_leave")
    assert on_leave["on_leave_since"] is not None

    returned = await _transition(client, auth_headers, eid, "active")
    assert returned["status"] == "active"
    assert returned["on_leave_since"] is None  # cleared on return


async def test_terminate_sets_terminated_at(client: AsyncClient, auth_headers: dict):
    emp = await _create_emp(client, auth_headers)
    terminated = await _transition(client, auth_headers, emp["id"], "terminated")
    assert terminated["terminated_at"] is not None
    assert terminated["status"] == "terminated"


async def test_terminated_employee_appears_in_status_filter(client: AsyncClient, auth_headers: dict):
    emp = await _create_emp(client, auth_headers, full_name="Departing Employee")
    await _transition(client, auth_headers, emp["id"], "terminated")

    resp = await client.get(f"{EMP_BASE}?status=terminated", headers=auth_headers)
    ids = [e["id"] for e in resp.json()]
    assert emp["id"] in ids

    # Should NOT appear in active filter
    resp2 = await client.get(f"{EMP_BASE}?status=active", headers=auth_headers)
    ids2 = [e["id"] for e in resp2.json()]
    assert emp["id"] not in ids2


# ── 5. Terminal employees block field edits ───────────────────────────────────

async def test_terminated_employee_blocks_employment_type_edit(client: AsyncClient, auth_headers: dict):
    emp = await _create_emp(client, auth_headers, employment_type="full_time")
    await _transition(client, auth_headers, emp["id"], "terminated")

    resp = await client.patch(
        f"{EMP_BASE}/{emp['id']}", headers=auth_headers, json={"employment_type": "contractor"}
    )
    assert resp.status_code == 200
    assert resp.json()["employment_type"] == "full_time"  # unchanged


async def test_terminated_employee_allows_notes_edit(client: AsyncClient, auth_headers: dict):
    """Notes can still be added to terminated employees (exit interview notes, etc.)."""
    emp = await _create_emp(client, auth_headers)
    await _transition(client, auth_headers, emp["id"], "terminated")

    resp = await client.patch(
        f"{EMP_BASE}/{emp['id']}", headers=auth_headers, json={"notes": "Exit interview: positive."}
    )
    assert resp.status_code == 200
    assert resp.json()["notes"] == "Exit interview: positive."


# ── 6. Multiple departments ───────────────────────────────────────────────────

async def test_list_departments_returns_all(client: AsyncClient, auth_headers: dict):
    for name in ("Marketing", "Sales", "Engineering", "Finance"):
        await _create_dept(client, auth_headers, name=name)

    resp = await client.get(DEPT_BASE, headers=auth_headers)
    assert resp.status_code == 200
    names = [d["name"] for d in resp.json()]
    for name in ("Marketing", "Sales", "Engineering", "Finance"):
        assert name in names


async def test_departments_sorted_alphabetically(client: AsyncClient, auth_headers: dict):
    for name in ("Zebra", "Alpha", "Middle"):
        await _create_dept(client, auth_headers, name=name)

    resp = await client.get(DEPT_BASE, headers=auth_headers)
    names = [d["name"] for d in resp.json()]
    assert names == sorted(names)

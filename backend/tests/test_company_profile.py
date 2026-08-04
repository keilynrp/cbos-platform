"""Tests for the invoice issuer profile (CompanyProfile)."""

import base64
import uuid
from datetime import date

import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.modules.accounting import service
from app.modules.accounting.models import CompanyProfile, Invoice
from app.modules.accounting.schemas import CompanyProfileUpdate
from app.modules.identity.models import Organization, Person, Workspace


def _data_uri(n_bytes: int, mime: str = "image/png") -> str:
    payload = base64.b64encode(b"x" * n_bytes).decode()
    return f"data:{mime};base64,{payload}"


async def _make_invoice(db, workspace_id, **kwargs):
    inv = Invoice(
        workspace_id=workspace_id,
        invoice_number="INV-2026-0001",
        status="draft",
        issue_date=date(2026, 8, 3),
        currency="USD",
        **kwargs,
    )
    db.add(inv)
    await db.commit()
    await db.refresh(inv)
    return inv


class TestCompanyProfileModel:
    @pytest.mark.asyncio
    async def test_can_persist_a_profile(self, db, workspace):
        profile = CompanyProfile(
            workspace_id=workspace.id,
            legal_name="Compania Ejemplo S.A. de C.V.",
            tax_id="ABC010203XYZ",
            tax_id_label="RFC",
            city="Ciudad de Mexico",
        )
        db.add(profile)
        await db.commit()

        result = await db.execute(
            select(CompanyProfile).where(CompanyProfile.workspace_id == workspace.id)
        )
        saved = result.scalar_one()
        assert saved.legal_name == "Compania Ejemplo S.A. de C.V."
        assert saved.tax_id_label == "RFC"
        assert saved.default_currency == "USD"
        assert saved.default_tax_rate == 0.0
        assert saved.logo_data_uri is None

    @pytest.mark.asyncio
    async def test_one_profile_per_workspace(self, db, workspace):
        db.add(CompanyProfile(workspace_id=workspace.id, legal_name="Primera"))
        await db.commit()

        db.add(CompanyProfile(workspace_id=workspace.id, legal_name="Segunda"))
        with pytest.raises(IntegrityError):
            await db.commit()


class TestCompanyProfileSchema:
    def test_all_fields_optional(self):
        dto = CompanyProfileUpdate()
        assert dto.legal_name is None
        assert dto.model_fields_set == set()

    def test_distinguishes_absent_from_explicit_null(self):
        """Clearing the logo must be distinguishable from not touching it."""
        absent = CompanyProfileUpdate(legal_name="Acme")
        assert "logo_data_uri" not in absent.model_fields_set

        cleared = CompanyProfileUpdate(logo_data_uri=None)
        assert "logo_data_uri" in cleared.model_fields_set
        assert cleared.logo_data_uri is None

    def test_rejects_tax_rate_above_100(self):
        with pytest.raises(ValidationError):
            CompanyProfileUpdate(default_tax_rate=101)

    def test_rejects_negative_tax_rate(self):
        with pytest.raises(ValidationError):
            CompanyProfileUpdate(default_tax_rate=-1)


class TestGetOrCreateCompanyProfile:
    @pytest.mark.asyncio
    async def test_creates_when_absent(self, db, workspace):
        profile = await service.get_or_create_company_profile(db, workspace.id)
        assert profile.id is not None
        assert profile.workspace_id == workspace.id
        assert profile.legal_name is None

    @pytest.mark.asyncio
    async def test_second_call_does_not_create_a_duplicate(self, db, workspace):
        first = await service.get_or_create_company_profile(db, workspace.id)
        second = await service.get_or_create_company_profile(db, workspace.id)
        assert first.id == second.id

        result = await db.execute(
            select(CompanyProfile).where(CompanyProfile.workspace_id == workspace.id)
        )
        assert len(result.scalars().all()) == 1


class TestUpdateCompanyProfile:
    @pytest.mark.asyncio
    async def test_upserts_when_absent(self, db, workspace):
        dto = CompanyProfileUpdate(legal_name="Acme S.A.", tax_id_label="NIT")
        profile = await service.update_company_profile(db, workspace.id, dto)
        assert profile.legal_name == "Acme S.A."
        assert profile.tax_id_label == "NIT"

    @pytest.mark.asyncio
    async def test_partial_update_leaves_other_fields_untouched(self, db, workspace):
        await service.update_company_profile(
            db, workspace.id, CompanyProfileUpdate(legal_name="Acme", city="Bogota")
        )
        updated = await service.update_company_profile(
            db, workspace.id, CompanyProfileUpdate(city="Medellin")
        )
        assert updated.city == "Medellin"
        assert updated.legal_name == "Acme"

    @pytest.mark.asyncio
    async def test_explicit_null_clears_the_logo(self, db, workspace):
        await service.update_company_profile(
            db, workspace.id, CompanyProfileUpdate(logo_data_uri=_data_uri(100))
        )
        cleared = await service.update_company_profile(
            db, workspace.id, CompanyProfileUpdate(logo_data_uri=None)
        )
        assert cleared.logo_data_uri is None


class TestLogoValidation:
    def test_accepts_png_under_the_limit(self):
        service._validate_logo_data_uri(_data_uri(199_000))

    def test_accepts_jpeg(self):
        service._validate_logo_data_uri(_data_uri(100, mime="image/jpeg"))

    def test_accepts_none(self):
        service._validate_logo_data_uri(None)

    def test_rejects_wrong_mime(self):
        with pytest.raises(HTTPException) as exc:
            service._validate_logo_data_uri(_data_uri(100, mime="image/gif"))
        assert exc.value.status_code == 400

    def test_rejects_non_data_uri(self):
        with pytest.raises(HTTPException) as exc:
            service._validate_logo_data_uri("https://example.com/logo.png")
        assert exc.value.status_code == 400

    def test_rejects_undecodable_base64(self):
        with pytest.raises(HTTPException) as exc:
            service._validate_logo_data_uri("data:image/png;base64,!!!not-base64!!!")
        assert exc.value.status_code == 400

    def test_rejects_over_200kb(self):
        with pytest.raises(HTTPException) as exc:
            service._validate_logo_data_uri(_data_uri(204_801))
        assert exc.value.status_code == 400
        assert "200" in exc.value.detail


class TestCompanyProfileEndpoints:
    @pytest.mark.asyncio
    async def test_get_returns_empty_profile_not_404(self, client, auth_headers):
        resp = await client.get("/api/v1/accounting/company-profile", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["legal_name"] is None
        assert body["tax_id_label"] == "RFC"
        assert body["default_currency"] == "USD"

    @pytest.mark.asyncio
    async def test_put_then_get_round_trip(self, client, auth_headers):
        put = await client.put(
            "/api/v1/accounting/company-profile",
            json={"legal_name": "Acme S.A.", "tax_id": "ABC010203XYZ", "city": "Lima"},
            headers=auth_headers,
        )
        assert put.status_code == 200

        get = await client.get("/api/v1/accounting/company-profile", headers=auth_headers)
        assert get.json()["legal_name"] == "Acme S.A."
        assert get.json()["city"] == "Lima"

    @pytest.mark.asyncio
    async def test_put_rejects_oversized_logo_with_400(self, client, auth_headers):
        resp = await client.put(
            "/api/v1/accounting/company-profile",
            json={"logo_data_uri": _data_uri(204_801)},
            headers=auth_headers,
        )
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_put_rejects_bad_tax_rate_with_422(self, client, auth_headers):
        resp = await client.put(
            "/api/v1/accounting/company-profile",
            json={"default_tax_rate": 150},
            headers=auth_headers,
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_requires_authentication(self, client):
        resp = await client.get("/api/v1/accounting/company-profile")
        assert resp.status_code in (401, 403)


class TestResolveInvoiceParty:
    @pytest.mark.asyncio
    async def test_empty_when_no_contact_or_organization(self, db, workspace):
        inv = await _make_invoice(db, workspace.id)
        party = await service.resolve_invoice_party(db, workspace.id, inv)
        assert party.is_empty
        assert party.name is None

    @pytest.mark.asyncio
    async def test_prefers_brand_name_over_legal_name(self, db, workspace):
        org = Organization(
            workspace_id=workspace.id,
            legal_name="Acme Sociedad Anonima",
            brand_name="Acme",
            country="Peru",
        )
        db.add(org)
        await db.commit()

        inv = await _make_invoice(db, workspace.id, organization_id=org.id)
        party = await service.resolve_invoice_party(db, workspace.id, inv)
        assert party.name == "Acme"
        assert party.country == "Peru"
        assert not party.is_empty

    @pytest.mark.asyncio
    async def test_falls_back_to_legal_name(self, db, workspace):
        org = Organization(workspace_id=workspace.id, legal_name="Solo Legal S.A.")
        db.add(org)
        await db.commit()

        inv = await _make_invoice(db, workspace.id, organization_id=org.id)
        party = await service.resolve_invoice_party(db, workspace.id, inv)
        assert party.name == "Solo Legal S.A."

    @pytest.mark.asyncio
    async def test_uses_person_when_no_organization(self, db, workspace):
        person = Person(
            workspace_id=workspace.id,
            full_name="Maria Rodriguez",
            email="maria@example.com",
            phone="+51 999 888 777",
        )
        db.add(person)
        await db.commit()

        inv = await _make_invoice(db, workspace.id, contact_id=person.id)
        party = await service.resolve_invoice_party(db, workspace.id, inv)
        assert party.name == "Maria Rodriguez"
        assert party.email == "maria@example.com"
        assert party.phone == "+51 999 888 777"

    @pytest.mark.asyncio
    async def test_organization_wins_and_person_becomes_contact_name(self, db, workspace):
        org = Organization(workspace_id=workspace.id, legal_name="Acme S.A.")
        person = Person(workspace_id=workspace.id, full_name="Maria Rodriguez")
        db.add_all([org, person])
        await db.commit()

        inv = await _make_invoice(
            db, workspace.id, organization_id=org.id, contact_id=person.id
        )
        party = await service.resolve_invoice_party(db, workspace.id, inv)
        assert party.name == "Acme S.A."
        assert party.contact_name == "Maria Rodriguez"

    @pytest.mark.asyncio
    async def test_unresolvable_reference_does_not_raise(self, db, workspace):
        """An id that resolves to nothing must degrade to empty, never raise.

        The invoice is left unpersisted on purpose: invoices.organization_id
        carries a real foreign key, so a dangling id cannot be inserted, and the
        constraint's ondelete SET NULL means deleting the organization nulls the
        column instead of leaving it dangling. resolve_invoice_party only reads
        the two id attributes, so an in-memory Invoice exercises the same path.
        """
        inv = Invoice(
            workspace_id=workspace.id,
            invoice_number="INV-2026-0002",
            status="draft",
            issue_date=date(2026, 8, 3),
            currency="USD",
            organization_id=str(uuid.uuid4()),
            contact_id=str(uuid.uuid4()),
        )
        party = await service.resolve_invoice_party(db, workspace.id, inv)
        assert party.is_empty

    @pytest.mark.asyncio
    async def test_does_not_resolve_across_workspaces(self, db, workspace, session_factory):
        """Cross-tenant leak guard."""
        async with session_factory() as other_session:
            other_ws = Workspace(name="Otra Corp", slug="otra-corp", active_modules=[])
            other_session.add(other_ws)
            await other_session.commit()
            await other_session.refresh(other_ws)

            foreign_org = Organization(
                workspace_id=other_ws.id, legal_name="Empresa Ajena S.A."
            )
            other_session.add(foreign_org)
            await other_session.commit()
            await other_session.refresh(foreign_org)
            foreign_org_id = foreign_org.id

        inv = await _make_invoice(db, workspace.id, organization_id=foreign_org_id)
        party = await service.resolve_invoice_party(db, workspace.id, inv)
        assert party.is_empty, "An organization from another workspace must not resolve"

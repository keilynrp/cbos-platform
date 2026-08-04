"""Tests for the invoice issuer profile (CompanyProfile)."""

import base64

import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.modules.accounting import service
from app.modules.accounting.models import CompanyProfile
from app.modules.accounting.schemas import CompanyProfileUpdate


def _data_uri(n_bytes: int, mime: str = "image/png") -> str:
    payload = base64.b64encode(b"x" * n_bytes).decode()
    return f"data:{mime};base64,{payload}"


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

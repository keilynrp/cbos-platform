"""Tests for the invoice issuer profile (CompanyProfile)."""

import pytest
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.modules.accounting.models import CompanyProfile
from app.modules.accounting.schemas import CompanyProfileUpdate


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

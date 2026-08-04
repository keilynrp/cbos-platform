"""Tests for the invoice issuer profile (CompanyProfile)."""

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.modules.accounting.models import CompanyProfile


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

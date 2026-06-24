"""
Material Service — CRUD for saved study materials.
"""
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from app.models.study_material import StudyMaterial, MaterialType
from app.models.document import Document
from app.models.user import User
from app.core.exceptions import NotFoundError, ForbiddenError

logger = logging.getLogger(__name__)


class MaterialService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def _verify_ownership(self, material: StudyMaterial, user: User) -> None:
        """Raise ForbiddenError if the material's document doesn't belong to user."""
        result = await self.db.execute(
            select(Document).where(Document.id == material.document_id)
        )
        doc = result.scalar_one_or_none()
        if not doc or doc.user_id != user.id:
            raise ForbiddenError()

    async def list_materials(
        self,
        user: User,
        material_type: MaterialType | None = None,
    ) -> list[StudyMaterial]:
        """List all study materials owned by the user, optionally filtered by type."""
        stmt = (
            select(StudyMaterial)
            .join(Document, StudyMaterial.document_id == Document.id)
            .where(Document.user_id == user.id)
            .order_by(StudyMaterial.created_at.desc())
        )
        if material_type:
            stmt = stmt.where(StudyMaterial.material_type == material_type)

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_material(self, material_id: str, user: User) -> StudyMaterial:
        """Fetch a single material with ownership check."""
        result = await self.db.execute(
            select(StudyMaterial)
            .options(selectinload(StudyMaterial.mcqs))
            .where(StudyMaterial.id == material_id)
        )
        material = result.scalar_one_or_none()
        if not material:
            raise NotFoundError("StudyMaterial")
        await self._verify_ownership(material, user)
        return material

    async def delete_material(self, material_id: str, user: User) -> None:
        """Hard delete a study material (cascades to MCQs)."""
        material = await self.get_material(material_id, user)
        await self.db.delete(material)
        await self.db.commit()
        logger.info("Deleted study material %s", material_id)

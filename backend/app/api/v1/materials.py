"""
Materials API routes — /api/v1/materials
CRUD for saved study materials (notes, bullets, cheat sheets, MCQ sets).
"""
from typing import Optional

from fastapi import APIRouter, Query

from app.core.dependencies import CurrentUser, DbSession
from app.models.study_material import MaterialType
from app.schemas.common import ok
from app.services.material_service import MaterialService

router = APIRouter(prefix="/materials", tags=["Materials"])


@router.get("/", summary="List all saved study materials")
async def list_materials(
    user: CurrentUser,
    db: DbSession,
    material_type: Optional[MaterialType] = Query(default=None),
):
    """
    List saved materials for the authenticated user.
    Optionally filter by type: complete_notes | bullet_notes | cheat_sheet | mcq_set
    """
    service = MaterialService(db)
    materials = await service.list_materials(user, material_type=material_type)
    data = [
        {
            "id": m.id,
            "document_id": m.document_id,
            "material_type": m.material_type,
            "created_at": m.created_at.isoformat(),
        }
        for m in materials
    ]
    return ok(data=data, message=f"{len(data)} materials found.")


@router.get("/{material_id}", summary="Get a single study material")
async def get_material(
    material_id: str,
    user: CurrentUser,
    db: DbSession,
):
    """Retrieve full material content including MCQs if applicable."""
    service = MaterialService(db)
    material = await service.get_material(material_id, user)

    data: dict = {
        "id": material.id,
        "document_id": material.document_id,
        "material_type": material.material_type,
        "content": material.content,
        "created_at": material.created_at.isoformat(),
    }

    # Include individual MCQ rows if this is an MCQ set
    if material.material_type == MaterialType.mcq_set and material.mcqs:
        data["mcqs"] = [
            {
                "id": mcq.id,
                "question": mcq.question,
                "option_a": mcq.option_a,
                "option_b": mcq.option_b,
                "option_c": mcq.option_c,
                "option_d": mcq.option_d,
                "correct_answer": mcq.correct_answer,
                "explanation": mcq.explanation,
                "order_index": mcq.order_index,
            }
            for mcq in sorted(material.mcqs, key=lambda m: m.order_index)
        ]

    return ok(data=data, message="Material fetched.")


@router.delete("/{material_id}", summary="Delete a study material")
async def delete_material(
    material_id: str,
    user: CurrentUser,
    db: DbSession,
):
    """Permanently delete a study material and all associated MCQs."""
    service = MaterialService(db)
    await service.delete_material(material_id, user)
    return ok(message="Material deleted successfully.")

"""
Generate API routes — /api/v1/generate
All endpoints require a ready document owned by the authenticated user.
"""
from fastapi import APIRouter

from app.core.dependencies import CurrentUser, DbSession
from app.schemas.common import ok
from app.schemas.generate import (
    GenerateNotesRequest,
    GenerateBulletsRequest,
    GenerateCheatSheetRequest,
    GenerateMCQRequest,
    GenerateTestPaperRequest,
)
from app.services.generate_service import GenerateService

router = APIRouter(prefix="/generate", tags=["Generate"])


@router.post("/notes", summary="Generate comprehensive notes from a document")
async def generate_notes(
    body: GenerateNotesRequest,
    user: CurrentUser,
    db: DbSession,
):
    """Generate structured university notes. Document must have status='ready'."""
    service = GenerateService(db)
    material = await service.generate_notes(body.document_id, user)
    return ok(
        data={"material_id": material.id, "content": material.content},
        message="Notes generated successfully.",
    )


@router.post("/bullets", summary="Generate bullet-point revision notes")
async def generate_bullets(
    body: GenerateBulletsRequest,
    user: CurrentUser,
    db: DbSession,
):
    """Generate concise bullet notes for quick revision."""
    service = GenerateService(db)
    material = await service.generate_bullets(body.document_id, user)
    return ok(
        data={"material_id": material.id, "content": material.content},
        message="Bullet notes generated successfully.",
    )


@router.post("/cheatsheet", summary="Generate a one-page cheat sheet")
async def generate_cheatsheet(
    body: GenerateCheatSheetRequest,
    user: CurrentUser,
    db: DbSession,
):
    """Generate a dense, scannable cheat sheet for exam preparation."""
    service = GenerateService(db)
    material = await service.generate_cheatsheet(body.document_id, user)
    return ok(
        data={"material_id": material.id, "content": material.content},
        message="Cheat sheet generated successfully.",
    )


@router.post("/mcqs", summary="Generate multiple-choice questions")
async def generate_mcqs(
    body: GenerateMCQRequest,
    user: CurrentUser,
    db: DbSession,
):
    """
    Generate MCQs from document content. count must be 10, 20, or 50.
    Returns the material_id and full MCQ list with answers and explanations.
    """
    service = GenerateService(db)
    result = await service.generate_mcqs(body.document_id, user, count=body.count)
    return ok(data=result, message=f"{len(result.mcqs)} MCQs generated successfully.")


@router.post("/testpaper", summary="Generate a university-style test paper")
async def generate_test_paper(
    body: GenerateTestPaperRequest,
    user: CurrentUser,
    db: DbSession,
):
    """
    Generate a structured test paper with MCQ, short-answer, and long-answer sections.
    """
    service = GenerateService(db)
    result = await service.generate_test_paper(
        body.document_id,
        user,
        mcq_count=body.mcq_count,
        short_count=body.short_count,
        long_count=body.long_count,
    )
    return ok(data=result, message="Test paper generated successfully.")

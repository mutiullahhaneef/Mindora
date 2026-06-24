"""
Generate Service — orchestrates AI generation and persistence of study materials.
"""
import json
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.document import Document, DocumentStatus
from app.models.study_material import StudyMaterial, MaterialType
from app.models.mcq import MCQ
from app.models.test_paper import TestPaper
from app.models.base import new_uuid
from app.models.user import User
from app.ai.ai_service import ai_service
from app.ai.prompts import (
    COMPLETE_NOTES_PROMPT,
    BULLET_NOTES_PROMPT,
    CHEAT_SHEET_PROMPT,
    MCQ_GENERATION_PROMPT,
    TEST_PAPER_PROMPT,
)
from app.core.exceptions import NotFoundError, ForbiddenError, DocumentNotReadyError
from app.schemas.generate import MCQItemOut, MCQSetOut, TestPaperOut, TextMaterialOut

logger = logging.getLogger(__name__)


class GenerateService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ─── Shared helpers ────────────────────────────────────────────────────

    async def _get_ready_document(self, document_id: str, user: User) -> Document:
        """Fetch a document, verify ownership and ready status."""
        result = await self.db.execute(
            select(Document).where(Document.id == document_id)
        )
        doc = result.scalar_one_or_none()
        if not doc:
            raise NotFoundError("Document")
        if doc.user_id != user.id:
            raise ForbiddenError()
        if doc.status != DocumentStatus.ready:
            raise DocumentNotReadyError()
        return doc

    # ─── Notes ────────────────────────────────────────────────────────────

    async def generate_notes(self, document_id: str, user: User) -> StudyMaterial:
        """Generate comprehensive notes from document raw_text."""
        doc = await self._get_ready_document(document_id, user)
        content = await ai_service.complete(
            COMPLETE_NOTES_PROMPT.format(content=doc.raw_text),
            temperature=0.4,
        )
        material = StudyMaterial(
            id=new_uuid(),
            document_id=document_id,
            material_type=MaterialType.complete_notes,
            content=content,
        )
        self.db.add(material)
        await self.db.commit()
        await self.db.refresh(material)
        logger.info("Generated complete_notes for document %s", document_id)
        return material

    # ─── Bullets ──────────────────────────────────────────────────────────

    async def generate_bullets(self, document_id: str, user: User) -> StudyMaterial:
        """Generate bullet-point revision notes."""
        doc = await self._get_ready_document(document_id, user)
        content = await ai_service.complete(
            BULLET_NOTES_PROMPT.format(content=doc.raw_text),
            temperature=0.3,
        )
        material = StudyMaterial(
            id=new_uuid(),
            document_id=document_id,
            material_type=MaterialType.bullet_notes,
            content=content,
        )
        self.db.add(material)
        await self.db.commit()
        await self.db.refresh(material)
        return material

    # ─── Cheat Sheet ───────────────────────────────────────────────────────

    async def generate_cheatsheet(self, document_id: str, user: User) -> StudyMaterial:
        """Generate a one-page cheat sheet."""
        doc = await self._get_ready_document(document_id, user)
        content = await ai_service.complete(
            CHEAT_SHEET_PROMPT.format(content=doc.raw_text),
            temperature=0.3,
        )
        material = StudyMaterial(
            id=new_uuid(),
            document_id=document_id,
            material_type=MaterialType.cheat_sheet,
            content=content,
        )
        self.db.add(material)
        await self.db.commit()
        await self.db.refresh(material)
        return material

    # ─── MCQs ─────────────────────────────────────────────────────────────

    async def generate_mcqs(
        self, document_id: str, user: User, count: int = 10
    ) -> MCQSetOut:
        """Generate MCQs and persist them as individual MCQ records."""
        doc = await self._get_ready_document(document_id, user)

        raw = await ai_service.complete_json(
            MCQ_GENERATION_PROMPT.format(content=doc.raw_text, count=count)
        )

        # raw may be a list or a dict with a list inside
        if isinstance(raw, dict):
            items = raw.get("questions", raw.get("mcqs", list(raw.values())[0] if raw else []))
        else:
            items = raw

        if not isinstance(items, list):
            raise ValueError("AI returned unexpected MCQ format")

        # Create parent StudyMaterial
        material_id = new_uuid()
        material = StudyMaterial(
            id=material_id,
            document_id=document_id,
            material_type=MaterialType.mcq_set,
            content=json.dumps(items),
        )
        self.db.add(material)

        # Create individual MCQ rows
        mcq_outs: list[MCQItemOut] = []
        for idx, item in enumerate(items):
            mcq = MCQ(
                id=new_uuid(),
                material_id=material_id,
                question=item.get("question", ""),
                option_a=item.get("option_a", ""),
                option_b=item.get("option_b", ""),
                option_c=item.get("option_c", ""),
                option_d=item.get("option_d", ""),
                correct_answer=item.get("correct_answer", "A"),
                explanation=item.get("explanation"),
                order_index=idx,
            )
            self.db.add(mcq)
            mcq_outs.append(
                MCQItemOut(
                    question=mcq.question,
                    option_a=mcq.option_a,
                    option_b=mcq.option_b,
                    option_c=mcq.option_c,
                    option_d=mcq.option_d,
                    correct_answer=mcq.correct_answer,
                    explanation=mcq.explanation,
                )
            )

        await self.db.commit()
        logger.info("Generated %d MCQs for document %s", len(mcq_outs), document_id)
        return MCQSetOut(material_id=material_id, mcqs=mcq_outs)

    # ─── Test Paper ────────────────────────────────────────────────────────

    async def generate_test_paper(
        self,
        document_id: str,
        user: User,
        mcq_count: int = 10,
        short_count: int = 5,
        long_count: int = 3,
    ) -> TestPaperOut:
        """Generate a university-style test paper and persist it."""
        doc = await self._get_ready_document(document_id, user)

        raw = await ai_service.complete_json(
            TEST_PAPER_PROMPT.format(
                content=doc.raw_text,
                mcq_count=mcq_count,
                short_count=short_count,
                long_count=long_count,
            )
        )

        if isinstance(raw, list):
            raise ValueError("Expected a JSON object for test paper, got a list")

        title = raw.get("title", f"Test Paper — {doc.filename}")
        mcq_section = raw.get("mcq_section", [])
        short_qs = raw.get("short_questions", [])
        long_qs = raw.get("long_questions", [])

        paper = TestPaper(
            id=new_uuid(),
            document_id=document_id,
            title=title,
            mcq_section=json.dumps(mcq_section),
            short_qs=json.dumps(short_qs),
            long_qs=json.dumps(long_qs),
        )
        self.db.add(paper)
        await self.db.commit()
        await self.db.refresh(paper)

        logger.info("Generated test paper for document %s", document_id)
        return TestPaperOut(
            test_paper_id=paper.id,
            title=title,
            mcq_section=mcq_section,
            short_qs=short_qs,
            long_qs=long_qs,
        )

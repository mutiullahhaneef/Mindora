"""
Generation request and output schemas.
"""
from typing import Literal
from pydantic import BaseModel, Field


# ─── Requests ──────────────────────────────────────────────────────────────────

class GenerateNotesRequest(BaseModel):
    document_id: str


class GenerateBulletsRequest(BaseModel):
    document_id: str


class GenerateCheatSheetRequest(BaseModel):
    document_id: str


class GenerateMCQRequest(BaseModel):
    document_id: str
    count: Literal[10, 20, 50] = 10


class GenerateTestPaperRequest(BaseModel):
    document_id: str
    mcq_count: int = Field(default=10, ge=1, le=50)
    short_count: int = Field(default=5, ge=1, le=20)
    long_count: int = Field(default=3, ge=1, le=10)


# ─── Outputs ───────────────────────────────────────────────────────────────────

class TextMaterialOut(BaseModel):
    material_id: str
    content: str


class MCQItemOut(BaseModel):
    question: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str
    explanation: str | None = None


class MCQSetOut(BaseModel):
    material_id: str
    mcqs: list[MCQItemOut]


class TestPaperOut(BaseModel):
    test_paper_id: str
    title: str
    mcq_section: list[dict]
    short_qs: list[dict]
    long_qs: list[dict]

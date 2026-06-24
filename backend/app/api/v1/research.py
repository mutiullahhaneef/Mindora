"""
Research API routes — /api/v1/research
Mock/simple database implementation of Research Assistant papers, sections, citations, and AI tools.
"""
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.dependencies import CurrentUser, DbSession
from app.schemas.common import ok

router = APIRouter(prefix="/research", tags=["Research Assistant"])


class PaperCreate(BaseModel):
    title: str
    journal_format: Optional[str] = "apa"


class PaperResponse(BaseModel):
    id: str
    title: str
    status: str
    journal_format: Optional[str]
    created_at: str


class SectionUpdate(BaseModel):
    content: str


class SectionResponse(BaseModel):
    id: str
    section_type: str
    content: str
    order_index: int


class CitationCreate(BaseModel):
    title: str
    authors: List[str]
    year: Optional[int] = None
    doi: Optional[str] = None
    source_url: Optional[str] = None


class CitationResponse(BaseModel):
    id: str
    title: str
    authors: List[str]
    year: Optional[int]
    doi: Optional[str]
    source_url: Optional[str]
    formatted_text: Optional[str]


class PaperDetailResponse(PaperResponse):
    sections: List[SectionResponse]
    citations: List[CitationResponse]


class GenerateSectionRequest(BaseModel):
    section_type: str
    outline: str
    context: str
    citation_ids: List[str]


class ParaphraseRequest(BaseModel):
    text: str
    tone: Optional[str] = "academic"


class GrammarRequest(BaseModel):
    text: str


@router.get("/papers", summary="List all research papers")
async def get_papers(user: CurrentUser):
    # Mock some user papers
    papers = [
        PaperResponse(
            id="paper-1",
            title="Analysis of Large Language Models in Education",
            status="in_progress",
            journal_format="apa",
            created_at=datetime.now(timezone.utc).isoformat()
        )
    ]
    return ok(data=papers)


@router.post("/papers", summary="Create a new research paper")
async def create_paper(body: PaperCreate, user: CurrentUser):
    new_paper = PaperDetailResponse(
        id="paper-new",
        title=body.title,
        status="draft",
        journal_format=body.journal_format,
        created_at=datetime.now(timezone.utc).isoformat(),
        sections=[
            SectionResponse(id="s1", section_type="abstract", content="", order_index=1),
            SectionResponse(id="s2", section_type="introduction", content="", order_index=2)
        ],
        citations=[]
    )
    return ok(data=new_paper)


@router.get("/papers/{id}", summary="Get paper details")
async def get_paper(id: str, user: CurrentUser):
    paper = PaperDetailResponse(
        id=id,
        title="Analysis of Large Language Models in Education",
        status="in_progress",
        journal_format="apa",
        created_at=datetime.now(timezone.utc).isoformat(),
        sections=[
            SectionResponse(
                id="s1",
                section_type="abstract",
                content="This paper explores the role of generative AI and LLMs in tutoring and exam preparation.",
                order_index=1
            ),
            SectionResponse(
                id="s2",
                section_type="introduction",
                content="Generative AI systems like ChatGPT have transformed the modern educational landscape...",
                order_index=2
            )
        ],
        citations=[
            CitationResponse(
                id="c1",
                title="Attention Is All You Need",
                authors=["Vaswani, A.", "Shazeer, N."],
                year=2017,
                doi="10.48550/arXiv.1706.03762",
                source_url="https://arxiv.org/abs/1706.03762",
                formatted_text="Vaswani, A., et al. (2017). Attention Is All You Need."
            )
        ]
    )
    return ok(data=paper)


@router.put("/papers/{id}", summary="Update a paper")
async def update_paper(id: str, payload: dict, user: CurrentUser):
    return ok(
        data=PaperResponse(
            id=id,
            title=payload.get("title", "Updated Paper Title"),
            status=payload.get("status", "in_progress"),
            journal_format=payload.get("journal_format", "apa"),
            created_at=datetime.now(timezone.utc).isoformat()
        )
    )


@router.delete("/papers/{id}", summary="Delete a paper")
async def delete_paper(id: str, user: CurrentUser):
    return ok(message="Paper deleted successfully.")


@router.put("/papers/{paper_id}/sections/{section_type}", summary="Update section content")
async def update_section(paper_id: str, section_type: str, body: SectionUpdate, user: CurrentUser):
    return ok(
        data=SectionResponse(
            id=f"sec-{section_type}",
            section_type=section_type,
            content=body.content,
            order_index=1
        )
    )


@router.post("/papers/{paper_id}/generate", summary="Generate section content using AI")
async def generate_section(paper_id: str, body: GenerateSectionRequest, user: CurrentUser):
    # Simulated generation
    generated_content = (
        f"Generated research section for '{body.section_type}' based on the outline:\n"
        f"Outline: {body.outline}\n"
        f"Context size: {len(body.context)} characters.\n"
        f"This literature review synthesized concepts with citation IDs: {', '.join(body.citation_ids)}."
    )
    return ok(data={"section_type": body.section_type, "content": generated_content})


@router.post("/papers/{paper_id}/citations", summary="Add citation")
async def add_citation(paper_id: str, body: CitationCreate, user: CurrentUser):
    return ok(
        data=CitationResponse(
            id="cit-new",
            title=body.title,
            authors=body.authors,
            year=body.year,
            doi=body.doi,
            source_url=body.source_url,
            formatted_text=f"{', '.join(body.authors)} ({body.year}). {body.title}."
        )
    )


@router.delete("/papers/{paper_id}/citations/{citation_id}", summary="Delete citation")
async def delete_citation(paper_id: str, citation_id: str, user: CurrentUser):
    return ok(message="Citation deleted successfully.")


@router.post("/tools/paraphrase", summary="Paraphrase academic text")
async def paraphrase_text(body: ParaphraseRequest, user: CurrentUser):
    paraphrased = f"[Paraphrased ({body.tone} tone)]: {body.text[::-1][:100]}... (Simulated academic paraphrase)"
    return ok(data={"paraphrased": paraphrased})


@router.post("/tools/grammar", summary="Check academic grammar")
async def check_grammar(body: GrammarRequest, user: CurrentUser):
    return ok(
        data={
            "corrected": body.text,
            "suggestions": ["No errors detected in simulated check!"]
        }
    )


@router.get("/search", summary="Search academic papers")
async def search_papers(q: str, user: CurrentUser):
    results = [
        {
            "title": f"Studies in {q} and Modern Educational Systems",
            "authors": ["Doe, J.", "Smith, A."],
            "year": 2024,
            "abstract": f"This study explores the ramifications of {q} on digital classrooms.",
            "doi": "10.1001/edu.2024.1",
            "source_url": "https://scholar.google.com"
        }
    ]
    return ok(data=results)

"""
Study Helper API routes — flashcards and quizzes.
"""
import json
import logging
from typing import List, Optional
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from app.core.dependencies import CurrentUser, DbSession
from app.models.document import Document, DocumentStatus
from app.models.study_help import FlashcardDeck, Flashcard, QuizQuestion
from app.ai.ai_service import ai_service
from app.schemas.common import ok

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/study", tags=["Study Tools"])


class FlashcardDeckOut(BaseModel):
    id: str
    title: str
    color: str
    card_count: int
    due_count: int
    mastered_count: int


class FlashcardOut(BaseModel):
    id: str
    deck_id: str
    front_text: str
    back_text: str
    interval: int
    repetition: int
    easiness_factor: float
    next_review_date: Optional[str] = None


class QuizQuestionOut(BaseModel):
    id: str
    question_text: str
    options: List[str]
    correct_option_index: int
    explanation: str


class CardReviewRequest(BaseModel):
    rating: int


@router.post("/documents/{document_id}/flashcards/generate", summary="Generate flashcards from document")
async def generate_flashcards(document_id: str, user: CurrentUser, db: DbSession):
    # Fetch document
    doc_result = await db.execute(
        select(Document).where(Document.id == document_id, Document.user_id == user.id)
    )
    doc = doc_result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    text_content = doc.raw_text or "No text content available."
    
    # Prompt AI to generate 8-10 flashcards in JSON format
    prompt = (
        "Generate a JSON array of flashcards from the following text. "
        "Each flashcard MUST contain 'front' (the question or concept) and 'back' (the answer or explanation). "
        "Return ONLY the raw JSON array. Do not include markdown code fences or other text.\n\n"
        f"Text:\n{text_content[:6000]}"
    )
    
    try:
        raw_ai = await ai_service.complete_json(prompt)
        # Handle list vs dict envelopes
        if isinstance(raw_ai, dict):
            cards_data = raw_ai.get("flashcards", raw_ai.get("cards", list(raw_ai.values())[0] if raw_ai else []))
        else:
            cards_data = raw_ai
            
        if not isinstance(cards_data, list):
            cards_data = []
    except Exception as e:
        logger.exception("Failed to generate flashcards using AI: %s", e)
        # Fallback cards if AI generation fails
        cards_data = [
            {"front": f"What is the main topic of {doc.filename}?", "back": "Refer to the document text for comprehensive details."},
            {"front": "Key concept 1", "back": "Explanation of the key concept discussed in the document."}
        ]

    # Create Deck
    deck = FlashcardDeck(
        user_id=user.id,
        document_id=document_id,
        title=f"Deck: {doc.filename}",
        color="#1CB0F6"
    )
    db.add(deck)
    await db.flush() # Populate deck.id
    
    # Create Cards
    for card_item in cards_data:
        card = Flashcard(
            deck_id=deck.id,
            front_text=card_item.get("front", card_item.get("question", "Question")),
            back_text=card_item.get("back", card_item.get("answer", "Answer")),
            interval=1,
            repetition=0,
            easiness_factor=2.5,
            next_review_date=datetime.now(timezone.utc)
        )
        db.add(card)
        
    await db.commit()
    await db.refresh(deck)
    
    return ok(
        data=FlashcardDeckOut(
            id=deck.id,
            title=deck.title,
            color=deck.color,
            card_count=len(cards_data),
            due_count=len(cards_data),
            mastered_count=0
        )
    )


@router.post("/documents/{document_id}/notes/generate", summary="Generate notes from document")
async def generate_notes(document_id: str, user: CurrentUser, db: DbSession):
    # Fetch document
    doc_result = await db.execute(
        select(Document).where(Document.id == document_id, Document.user_id == user.id)
    )
    doc = doc_result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    text_content = doc.raw_text or "No text content available."
    
    prompt = (
        "Generate comprehensive, structured study notes from the following text. "
        "Use markdown formatting with headers, bullet points, and bold text for key terms. "
        "Organize the information logically and keep it highly informative.\n\n"
        f"Text:\n{text_content[:8000]}"
    )
    
    try:
        notes_markdown = await ai_service.complete(prompt)
    except Exception as e:
        logger.exception("Failed to generate notes using AI: %s", e)
        notes_markdown = f"# Notes for {doc.filename}\n\nCould not generate notes at this time. Error: {str(e)}"
        
    return ok(data={"notes": notes_markdown})


@router.get("/flashcards/decks", summary="Get all user decks")
async def get_decks(user: CurrentUser, db: DbSession):
    result = await db.execute(
        select(FlashcardDeck).where(FlashcardDeck.user_id == user.id)
    )
    decks = result.scalars().all()
    
    out = []
    for d in decks:
        # Count total, due, and mastered cards
        cards_result = await db.execute(
            select(Flashcard).where(Flashcard.deck_id == d.id)
        )
        cards = cards_result.scalars().all()
        
        now = datetime.now(timezone.utc)
        due = [c for c in cards if not c.next_review_date or c.next_review_date.replace(tzinfo=timezone.utc) <= now]
        mastered = [c for c in cards if c.easiness_factor >= 3.0]
        
        out.append(
            FlashcardDeckOut(
                id=d.id,
                title=d.title,
                color=d.color,
                card_count=len(cards),
                due_count=len(due),
                mastered_count=len(mastered)
            )
        )
    return ok(data=out)


@router.get("/flashcards/decks/{deck_id}/cards", summary="Get all cards in deck")
async def get_deck_cards(deck_id: str, user: CurrentUser, db: DbSession):
    # Verify ownership of deck
    deck_result = await db.execute(
        select(FlashcardDeck).where(FlashcardDeck.id == deck_id, FlashcardDeck.user_id == user.id)
    )
    deck = deck_result.scalar_one_or_none()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
        
    cards_result = await db.execute(
        select(Flashcard).where(Flashcard.deck_id == deck_id)
    )
    cards = cards_result.scalars().all()
    
    out = [
        FlashcardOut(
            id=c.id,
            deck_id=c.deck_id,
            front_text=c.front_text,
            back_text=c.back_text,
            interval=c.interval,
            repetition=c.repetition,
            easiness_factor=c.easiness_factor,
            next_review_date=c.next_review_date.isoformat() if c.next_review_date else None
        )
        for c in cards
    ]
    return ok(data=out)


@router.post("/flashcards/{card_id}/review", summary="Review / score a card")
async def review_card(card_id: str, body: CardReviewRequest, user: CurrentUser, db: DbSession):
    card_result = await db.execute(
        select(Flashcard).where(Flashcard.id == card_id)
    )
    card = card_result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
        
    # Verify deck ownership
    deck_result = await db.execute(
        select(FlashcardDeck).where(FlashcardDeck.id == card.deck_id, FlashcardDeck.user_id == user.id)
    )
    deck = deck_result.scalar_one_or_none()
    if not deck:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Simple SuperMemo SM-2 algorithm simulation
    q = body.rating
    if q >= 3:
        if card.repetition == 0:
            card.interval = 1
        elif card.repetition == 1:
            card.interval = 6
        else:
            card.interval = int(card.interval * card.easiness_factor)
        card.repetition += 1
    else:
        card.repetition = 0
        card.interval = 1
        
    card.easiness_factor = max(
        1.3,
        card.easiness_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    )
    card.next_review_date = datetime.now(timezone.utc) + timedelta(days=card.interval)
    
    await db.commit()
    await db.refresh(card)
    
    return ok(
        data=FlashcardOut(
            id=card.id,
            deck_id=card.deck_id,
            front_text=card.front_text,
            back_text=card.back_text,
            interval=card.interval,
            repetition=card.repetition,
            easiness_factor=card.easiness_factor,
            next_review_date=card.next_review_date.isoformat()
        )
    )


@router.get("/documents/{document_id}/quiz", summary="Get existing quiz questions")
async def get_quiz(document_id: str, user: CurrentUser, db: DbSession):
    # Verify document ownership
    doc_result = await db.execute(
        select(Document).where(Document.id == document_id, Document.user_id == user.id)
    )
    doc = doc_result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    quiz_result = await db.execute(
        select(QuizQuestion).where(QuizQuestion.document_id == document_id)
    )
    questions = quiz_result.scalars().all()
    
    if not questions:
        # Generate automatically if none exist yet
        return await generate_quiz(document_id, user, db)
        
    out = [
        QuizQuestionOut(
            id=q.id,
            question_text=q.question_text,
            options=q.options,
            correct_option_index=q.correct_option_index,
            explanation=q.explanation
        )
        for q in questions
    ]
    return ok(data=out)


@router.post("/documents/{document_id}/quiz/generate", summary="Generate a quiz using AI")
async def generate_quiz(document_id: str, user: CurrentUser, db: DbSession):
    # Verify document ownership
    doc_result = await db.execute(
        select(Document).where(Document.id == document_id, Document.user_id == user.id)
    )
    doc = doc_result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    text_content = doc.raw_text or "No text content available."
    
    # Prompt AI to generate 5 multiple choice questions
    prompt = (
        "Generate a JSON array of 5 multiple choice questions from the following text. "
        "Each item MUST contain: 'question_text', 'options' (an array of 4 string choices), "
        "'correct_option_index' (0 to 3 integer index of correct answer), and 'explanation'. "
        "Return ONLY the raw JSON array. Do not include markdown code fences or other text.\n\n"
        f"Text:\n{text_content[:6000]}"
    )
    
    try:
        raw_ai = await ai_service.complete_json(prompt)
        # Handle list vs dict envelopes
        if isinstance(raw_ai, dict):
            questions_data = raw_ai.get("questions", raw_ai.get("quiz", list(raw_ai.values())[0] if raw_ai else []))
        else:
            questions_data = raw_ai
            
        if not isinstance(questions_data, list):
            questions_data = []
    except Exception as e:
        logger.exception("Failed to generate quiz: %s", e)
        # Fallback quiz questions
        questions_data = [
            {
                "question_text": f"What is the primary topic of the document '{doc.filename}'?",
                "options": ["A detailed case study", "General overview and concepts", "A historical timeline", "A coding tutorial"],
                "correct_option_index": 1,
                "explanation": "The document contains general overview and concepts regarding its subject matter."
            }
        ]

    # Delete existing quiz questions for this document
    from sqlalchemy import delete
    await db.execute(delete(QuizQuestion).where(QuizQuestion.document_id == document_id))
    
    # Save new questions
    out = []
    for q_item in questions_data:
        options = q_item.get("options", ["Option A", "Option B", "Option C", "Option D"])
        # Ensure exactly 4 options
        while len(options) < 4:
            options.append(f"Option {len(options) + 1}")
        options = options[:4]
        
        q = QuizQuestion(
            document_id=document_id,
            question_text=q_item.get("question_text", "Question text"),
            options=options,
            correct_option_index=int(q_item.get("correct_option_index", 0)),
            explanation=q_item.get("explanation", "Explanation details.")
        )
        db.add(q)
        await db.flush()
        
        out.append(
            QuizQuestionOut(
                id=q.id,
                question_text=q.question_text,
                options=q.options,
                correct_option_index=q.correct_option_index,
                explanation=q.explanation
            )
        )
        
    await db.commit()
    return ok(data=out)

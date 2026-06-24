"""
Models package — import all models so they're registered on Base.metadata.
"""
from app.models.base import Base, TimestampMixin
from app.models.user import User
from app.models.document import Document, FileType, DocumentStatus
from app.models.study_material import StudyMaterial, MaterialType
from app.models.mcq import MCQ, AnswerChoice
from app.models.test_paper import TestPaper
from app.models.gamification import Badge, UserBadge, UserGamification, XPEvent
from app.models.study_help import FlashcardDeck, Flashcard, QuizQuestion

__all__ = [
    "Base",
    "TimestampMixin",
    "User",
    "Document",
    "FileType",
    "DocumentStatus",
    "StudyMaterial",
    "MaterialType",
    "MCQ",
    "AnswerChoice",
    "TestPaper",
    "Badge",
    "UserBadge",
    "UserGamification",
    "XPEvent",
    "FlashcardDeck",
    "Flashcard",
    "QuizQuestion",
]



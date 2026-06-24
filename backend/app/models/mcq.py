"""
MCQ ORM model — individual multiple choice questions linked to a StudyMaterial.
"""
import enum

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, new_uuid


class AnswerChoice(str, enum.Enum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"


class MCQ(Base):
    __tablename__ = "mcqs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=new_uuid, index=True
    )
    material_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("study_materials.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    question: Mapped[str] = mapped_column(Text, nullable=False)
    option_a: Mapped[str] = mapped_column(String(500), nullable=False)
    option_b: Mapped[str] = mapped_column(String(500), nullable=False)
    option_c: Mapped[str] = mapped_column(String(500), nullable=False)
    option_d: Mapped[str] = mapped_column(String(500), nullable=False)
    correct_answer: Mapped[AnswerChoice] = mapped_column(
        Enum(AnswerChoice), nullable=False
    )
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Relationships
    material: Mapped["StudyMaterial"] = relationship(  # noqa: F821
        "StudyMaterial", back_populates="mcqs"
    )

    def __repr__(self) -> str:
        return f"<MCQ id={self.id} answer={self.correct_answer}>"

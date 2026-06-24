"""
StudyMaterial ORM model — persists generated notes, bullet notes, cheat sheets, MCQ sets.
"""
import enum

from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, new_uuid


class MaterialType(str, enum.Enum):
    complete_notes = "complete_notes"
    bullet_notes = "bullet_notes"
    cheat_sheet = "cheat_sheet"
    mcq_set = "mcq_set"


class StudyMaterial(Base, TimestampMixin):
    __tablename__ = "study_materials"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=new_uuid, index=True
    )
    document_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    material_type: Mapped[MaterialType] = mapped_column(
        Enum(MaterialType), nullable=False
    )
    # For MCQ sets: JSON string. For all others: plain text.
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Relationships
    document: Mapped["Document"] = relationship(  # noqa: F821
        "Document", back_populates="materials"
    )
    mcqs: Mapped[list["MCQ"]] = relationship(  # noqa: F821
        "MCQ",
        back_populates="material",
        cascade="all, delete-orphan",
        lazy="select",
    )

    def __repr__(self) -> str:
        return f"<StudyMaterial id={self.id} type={self.material_type}>"

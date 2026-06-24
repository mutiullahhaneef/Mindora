"""
TestPaper ORM model — university-style structured test paper.
"""
from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, new_uuid


class TestPaper(Base, TimestampMixin):
    __tablename__ = "test_papers"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=new_uuid, index=True
    )
    document_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)

    # Stored as JSON strings
    mcq_section: Mapped[str] = mapped_column(Text, nullable=False)
    short_qs: Mapped[str] = mapped_column(Text, nullable=False)
    long_qs: Mapped[str] = mapped_column(Text, nullable=False)

    # Relationships
    document: Mapped["Document"] = relationship(  # noqa: F821
        "Document", back_populates="test_papers"
    )

    def __repr__(self) -> str:
        return f"<TestPaper id={self.id} title={self.title}>"

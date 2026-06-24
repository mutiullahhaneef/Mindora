"""
Document Service — handles file upload, validation, storage, and status management.
"""
import logging
import math
import os
import uuid

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.config import settings
from app.models.document import Document, DocumentStatus, FileType
from app.models.user import User
from app.schemas.document import PaginatedDocuments, DocumentResponse
from app.core.exceptions import (
    FileTooLargeError,
    UnsupportedFileTypeError,
    NotFoundError,
    ForbiddenError,
)

logger = logging.getLogger(__name__)

# MIME type whitelist — validate server-side, not just extension
_ALLOWED_MIMES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
}


class DocumentService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ─── Upload ────────────────────────────────────────────────────────────

    async def upload(self, file: UploadFile, user: User) -> Document:
        """
        Validate, store, and create a Document record for an uploaded file.
        Raises FileTooLargeError, UnsupportedFileTypeError on invalid input.
        Returns the new Document (status='pending').
        """
        # Read entire file content
        content = await file.read()
        size_bytes = len(content)
        max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024

        if size_bytes > max_bytes:
            raise FileTooLargeError(settings.MAX_FILE_SIZE_MB)

        # Validate MIME type
        content_type = file.content_type or ""
        file_type_str = _ALLOWED_MIMES.get(content_type)
        if not file_type_str:
            # Fallback: check extension
            ext = (file.filename or "").rsplit(".", 1)[-1].lower()
            if ext not in settings.ALLOWED_EXTENSIONS:
                raise UnsupportedFileTypeError(settings.ALLOWED_EXTENSIONS)
            file_type_str = ext

        file_type = FileType(file_type_str)

        # Store file
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        stored_name = f"{uuid.uuid4()}.{file_type_str}"
        file_path = os.path.join(settings.UPLOAD_DIR, stored_name)

        with open(file_path, "wb") as f:
            f.write(content)

        # Create DB record
        document = Document(
            user_id=user.id,
            filename=file.filename or stored_name,
            stored_name=stored_name,
            file_type=file_type,
            file_path=file_path,
            file_size=size_bytes,
            status=DocumentStatus.pending,
        )
        self.db.add(document)
        await self.db.commit()
        await self.db.refresh(document)

        logger.info("Uploaded document %s for user %s", document.id, user.id)
        return document

    # ─── Read ──────────────────────────────────────────────────────────────

    async def list_documents(
        self, user: User, page: int = 1, limit: int = 20
    ) -> PaginatedDocuments:
        """Return paginated list of documents owned by the given user."""
        offset = (page - 1) * limit

        count_result = await self.db.execute(
            select(func.count()).select_from(Document).where(
                Document.user_id == user.id
            )
        )
        total = count_result.scalar_one()

        result = await self.db.execute(
            select(Document)
            .where(Document.user_id == user.id)
            .order_by(Document.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        docs = result.scalars().all()

        return PaginatedDocuments(
            items=[DocumentResponse.model_validate(d) for d in docs],
            total=total,
            page=page,
            limit=limit,
            pages=math.ceil(total / limit) if total > 0 else 1,
        )

    async def get_document(self, document_id: str, user: User) -> Document:
        """Fetch a single document. Verifies ownership."""
        result = await self.db.execute(
            select(Document).where(Document.id == document_id)
        )
        doc = result.scalar_one_or_none()
        if not doc:
            raise NotFoundError("Document")
        if doc.user_id != user.id:
            raise ForbiddenError()
        return doc

    async def get_status(self, document_id: str, user: User) -> Document:
        """Lightweight status poll — same ownership check as get_document."""
        return await self.get_document(document_id, user)

    # ─── Delete ────────────────────────────────────────────────────────────

    async def delete_document(self, document_id: str, user: User) -> None:
        """
        Delete document record, file from disk, and ChromaDB embeddings.
        """
        doc = await self.get_document(document_id, user)

        # Delete file from disk
        if os.path.exists(doc.file_path):
            try:
                os.remove(doc.file_path)
            except OSError as e:
                logger.warning("Could not delete file %s: %s", doc.file_path, e)

        # Delete ChromaDB embeddings (import here to avoid circular issues)
        try:
            from app.ai.rag import RAGService
            rag = RAGService()
            await rag.delete_document(document_id)
        except Exception as e:
            logger.warning("ChromaDB delete failed for %s: %s", document_id, e)

        # Delete DB record (cascades to materials and test_papers)
        await self.db.delete(doc)
        await self.db.commit()
        logger.info("Deleted document %s", document_id)

    # ─── Status Update (used by Celery tasks) ──────────────────────────────

    async def update_status(
        self,
        document_id: str,
        status: DocumentStatus,
        raw_text: str | None = None,
        page_count: int | None = None,
        error_msg: str | None = None,
    ) -> None:
        """Update document processing status. Called from Celery tasks."""
        result = await self.db.execute(
            select(Document).where(Document.id == document_id)
        )
        doc = result.scalar_one_or_none()
        if not doc:
            return

        doc.status = status
        if raw_text is not None:
            doc.raw_text = raw_text
        if page_count is not None:
            doc.page_count = page_count
        if error_msg is not None:
            doc.error_msg = error_msg

        await self.db.commit()

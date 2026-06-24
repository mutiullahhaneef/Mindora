"""
Document processing Celery tasks.
Celery tasks are synchronous — we use asyncio.run() to call async services.
"""
import asyncio
import logging

from celery import Task
from sqlalchemy import select

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


class DocumentTask(Task):
    """Base task class with DB session support."""
    abstract = True


@celery_app.task(
    bind=True,
    base=DocumentTask,
    max_retries=3,
    default_retry_delay=10,
    name="tasks.process_document",
)
def process_document(self, document_id: str) -> dict:
    """
    Background task: parse document text, save to DB, generate ChromaDB embeddings.

    Lifecycle:
        pending → processing → ready  (success)
        pending → processing → failed (on exception, retried up to 3x)
    """
    return asyncio.run(_async_process_document(self, document_id))


async def _async_process_document(task, document_id: str) -> dict:
    """Async implementation of the document processing pipeline."""
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from sqlalchemy.pool import NullPool
    from app.config import settings
    from app.models.document import Document, DocumentStatus
    from app.ai.parser import DocumentParser
    from app.ai.rag import RAGService

    # Create a dedicated engine for Celery tasks using NullPool
    # This prevents 'attached to a different loop' errors when asyncio.run() creates new event loops
    engine = create_async_engine(
        settings.DATABASE_URL,
        poolclass=NullPool,
        echo=False
    )
    CelerySessionLocal = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with CelerySessionLocal() as db:
        try:
            # Fetch document
            result = await db.execute(
                select(Document).where(Document.id == document_id)
            )
            doc = result.scalar_one_or_none()

            if not doc:
                logger.error("Document %s not found in DB", document_id)
                return {"error": "Document not found"}

            # Mark as processing
            doc.status = DocumentStatus.processing
            await db.commit()
            logger.info("Processing document %s (%s)", document_id, doc.file_type)

            # Parse text
            parser = DocumentParser()
            raw_text = parser.parse(doc.file_path, doc.file_type.value)

            # Count pages for PDFs
            page_count = None
            if doc.file_type.value == "pdf":
                try:
                    import fitz
                    pdf = fitz.open(doc.file_path)
                    page_count = pdf.page_count
                    pdf.close()
                except Exception:
                    pass

            # Save extracted text
            doc.raw_text = raw_text
            doc.page_count = page_count
            await db.commit()

            # Generate and store embeddings
            rag = RAGService()
            await rag.ingest_document(document_id, raw_text)

            # Mark as ready
            doc.status = DocumentStatus.ready
            doc.error_msg = None
            await db.commit()

            logger.info("Document %s processed successfully", document_id)
            return {"document_id": document_id, "status": "ready", "chars": len(raw_text)}

        except Exception as exc:
            logger.exception("Error processing document %s: %s", document_id, exc)

            # Update status to failed
            try:
                result = await db.execute(
                    select(Document).where(Document.id == document_id)
                )
                doc = result.scalar_one_or_none()
                if doc:
                    doc.status = DocumentStatus.failed
                    doc.error_msg = str(exc)[:500]
                    await db.commit()
            except Exception as db_exc:
                logger.error("Failed to update document status: %s", db_exc)

            # Retry with exponential backoff
            raise task.retry(exc=exc, countdown=2 ** task.request.retries * 10)

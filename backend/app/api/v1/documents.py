"""
Documents API routes — /api/v1/documents
"""
from fastapi import APIRouter, File, Query, UploadFile

from app.core.dependencies import CurrentUser, DbSession
from app.schemas.common import ok
from app.schemas.document import DocumentResponse, DocumentStatusResponse, DocumentUploadResponse
from app.services.document_service import DocumentService
from app.tasks.document_tasks import process_document

router = APIRouter(prefix="/study/documents", tags=["Documents"])


@router.post("/upload", summary="Upload a document for processing")
async def upload_document(
    file: UploadFile = File(...),
    user: CurrentUser = ...,
    db: DbSession = ...,
):
    """
    Upload a PDF, PPTX, DOCX, or TXT file (max 50 MB).
    The file is saved and a background Celery task is enqueued immediately.
    Returns document_id and initial status='pending'. Poll /status to track progress.
    """
    service = DocumentService(db)
    document = await service.upload(file, user)

    # Enqueue background processing (non-blocking)
    # Wrapped in try/except to gracefully handle unavailable Redis/Celery broker
    try:
        process_document.delay(document.id)
    except Exception as e:
        import logging as _log
        _log.getLogger(__name__).warning(
            "Could not enqueue document processing task for %s: %s. "
            "Document is saved but won't be processed until Celery is running.",
            document.id, e,
        )

    return ok(
        data=DocumentUploadResponse(document_id=document.id),
        message="File uploaded. Processing has started in the background.",
    )


@router.get("/", summary="List all documents for the current user")
async def list_documents(
    user: CurrentUser,
    db: DbSession,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
):
    """Returns a paginated list of the user's uploaded documents."""
    service = DocumentService(db)
    result = await service.list_documents(user, page=page, limit=limit)
    return ok(data=result, message="Documents fetched.")


@router.get("/{document_id}", summary="Get a single document")
async def get_document(
    document_id: str,
    user: CurrentUser,
    db: DbSession,
):
    """Retrieve full document details including status, page count, and metadata."""
    service = DocumentService(db)
    doc = await service.get_document(document_id, user)
    return ok(data=DocumentResponse.model_validate(doc), message="Document fetched.")


@router.delete("/{document_id}", summary="Delete a document")
async def delete_document(
    document_id: str,
    user: CurrentUser,
    db: DbSession,
):
    """Delete a document, its file from disk, and all associated embeddings."""
    service = DocumentService(db)
    await service.delete_document(document_id, user)
    return ok(message="Document deleted successfully.")


@router.get("/{document_id}/status", summary="Poll document processing status")
async def get_document_status(
    document_id: str,
    user: CurrentUser,
    db: DbSession,
):
    """Lightweight status endpoint. Poll until status='ready' before calling /generate."""
    service = DocumentService(db)
    doc = await service.get_status(document_id, user)
    return ok(
        data=DocumentStatusResponse(
            document_id=doc.id,
            status=doc.status,
            error_msg=doc.error_msg,
        ),
        message="Status fetched.",
    )


from pydantic import BaseModel
from typing import Optional
from app.services.chat_service import ChatService

class HTTPChatRequest(BaseModel):
    query: str
    history: Optional[list[dict]] = None

@router.post("/{document_id}/chat", summary="Chat with document (HTTP)")
async def chat_http(
    document_id: str,
    body: HTTPChatRequest,
    user: CurrentUser,
    db: DbSession,
):
    service = ChatService(db)
    chunks = []
    async for chunk in service.stream_response(
        document_id=document_id,
        message=body.query,
        user=user,
        conversation_history=body.history,
    ):
        chunks.append(chunk)
    answer = "".join(chunks)
    return ok(data={"answer": answer})


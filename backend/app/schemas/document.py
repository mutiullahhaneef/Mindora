"""
Document request and response schemas.
"""
from datetime import datetime

from pydantic import BaseModel

from app.models.document import DocumentStatus, FileType


class DocumentStatusResponse(BaseModel):
    document_id: str
    status: DocumentStatus
    error_msg: str | None = None


class DocumentUploadResponse(BaseModel):
    document_id: str
    status: DocumentStatus = DocumentStatus.pending


class DocumentResponse(BaseModel):
    id: str
    filename: str
    file_type: FileType
    file_size: int
    status: DocumentStatus
    page_count: int | None = None
    error_msg: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedDocuments(BaseModel):
    items: list[DocumentResponse]
    total: int
    page: int
    limit: int
    pages: int

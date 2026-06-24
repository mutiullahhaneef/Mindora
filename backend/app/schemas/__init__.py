from app.schemas.common import BaseResponse, ok, fail
from app.schemas.auth import RegisterRequest, LoginRequest, UserOut, TokenOut, AccessTokenOut
from app.schemas.document import DocumentResponse, DocumentUploadResponse, DocumentStatusResponse, PaginatedDocuments
from app.schemas.generate import (
    GenerateNotesRequest, GenerateBulletsRequest, GenerateCheatSheetRequest,
    GenerateMCQRequest, GenerateTestPaperRequest,
    TextMaterialOut, MCQSetOut, MCQItemOut, TestPaperOut,
)
from app.schemas.mcq import MCQResponse, MCQSetResponse
from app.schemas.test_paper import TestPaperResponse

__all__ = [
    "BaseResponse", "ok", "fail",
    "RegisterRequest", "LoginRequest", "UserOut", "TokenOut", "AccessTokenOut",
    "DocumentResponse", "DocumentUploadResponse", "DocumentStatusResponse", "PaginatedDocuments",
    "GenerateNotesRequest", "GenerateBulletsRequest", "GenerateCheatSheetRequest",
    "GenerateMCQRequest", "GenerateTestPaperRequest",
    "TextMaterialOut", "MCQSetOut", "MCQItemOut", "TestPaperOut",
    "MCQResponse", "MCQSetResponse",
    "TestPaperResponse",
]

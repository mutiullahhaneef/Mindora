"""
Custom exception classes for Mindora.
All exceptions inherit from MindoraException which itself extends HTTPException,
so FastAPI's exception handler can catch them directly.
"""
from fastapi import HTTPException, status


class MindoraException(HTTPException):
    """Base exception for all Mindora domain errors."""

    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(status_code=status_code, detail=detail)


# ─── 400 Bad Request ───────────────────────────────────────────────────────────
class BadRequestError(MindoraException):
    def __init__(self, detail: str = "Bad request") -> None:
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class FileTooLargeError(BadRequestError):
    def __init__(self, max_mb: int) -> None:
        super().__init__(detail=f"File exceeds the maximum allowed size of {max_mb} MB.")


class UnsupportedFileTypeError(BadRequestError):
    def __init__(self, allowed: list[str]) -> None:
        super().__init__(
            detail=f"Unsupported file type. Allowed types: {', '.join(allowed)}."
        )


class DocumentNotReadyError(BadRequestError):
    def __init__(self) -> None:
        super().__init__(
            detail="Document is not yet ready for processing. Please wait for status='ready'."
        )


# ─── 401 Unauthorized ──────────────────────────────────────────────────────────
class UnauthorizedError(MindoraException):
    def __init__(self, detail: str = "Authentication required.") -> None:
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


class InvalidTokenError(UnauthorizedError):
    def __init__(self) -> None:
        super().__init__(detail="Invalid or expired token.")


class InvalidCredentialsError(UnauthorizedError):
    def __init__(self) -> None:
        super().__init__(detail="Incorrect email or password.")


# ─── 403 Forbidden ─────────────────────────────────────────────────────────────
class ForbiddenError(MindoraException):
    def __init__(self, detail: str = "You do not have permission to access this resource.") -> None:
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


# ─── 404 Not Found ─────────────────────────────────────────────────────────────
class NotFoundError(MindoraException):
    def __init__(self, resource: str = "Resource") -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource} not found.",
        )


# ─── 409 Conflict ──────────────────────────────────────────────────────────────
class ConflictError(MindoraException):
    def __init__(self, detail: str = "Resource already exists.") -> None:
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)


class EmailAlreadyExistsError(ConflictError):
    def __init__(self) -> None:
        super().__init__(detail="An account with this email address already exists.")

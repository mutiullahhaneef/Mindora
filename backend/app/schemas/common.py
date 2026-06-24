"""
Common response envelope — all API responses use this structure.
"""
from typing import Any, Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class BaseResponse(BaseModel, Generic[T]):
    """
    Standard API response envelope:
    { "success": bool, "data": <T>, "message": str }
    """
    success: bool
    data: T | None = None
    message: str = ""


def ok(data: Any = None, message: str = "Success") -> dict:
    """Convenience helper — returns a success envelope dict."""
    return {"success": True, "data": data, "message": message}


def fail(message: str, data: Any = None) -> dict:
    """Convenience helper — returns a failure envelope dict."""
    return {"success": False, "data": data, "message": message}

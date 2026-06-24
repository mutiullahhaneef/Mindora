"""
FastAPI dependencies — reusable injected services.
"""
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import decode_token
from app.core.exceptions import InvalidTokenError, UnauthorizedError, NotFoundError
from app.db.session import get_db
from app.models.user import User

# ─── HTTP Bearer scheme (does NOT auto-raise on missing header) ─────────────────
_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """
    Extract and validate JWT from Authorization header.
    Returns the User ORM object if valid.
    Raises UnauthorizedError on missing token, InvalidTokenError on bad token.
    """
    if credentials is None:
        raise UnauthorizedError(detail="Authorization header is required.")

    token = credentials.credentials

    try:
        payload = decode_token(token)
    except JWTError:
        raise InvalidTokenError()

    token_type = payload.get("type")
    if token_type != "access":
        raise InvalidTokenError()

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise InvalidTokenError()

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise NotFoundError("User")

    if not user.is_active:
        raise UnauthorizedError(detail="User account is disabled.")

    return user


async def get_current_user_from_refresh(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """
    Like get_current_user but validates the 'refresh' token type.
    Used only by the /auth/refresh endpoint.
    """
    if credentials is None:
        raise UnauthorizedError(detail="Refresh token is required.")

    token = credentials.credentials

    try:
        payload = decode_token(token)
    except JWTError:
        raise InvalidTokenError()

    token_type = payload.get("type")
    if token_type != "refresh":
        raise InvalidTokenError()

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise InvalidTokenError()

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise NotFoundError("User")

    if not user.is_active:
        raise UnauthorizedError(detail="User account is disabled.")

    return user


# ─── Type aliases for cleaner route signatures ─────────────────────────────────
CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[AsyncSession, Depends(get_db)]

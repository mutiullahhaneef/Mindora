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
    Bypassed Auth: Returns a generic guest user.
    """
    result = await db.execute(select(User).limit(1))
    user = result.scalar_one_or_none()
    
    if not user:
        user = User(
            email="guest@mindora.com",
            name="Guest User",
            password="dummy_password_hash",
            is_active=True
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return user


async def get_current_user_from_refresh(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """
    Bypassed Auth: Returns a generic guest user.
    """
    result = await db.execute(select(User).limit(1))
    user = result.scalar_one_or_none()
    
    if not user:
        user = User(
            email="guest@mindora.com",
            name="Guest User",
            password="dummy_password_hash",
            is_active=True
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return user


# ─── Type aliases for cleaner route signatures ─────────────────────────────────
CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[AsyncSession, Depends(get_db)]

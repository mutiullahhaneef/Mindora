"""
Auth API routes — /api/v1/auth
"""
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_current_user_from_refresh, DbSession
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, UserOut, TokenOut, AccessTokenOut
from app.schemas.common import ok
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", summary="Register a new user account")
async def register(
    body: RegisterRequest,
    db: DbSession,
):
    """Create a new Mindora account. Email must be unique, password min 8 chars."""
    service = AuthService(db)
    user = await service.register(body)
    return ok(
        data=UserOut(user_id=user.id, email=user.email, name=user.name),
        message="Account created successfully.",
    )


@router.post("/login", summary="Login and receive JWT tokens")
async def login(
    body: LoginRequest,
    db: DbSession,
):
    """Authenticate with email + password. Returns access and refresh tokens."""
    service = AuthService(db)
    access_token, refresh_token = await service.login(body)
    return ok(
        data=TokenOut(access_token=access_token, refresh_token=refresh_token),
        message="Login successful.",
    )


@router.post("/refresh", summary="Refresh access token")
async def refresh_token(
    user: Annotated[User, Depends(get_current_user_from_refresh)],
    db: DbSession,
):
    """
    Pass the refresh token in the Authorization header as 'Bearer <token>'.
    Returns a new access token.
    """
    service = AuthService(db)
    access_token = await service.refresh(user)
    return ok(
        data=AccessTokenOut(access_token=access_token),
        message="Token refreshed.",
    )


@router.get("/me", summary="Get current user profile")
async def me(
    user: Annotated[User, Depends(get_current_user_from_refresh)],
):
    """Returns the authenticated user's profile. Requires access token."""
    # Re-use the dependency but this is for the access token version
    return ok(
        data=UserOut(user_id=user.id, email=user.email, name=user.name),
        message="Profile fetched.",
    )

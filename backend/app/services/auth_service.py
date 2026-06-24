"""
Auth Service — register, login, token refresh logic.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.base import new_uuid
from app.schemas.auth import RegisterRequest, LoginRequest
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.core.exceptions import EmailAlreadyExistsError, InvalidCredentialsError


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def register(self, data: RegisterRequest) -> User:
        """Create a new user account. Raises EmailAlreadyExistsError on duplicate."""
        result = await self.db.execute(
            select(User).where(User.email == data.email.lower())
        )
        existing = result.scalar_one_or_none()
        if existing:
            raise EmailAlreadyExistsError()

        user = User(
            id=new_uuid(),
            email=data.email.lower(),
            name=data.name.strip(),
            password=hash_password(data.password),
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def login(self, data: LoginRequest) -> tuple[str, str]:
        """
        Authenticate user by email + password.
        Returns (access_token, refresh_token) on success.
        Raises InvalidCredentialsError on bad credentials.
        """
        result = await self.db.execute(
            select(User).where(User.email == data.email.lower())
        )
        user = result.scalar_one_or_none()

        if not user or not verify_password(data.password, user.password):
            raise InvalidCredentialsError()

        if not user.is_active:
            raise InvalidCredentialsError()

        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token(user.id)
        return access_token, refresh_token

    async def refresh(self, user: User) -> str:
        """Issue a new access token for an already-validated user."""
        return create_access_token(user.id)

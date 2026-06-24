"""
Database initialization — creates all tables on startup.
"""
from app.db.session import engine
from app.models.base import Base

# Import all models so their tables are registered on Base.metadata
import app.models.user  # noqa: F401
import app.models.document  # noqa: F401
import app.models.study_material  # noqa: F401
import app.models.mcq  # noqa: F401
import app.models.test_paper  # noqa: F401


async def init_db() -> None:
    """Create all tables if they don't exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

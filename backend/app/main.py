"""
Mindora Backend — FastAPI Application Factory
"""
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.core.exceptions import MindoraException
from app.core.middleware import RequestLoggingMiddleware
from app.api.v1.router import api_v1_router

# ─── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("mindora")


# ─── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info("Mindora backend starting up...")

    # Ensure upload directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # Create all DB tables
    from app.db.init_db import init_db
    await init_db()

    logger.info("Database tables verified.")
    logger.info("Mindora backend ready — serving on /api/v1")

    yield

    logger.info("Mindora backend shutting down.")


# ─── App Factory ───────────────────────────────────────────────────────────────
def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="Mindora API",
        description=(
            "AI-powered study assistant — upload lecture files and generate "
            "notes, bullet summaries, cheat sheets, MCQs, and test papers."
        ),
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
    )

    # ─── CORS ──────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ─── Request logging ───────────────────────────────────────────────────
    app.add_middleware(RequestLoggingMiddleware)

    # ─── Global exception handler ──────────────────────────────────────────
    @app.exception_handler(MindoraException)
    async def mindora_exception_handler(request: Request, exc: MindoraException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "data": None,
                "message": exc.detail,
            },
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled exception: %s", exc)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "data": None,
                "message": "An unexpected error occurred. Please try again later.",
            },
        )

    # ─── Routes ────────────────────────────────────────────────────────────
    app.include_router(api_v1_router, prefix="/api/v1")

    # ─── Static file serving ───────────────────────────────────────────────
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

    # ─── Health check ──────────────────────────────────────────────────────
    @app.get("/health", tags=["Health"], include_in_schema=False)
    async def health_check():
        return {
            "success": True,
            "data": {"status": "healthy", "version": "1.0.0", "service": "mindora-api"},
            "message": "Service is running.",
        }

    return app


app = create_app()

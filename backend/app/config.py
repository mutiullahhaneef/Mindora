"""
Mindora — Application Configuration
All settings are driven by environment variables / .env file.
Never hardcode secrets — always read from environment.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ─── App ───────────────────────────────────────────────────────────────
    APP_NAME: str = "Mindora"
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production-use-a-strong-random-key"

    # ─── Database ──────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/mindora"

    # ─── Redis ─────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ─── JWT ───────────────────────────────────────────────────────────────
    JWT_SECRET_KEY: str = "jwt-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ─── AI ────────────────────────────────────────────────────────────────
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    USE_OLLAMA: bool = False
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3"

    # ─── File Upload ───────────────────────────────────────────────────────
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 50
    ALLOWED_EXTENSIONS: list[str] = ["pdf", "pptx", "docx", "txt"]

    # ─── CORS ──────────────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # ─── Vector DB ─────────────────────────────────────────────────────────
    CHROMA_PERSIST_DIR: str = "./chroma_storage"
    CHROMA_COLLECTION: str = "mindora_documents"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


settings = Settings()

# Mindora — Backend

> Production-ready FastAPI backend for the Mindora AI Study Assistant Platform.
> Upload lecture files → get structured notes, MCQs, cheat sheets, and test papers in seconds.

---

## Architecture

```
User Request
     │
     ▼
FastAPI (ASGI / Uvicorn)
     │
     ├── Auth Layer        JWT access + refresh tokens (python-jose, bcrypt 12 rounds)
     │
     ├── API Routes  /api/v1/
     │   ├── auth          Register, login, token refresh, /me
     │   ├── documents     Upload, list, get, delete, status polling
     │   ├── generate      Notes, bullets, cheat sheet, MCQs, test paper
     │   ├── materials     CRUD for saved study materials
     │   └── chat          RAG streaming Q&A (SSE)
     │
     ├── Services Layer
     │   ├── auth_service       Register/login/refresh logic
     │   ├── document_service   File validation, disk storage, pagination
     │   ├── generate_service   AI orchestration → DB persistence
     │   ├── material_service   Material CRUD with ownership checks
     │   └── chat_service       RAG retrieval + streaming response
     │
     ├── AI Layer
     │   ├── AIService    Unified LLM interface (OpenAI ↔ Ollama switch)
     │   ├── RAGService   ChromaDB ingest/retrieve/delete
     │   ├── Parser       PDF / PPTX / DOCX / TXT text extraction
     │   └── Prompts      All prompt templates as named constants
     │
     ├── Celery Workers   Async document processing (parse + embed)
     │
     └── Data Layer
         ├── PostgreSQL   Relational data (users, documents, materials, MCQs, papers)
         ├── Redis        Celery broker + result backend
         └── ChromaDB     Vector document store (RAG retrieval)
```

---

## Tech Stack

| Component | Technology |
|---|---|
| Framework | FastAPI + Uvicorn |
| Database | PostgreSQL 15 + pgvector |
| ORM & Migrations | SQLAlchemy 2.0 (async) + Alembic |
| Caching & Broker | Redis 7 |
| Background Tasks | Celery 5 |
| Vector Search | ChromaDB (persistent client) |
| AI — Primary | OpenAI `gpt-4o-mini` |
| AI — Fallback | Ollama `llama3` (local, offline) |
| Auth | python-jose (JWT) + passlib (bcrypt, 12 rounds) |
| File Parsing | PyMuPDF, python-pptx, python-docx |
| HTTP Client | httpx (async) |

---

## Project Structure

```
backend/
├── app/
│   ├── main.py              # App factory, lifespan, middleware, error handlers
│   ├── config.py            # Pydantic BaseSettings — all config from .env
│   │
│   ├── api/v1/
│   │   ├── router.py        # Central API v1 router
│   │   ├── auth.py          # /auth/register, /login, /refresh, /me
│   │   ├── documents.py     # /documents/upload, list, get, delete, status
│   │   ├── generate.py      # /generate/notes, bullets, cheatsheet, mcqs, testpaper
│   │   ├── materials.py     # /materials/ CRUD
│   │   └── chat.py          # /chat/ SSE streaming RAG endpoint
│   │
│   ├── models/
│   │   ├── base.py          # DeclarativeBase + TimestampMixin
│   │   ├── user.py          # User model
│   │   ├── document.py      # Document model (FileType, DocumentStatus enums)
│   │   ├── study_material.py# StudyMaterial model (MaterialType enum)
│   │   ├── mcq.py           # MCQ model (AnswerChoice enum)
│   │   └── test_paper.py    # TestPaper model
│   │
│   ├── schemas/
│   │   ├── common.py        # BaseResponse[T] generic envelope + ok()/fail() helpers
│   │   ├── auth.py          # Register/Login/Token schemas
│   │   ├── document.py      # Document schemas + PaginatedDocuments
│   │   ├── generate.py      # All generation request + output schemas
│   │   ├── mcq.py           # MCQ response schemas
│   │   └── test_paper.py    # TestPaper response schema
│   │
│   ├── services/
│   │   ├── auth_service.py      # Register (duplicate check), login, refresh
│   │   ├── document_service.py  # Upload (MIME + size validate), CRUD, status update
│   │   ├── generate_service.py  # Notes, bullets, cheat sheet, MCQs, test paper generation
│   │   ├── material_service.py  # Material CRUD with ownership verification
│   │   └── chat_service.py      # RAG retrieval + streaming chat
│   │
│   ├── ai/
│   │   ├── ai_service.py    # Unified AIService (complete, complete_json, stream, embed)
│   │   ├── prompts.py       # All prompt template constants
│   │   ├── rag.py           # RAGService (ingest, retrieve, delete)
│   │   └── parser.py        # DocumentParser (PDF, PPTX, DOCX, TXT)
│   │
│   ├── core/
│   │   ├── security.py      # bcrypt hash/verify, JWT create/decode
│   │   ├── dependencies.py  # get_current_user, get_current_user_from_refresh, type aliases
│   │   ├── exceptions.py    # MindoraException hierarchy (400/401/403/404/409)
│   │   └── middleware.py    # Request logging (X-Request-ID, timing)
│   │
│   ├── tasks/
│   │   ├── celery_app.py        # Celery app factory (Redis broker)
│   │   ├── document_tasks.py    # process_document (parse → embed → ready/failed)
│   │   └── generation_tasks.py  # async_generate_material (optional async path)
│   │
│   └── db/
│       ├── session.py       # Async engine + AsyncSessionLocal + get_db()
│       └── init_db.py       # create_all tables on startup
│
├── alembic/                 # DB migration scripts
├── uploads/                 # File storage (gitignored, .gitkeep tracked)
├── .env.example             # Environment variable template
├── .gitignore
├── Dockerfile
└── requirements.txt
```

---

## API Endpoints

### Auth `/api/v1/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | Public | Create account |
| `POST` | `/login` | Public | Email + password → JWT pair |
| `POST` | `/refresh` | Refresh token | New access token |
| `GET` | `/me` | Access token | Current user profile |

### Documents `/api/v1/documents`

| Method | Path | Description |
|---|---|---|
| `POST` | `/upload` | Upload file → enqueues Celery task → returns `document_id` |
| `GET` | `/` | Paginated list of user's documents |
| `GET` | `/{id}` | Full document details |
| `DELETE` | `/{id}` | Delete document + file + ChromaDB embeddings |
| `GET` | `/{id}/status` | Lightweight status poll (`pending`/`processing`/`ready`/`failed`) |

### Generate `/api/v1/generate`

| Method | Path | Body |
|---|---|---|
| `POST` | `/notes` | `{ document_id }` |
| `POST` | `/bullets` | `{ document_id }` |
| `POST` | `/cheatsheet` | `{ document_id }` |
| `POST` | `/mcqs` | `{ document_id, count: 10|20|50 }` |
| `POST` | `/testpaper` | `{ document_id, mcq_count, short_count, long_count }` |

### Materials `/api/v1/materials`

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | List all materials (filter by `?material_type=...`) |
| `GET` | `/{id}` | Full material with MCQ rows if type=mcq_set |
| `DELETE` | `/{id}` | Hard delete |

### Chat `/api/v1/chat`

| Method | Path | Description |
|---|---|---|
| `POST` | `/` | SSE streaming RAG Q&A — body: `{ document_id, message, conversation_history? }` |

---

## All API responses follow this envelope

```json
{
  "success": true,
  "data": { ... },
  "message": "Human-readable status"
}
```

---

## Local Development Setup

### 1. Prerequisites
- Python 3.10+
- PostgreSQL 15 (with pgvector extension)
- Redis 7
- *(Optional)* Docker & Docker Compose

### 2. Virtual Environment

```bash
cd backend
python -m venv venv

# Windows
.\\venv\\Scripts\\activate

# Linux / Mac
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env — set SECRET_KEY, JWT_SECRET_KEY, OPENAI_API_KEY, DATABASE_URL
```

### 4. Database Migrations

```bash
alembic upgrade head
```

### 5. Start the API

```bash
uvicorn app.main:app --reload --port 8000
```

### 6. Start Celery Worker (separate terminal)

```bash
celery -A app.tasks.celery_app worker --loglevel=info
```

| URL | Description |
|---|---|
| http://localhost:8000/api/docs | Swagger UI |
| http://localhost:8000/api/redoc | ReDoc |
| http://localhost:8000/health | Health check |

---

## Docker Compose (Full Stack)

From the **project root**:

```bash
# Copy and configure environment
cp backend/.env.example backend/.env
# Edit backend/.env

# Launch all services
docker-compose up -d --build
```

Services launched:

| Container | Description | Port |
|---|---|---|
| `mindora_api` | FastAPI application | `8000` |
| `mindora_db` | PostgreSQL 15 + pgvector | `5433` |
| `mindora_redis` | Redis 7 | `6379` |
| `mindora_worker` | Celery worker (4 concurrency) | — |
| `mindora_chroma` | ChromaDB vector store | `8001` |

---

## Using Ollama (Offline Mode)

1. Install and start [Ollama](https://ollama.ai): `ollama pull llama3 && ollama serve`
2. Set in `.env`:
   ```env
   USE_OLLAMA=True
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama3
   ```

> **Note:** Ollama does not support JSON mode natively — the AI service handles JSON
> extraction manually with markdown code fence stripping.

---

## Security Notes

- Passwords: bcrypt with 12 rounds minimum
- JWT: HS256, 30-min access tokens, 7-day refresh tokens
- File uploads: MIME type validated server-side (not just extension); filename sanitized via UUID rename
- All private routes require `get_current_user` dependency
- Internal errors are logged but never exposed to clients (generic 500 message returned)
- Secrets: never hardcoded — always read from environment via Pydantic settings

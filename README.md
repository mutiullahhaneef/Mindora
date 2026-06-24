# 🌌 Mindora

### *Turn any lecture into exam-ready material in 30 seconds.*

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql)](https://www.postgresql.org)
[![pgvector](https://img.shields.io/badge/pgvector-336791?style=for-the-badge)](https://github.com/pgvector/pgvector)
[![Celery](https://img.shields.io/badge/Celery-37814A?style=for-the-badge&logo=celery)](https://docs.celeryq.dev)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com)

**Mindora** is an AI-powered academic operating system that transforms raw study material — PDFs, papers, lecture notes — into structured quizzes, flashcards, summaries, and research insights. Built for students and researchers who want to learn faster, not just harder.

---

## 🚀 Key Advantages

| Pain Point | Mindora's Solution |
| :--- | :--- |
| **Drowning in lecture PDFs** | AI parses and structures documents instantly |
| **Re-reading entire papers** | Intelligent summarization & section-level extraction |
| **Writing quizzes manually** | Auto-generated custom flashcards and MCQs from your content |
| **Losing track of research** | Semantic search across all uploaded papers |
| **Studying without feedback** | Gamified XP, badges, streaks, and progress tracking |

---

## ✨ Features

- 📁 **Document Upload & Parsing** — Upload PDFs, PPTXs, DOCXs, and TXT files. The engine extracts, chunks, and indexes your content automatically.
- 🧠 **AI Study Pack Generation** — Instant quizzes, flashcards, key bullet points, and comprehensive study notes generated directly from document contexts.
- 🔍 **Research Assistant & SSE Chat** — Semantic paper search with citation extraction, section-level summaries, and real-time streaming Q&A (RAG) over your library.
- 🎮 **Gamification Engine** — Track your streaks, earn badges, and watch your XP grow as you complete quizzes and review study materials.
- 🔐 **Secure Authentication** — Enterprise-grade JWT-based access & refresh token flow with secure profile management.

---

## 🏛️ System Architecture

```mermaid
graph TD
    User[Client / React App] <-->|HTTP / SSE| API[FastAPI Gateway]
    API <-->|SQLAlchemy / Async| DB[(PostgreSQL + pgvector)]
    API <-->|Celery Client| RedisBroker[(Redis Queue)]
    RedisBroker <--> CeleryWorker[Celery Background Worker]
    CeleryWorker -->|Text Extraction| DocumentParser[Document Parser]
    CeleryWorker -->|Embedding Generation| Embed[AI Embedding Service]
    CeleryWorker -->|Vector Indexing| ChromaDB[(ChromaDB Vector Store)]
    API <-->|RAG Retrieval| ChromaDB
    API <-->|AI Tasks| LLM[Claude / OpenAI / Ollama]
```

---

## 📁 Repository Structure

```
Mindora/
├── backend/                    # FastAPI Python backend
│   ├── app/
│   │   ├── main.py             # App factory & entry point
│   │   ├── config.py           # Pydantic settings (env-driven)
│   │   ├── api/v1/             # Route handlers (auth, documents, generate, materials, chat)
│   │   ├── models/             # SQLAlchemy ORM models (User, Document, MCQ, Paper)
│   │   ├── services/           # Business logic (auth, document processing, AI orchestration)
│   │   ├── tasks/              # Celery async tasks (parse + embed)
│   │   └── db/                 # Database session management
│   ├── alembic/                # Database migration scripts
│   ├── uploads/                # User-uploaded file storage
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/                   # React + Vite + TypeScript frontend
│   ├── src/
│   │   ├── App.tsx             # Root component & routing configuration
│   │   ├── main.tsx            # React application entry point
│   │   ├── pages/              # Page components (Auth, Dashboard, Study, Research, Achievements, Settings)
│   │   ├── components/         # Reusable UI widgets & Layout wrappers
│   │   ├── lib/                # API clients, Zustand state stores, custom hooks
│   │   └── styles/             # Global CSS variables, design system & layouts
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
└── docker-compose.yml          # Full-stack orchestration (API, DB, Redis, Celery, Chroma)
```

---

## 🗄️ Recommended Database

**PostgreSQL with the `pgvector` extension** is the best and officially recommended database for Mindora. 

While SQLite can be used for quick local development (as seen in the default `.env`), PostgreSQL is highly recommended for production, heavy concurrent background task processing via Celery, and robust relational data management. The `pgvector` extension prepares it for high-performance vector similarity search directly in SQL.

### How to set it up:

**Option 1: Using Docker (Easiest)**
The easiest way to run the recommended database locally is via Docker. You can use the pre-configured service in `docker-compose.yml`, or run it standalone:
```bash
docker run --name mindora_db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=mindora -p 5433:5432 -d pgvector/pgvector:pg15
```

**Option 2: Native Installation**
1. Install [PostgreSQL 15+](https://www.postgresql.org/download/).
2. Install the [pgvector extension](https://github.com/pgvector/pgvector#installation) following their official guide.
3. Create a database named `mindora`.
4. Connect to your database and run: `CREATE EXTENSION vector;`
5. Update your backend `.env` file with the connection string (using the asyncpg driver):
   ```env
   DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5433/mindora
   ```

---

## 🛠️ Quick Start

### Option A: Docker Compose (Recommended)

1. Clone the repository and navigate to the project directory:
   ```bash
   git clone https://github.com/your-username/mindora.git
   cd mindora
   ```

2. Copy the environment template and configure your secrets:
   ```bash
   cp backend/.env.example backend/.env
   ```

3. Launch the containerized services:
   ```bash
   docker-compose up -d --build
   ```

#### Service URLs
- **Frontend App**: `http://localhost:5173` (Proxied to backend)
- **Backend API**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/api/docs`
- **ChromaDB instance**: `http://localhost:8001`

---

### Option B: Local Manual Setup

#### 1. Backend Setup
Ensure you have Python 3.10+, PostgreSQL (with pgvector), and Redis installed.

```bash
cd backend
python -m venv venv

# Activate Virtual Environment
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install Dependencies
pip install -r requirements.txt

# Configure Environment Variables
cp .env.example .env  # Update secrets and database URLs

# Run Database Migrations
alembic upgrade head

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```

Start the Celery worker in a separate terminal:
```bash
celery -A app.tasks.celery_app worker --loglevel=info
```

---

#### 2. Frontend Setup
Ensure you have Node.js 18+ installed.

```bash
cd frontend
npm install
npm run dev
```

The React development server runs on `http://localhost:5173`.

---

## 🔒 Environment Variable Configuration

Below are the primary configuration variables required in your `.env` file:

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string (asyncpg driver required). |
| `REDIS_URL` | Redis connection URL for Celery task queuing. |
| `SECRET_KEY` | Application secret key for internal security. |
| `JWT_SECRET_KEY` | Secret key used for signing JWT auth tokens. |
| `OPENAI_API_KEY` | OpenAI API token for fallback LLM features. |
| `USE_OLLAMA` | Set to `True` to enable local offline inference using Ollama. |
| `OLLAMA_BASE_URL` | URL endpoint for your local Ollama instance (default: `http://localhost:11434`). |

---

## 📖 Sub-Package Documentation

Detailed setup instructions and architectural blueprints for individual sub-packages can be found here:
- 🐍 [Backend Setup & Architecture Guide](./backend/README.md)
- ⚛️ [Frontend Component & Routing Guide](./frontend/README.md)

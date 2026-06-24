"""
RAG Service — ChromaDB-based document retrieval pipeline.
Handles ingestion (chunking + embedding) and retrieval for the chat endpoint.
"""
import logging
from typing import TYPE_CHECKING

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.config import settings
from app.ai.ai_service import ai_service

logger = logging.getLogger(__name__)

# ─── Chunking constants ────────────────────────────────────────────────────────
CHUNK_SIZE = 500        # approximate tokens per chunk (using chars as proxy: ~4 chars/token → 2000 chars)
CHUNK_OVERLAP = 50      # overlap tokens between chunks (~200 chars)
CHARS_PER_TOKEN = 4     # rough estimate


def _chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """
    Split text into overlapping chunks based on approximate token count.
    Uses character-level approximation: tokens ≈ chars / 4.
    """
    char_size = chunk_size * CHARS_PER_TOKEN
    char_overlap = overlap * CHARS_PER_TOKEN

    chunks: list[str] = []
    start = 0
    text_len = len(text)

    while start < text_len:
        end = min(start + char_size, text_len)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start += char_size - char_overlap

    return chunks


class RAGService:
    """ChromaDB-backed vector retrieval service."""

    def __init__(self) -> None:
        self._client = chromadb.PersistentClient(
            path=settings.CHROMA_PERSIST_DIR,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        self._collection = self._client.get_or_create_collection(
            name=settings.CHROMA_COLLECTION,
            metadata={"hnsw:space": "cosine"},
        )

    # ─── Ingest ────────────────────────────────────────────────────────────

    async def ingest_document(self, document_id: str, raw_text: str) -> int:
        """
        Chunk raw_text, embed each chunk, and store in ChromaDB.
        Idempotent — deletes existing chunks for document_id before inserting.
        Returns number of chunks stored.
        """
        # Remove any existing embeddings for this document
        await self.delete_document(document_id)

        chunks = _chunk_text(raw_text)
        if not chunks:
            logger.warning("No chunks generated for document %s", document_id)
            return 0

        logger.info("Ingesting %d chunks for document %s", len(chunks), document_id)

        ids: list[str] = []
        embeddings: list[list[float]] = []
        metadatas: list[dict] = []
        documents: list[str] = []

        for idx, chunk in enumerate(chunks):
            embedding = await ai_service.embed(chunk)
            ids.append(f"{document_id}_{idx}")
            embeddings.append(embedding)
            metadatas.append({"document_id": document_id, "chunk_index": idx})
            documents.append(chunk)

        self._collection.add(
            ids=ids,
            embeddings=embeddings,
            metadatas=metadatas,
            documents=documents,
        )

        logger.info("Ingested %d chunks for document %s", len(chunks), document_id)
        return len(chunks)

    # ─── Retrieve ──────────────────────────────────────────────────────────

    async def retrieve(
        self, document_id: str, query: str, top_k: int = 5
    ) -> list[str]:
        """
        Embed query and perform cosine similarity search filtered by document_id.
        Returns top_k text chunks sorted by relevance.
        """
        query_embedding = await ai_service.embed(query)

        results = self._collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where={"document_id": document_id},
        )

        docs = results.get("documents", [[]])[0]
        return [d for d in docs if d]

    # ─── Delete ────────────────────────────────────────────────────────────

    async def delete_document(self, document_id: str) -> None:
        """Delete all chunks associated with the given document_id."""
        try:
            existing = self._collection.get(
                where={"document_id": document_id},
                include=[],
            )
            ids_to_delete = existing.get("ids", [])
            if ids_to_delete:
                self._collection.delete(ids=ids_to_delete)
                logger.info(
                    "Deleted %d ChromaDB chunks for document %s",
                    len(ids_to_delete),
                    document_id,
                )
        except Exception as exc:
            logger.warning("ChromaDB delete_document failed for %s: %s", document_id, exc)

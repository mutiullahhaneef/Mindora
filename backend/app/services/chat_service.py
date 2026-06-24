"""
Chat Service — RAG-powered conversational document Q&A.
"""
import logging
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.document import Document, DocumentStatus
from app.models.user import User
from app.ai.ai_service import ai_service
from app.ai.rag import RAGService
from app.ai.prompts import RAG_CHAT_SYSTEM_PROMPT
from app.core.exceptions import NotFoundError, ForbiddenError, DocumentNotReadyError

logger = logging.getLogger(__name__)


class ChatService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.rag = RAGService()

    async def stream_response(
        self,
        document_id: str,
        message: str,
        user: User,
        conversation_history: list[dict] | None = None,
    ) -> AsyncGenerator[str, None]:
        """
        RAG-powered streaming chat response.

        Pipeline:
          1. Verify document ownership and ready status
          2. Retrieve top-5 relevant chunks from ChromaDB
          3. Build system prompt with retrieved context
          4. Stream response from AIService with conversation history
        """
        # Verify document
        result = await self.db.execute(
            select(Document).where(Document.id == document_id)
        )
        doc = result.scalar_one_or_none()
        if not doc:
            raise NotFoundError("Document")
        if doc.user_id != user.id:
            raise ForbiddenError()
        if doc.status != DocumentStatus.ready:
            raise DocumentNotReadyError()

        # Retrieve relevant context chunks
        chunks = await self.rag.retrieve(document_id, message, top_k=5)
        context = "\n\n---\n\n".join(chunks) if chunks else "No relevant excerpts found."
        logger.info("Retrieved %d chunks for chat on document %s", len(chunks), document_id)

        # Build the system prompt
        system = RAG_CHAT_SYSTEM_PROMPT.format(context=context)

        # Build the user prompt including conversation history
        history_text = ""
        if conversation_history:
            for turn in conversation_history[-6:]:  # Keep last 3 turns (6 messages)
                role = turn.get("role", "user")
                content = turn.get("content", "")
                history_text += f"\n{role.capitalize()}: {content}"

        full_prompt = f"{history_text}\nUser: {message}" if history_text else message

        # Stream AI response
        async for chunk in ai_service.stream(full_prompt, system=system):
            yield chunk

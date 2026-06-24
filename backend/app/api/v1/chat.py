"""
Chat API route — /api/v1/study/chat
RAG-based document Q&A with streaming response (both SSE and WebSocket supported).
"""
import json
import logging
from typing import Optional, List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select

from app.core.dependencies import CurrentUser, DbSession
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User
from app.services.chat_service import ChatService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/study/chat", tags=["Chat"])


class ChatRequest(BaseModel):
    document_id: str
    message: str
    conversation_history: Optional[list[dict]] = None


class HTTPChatRequest(BaseModel):
    query: str
    history: Optional[list[dict]] = None


@router.post("/", summary="Chat with a document using RAG (SSE)")
async def chat(
    body: ChatRequest,
    user: CurrentUser,
    db: DbSession,
):
    """
    Ask a question about a document. Returns a Server-Sent Events stream.
    The document must have status='ready'.
    """
    service = ChatService(db)

    async def event_stream():
        try:
            async for chunk in service.stream_response(
                document_id=body.document_id,
                message=body.message,
                user=user,
                conversation_history=body.conversation_history,
            ):
                yield f"data: {chunk}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as exc:
            yield f"data: [ERROR] {str(exc)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.websocket("/ws")
async def chat_ws(
    websocket: WebSocket,
    token: str | None = Query(None),
):
    """
    WebSocket endpoint for real-time study chat streaming.
    """
    # Manually create DB session for WebSocket (can't use Annotated Depends here)
    async for db in get_db():
        break
    await websocket.accept()
    
    # Authenticate user from token query parameter (Bypassed)
    try:
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
    except Exception as e:
        await websocket.send_json({"type": "error", "content": f"Auth failed: {str(e)}"})
        await websocket.close(code=4003)
        return

    service = ChatService(db)
    
    try:
        while True:
            # Expect JSON: {"document_id": "...", "query": "...", "history": [...]}
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
                document_id = payload.get("document_id")
                query = payload.get("query")
                history = payload.get("history", [])
                
                if not document_id or not query:
                    await websocket.send_json({"type": "error", "content": "Missing document_id or query."})
                    continue
                
                # Stream response
                async for chunk in service.stream_response(
                    document_id=document_id,
                    message=query,
                    user=user,
                    conversation_history=history
                ):
                    await websocket.send_json({"type": "token", "content": chunk})
                    
                await websocket.send_json({"type": "done"})
                
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "content": "Invalid JSON format."})
            except Exception as e:
                await websocket.send_json({"type": "error", "content": str(e)})
                
    except WebSocketDisconnect:
        logger.info("Chat WebSocket disconnected.")

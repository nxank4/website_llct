"""
RAG Chat Endpoint for AI Server

This endpoint handles RAG (Retrieval-Augmented Generation) chat queries
with caching, streaming, and JWT authentication.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
import logging
import uuid

from ....middleware.auth import auth_middleware, security
from ....services.file_search_service import file_search_service
from ....services.upstash_redis import upstash_redis
from ....core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


class AiSdkMessage(BaseModel):
    id: Optional[str] = None
    role: Optional[str] = None
    content: Optional[str] = None
    parts: Optional[List[Dict[str, Any]]] = None


class ChatRequest(BaseModel):
    """Chat request model (hỗ trợ cả AI SDK payload)"""

    # Dạng chuẩn của server
    message: Optional[str] = None
    subject_id: Optional[int] = None

    # Trường bổ sung để tương thích AI SDK v5
    id: Optional[str] = None
    model: Optional[str] = None
    type: Optional[str] = None
    messages: Optional[List[AiSdkMessage]] = None
    trigger: Optional[str] = None


@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Stream RAG chat response with caching (async).

    Flow:
    1. Verify JWT token
    2. Check cache (Upstash Redis)
    3. If cache hit, return cached response
    4. If cache miss:
       - Perform RAG query using LangChain (pgvector via Supabase)
       - Stream response from Gemini via LangChain
       - Cache response while streaming
       - Stream response to client (SSE)
    """
    try:
        # Verify JWT and get user ID
        user_id = auth_middleware.get_user_id_from_token(credentials)
        logger.info(f"Chat request from user_id: {user_id}")

        # Chuẩn hóa message từ hai dạng payload
        effective_message: Optional[str] = request.message
        if not effective_message and request.messages:
            # Lấy message cuối cùng của user
            for m in reversed(request.messages):
                if (m.role or "").lower() == "user":
                    if m.content and m.content.strip():
                        effective_message = m.content.strip()
                        break
                    if m.parts:
                        for part in m.parts:
                            if isinstance(part, str) and part.strip():
                                effective_message = part.strip()
                                break
                            if isinstance(part, dict):
                                text_val = part.get("text")
                                if isinstance(text_val, str) and text_val.strip():
                                    effective_message = text_val.strip()
                                    break
                        if effective_message:
                            break

        if not effective_message:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=[
                    {
                        "type": "missing",
                        "loc": ["body", "message"],
                        "msg": "Field required",
                        "input": "AI SDK payload missing 'message'",
                    }
                ],
            )

        # Check cache first (include chatbot_type in cache key)
        chatbot_type = (
            request.type or "learning"
        )  # Default to "learning" if not specified
        cache_key = f"{chatbot_type}:{effective_message}"
        cached_response = upstash_redis.get_chat_cache(cache_key)
        if cached_response:
            logger.info(
                f"Cache hit for {chatbot_type} chatbot query: {effective_message[:50]}..."
            )

            # Return cached response as streaming (AI SDK v5 SSE format)
            async def stream_cached():
                message_id = f"msg_{uuid.uuid4().hex}"
                # Start message
                yield f"data: {json.dumps({'type': 'start', 'messageId': message_id})}\n\n"
                # Start text block
                yield f"data: {json.dumps({'type': 'text-start', 'id': message_id})}\n\n"
                # Stream text chunks
                chunk_size = 10
                for i in range(0, len(cached_response), chunk_size):
                    chunk = cached_response[i : i + chunk_size]
                    yield f"data: {json.dumps({'type': 'text-delta', 'id': message_id, 'delta': chunk})}\n\n"
                # End text block
                yield f"data: {json.dumps({'type': 'text-end', 'id': message_id})}\n\n"
                # Finish message (AI SDK v5 format - no 'reason' field)
                yield f"data: {json.dumps({'type': 'finish'})}\n\n"

            return StreamingResponse(
                stream_cached(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Cache": "HIT",
                },
            )

        # Cache miss - perform File Search query
        chatbot_type = (
            request.type or "learning"
        )  # Default to "learning" if not specified
        logger.info(
            f"Cache miss for query ({chatbot_type} chatbot): {effective_message[:50]}..."
        )

        # Stream response from Gemini File Search
        full_response = ""

        async def generate_response():
            nonlocal full_response
            message_id = f"msg_{uuid.uuid4().hex}"
            try:
                # Start message
                yield f"data: {json.dumps({'type': 'start', 'messageId': message_id})}\n\n"
                # Start text block
                yield f"data: {json.dumps({'type': 'text-start', 'id': message_id})}\n\n"

                # Stream AI response from File Search with chatbot type
                async for chunk in file_search_service.get_chat_response_stream(
                    effective_message,
                    chatbot_type=chatbot_type,
                ):
                    full_response += chunk
                    # AI SDK v5 expects SSE format with JSON
                    yield f"data: {json.dumps({'type': 'text-delta', 'id': message_id, 'delta': chunk})}\n\n"

                # End text block
                yield f"data: {json.dumps({'type': 'text-end', 'id': message_id})}\n\n"
                # Finish message (AI SDK v5 format - no 'reason' field)
                yield f"data: {json.dumps({'type': 'finish'})}\n\n"

                # Save complete response to cache (include chatbot_type in cache key for differentiation)
                if full_response:
                    cache_key = f"{chatbot_type}:{effective_message}"
                    upstash_redis.set_chat_cache(
                        cache_key, full_response, ttl=settings.CACHE_TTL_SECONDS
                    )
                    logger.info(
                        f"Cached response for {chatbot_type} chatbot query: {effective_message[:50]}..."
                    )

            except Exception as e:
                logger.error(
                    f"Error in streaming response for {chatbot_type} chatbot: {e}"
                )
                error_payload = {
                    "type": "error",
                    "id": message_id,
                    "errorText": str(e),
                }
                yield f"data: {json.dumps(error_payload)}\n\n"
                yield f"data: {json.dumps({'type': 'finish'})}\n\n"

        return StreamingResponse(
            generate_response(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Cache": "MISS",
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in chat stream endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process chat request: {str(e)}",
        )


# Alias: hỗ trợ POST /api/v1/chat (không cần /stream)
@router.post("")
async def chat_stream_alias(
    request: ChatRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    return await chat_stream(request, credentials)

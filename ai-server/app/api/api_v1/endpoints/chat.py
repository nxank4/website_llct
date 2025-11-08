"""
RAG Chat Endpoint for AI Server

This endpoint handles RAG (Retrieval-Augmented Generation) chat queries
with caching, streaming, and JWT authentication.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import json
import logging

from ....core.database import get_db
from ....middleware.auth import auth_middleware
from ....services.rag_service import RagService
from ....services.gemini_client import gemini_client
from ....services.upstash_redis import upstash_redis
from ....core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

rag_service = RagService()


class ChatRequest(BaseModel):
    """Chat request model"""
    message: str
    subject_id: Optional[int] = None


@router.post("/stream")
def chat_stream(
    request: ChatRequest,
    credentials: HTTPAuthorizationCredentials = Depends(auth_middleware.security),
    db: Session = Depends(get_db),
):
    """
    Stream RAG chat response with caching.
    
    Flow:
    1. Verify JWT token
    2. Check cache (Upstash Redis)
    3. If cache hit, return cached response
    4. If cache miss:
       - Perform RAG query (pgvector on Pooler Port 6543)
       - Call Gemini API with streaming
       - Cache response while streaming
       - Stream response to client (SSE)
    """
    try:
        # Verify JWT and get user ID
        user_id = auth_middleware.get_user_id_from_token(credentials)
        logger.info(f"Chat request from user_id: {user_id}")
        
        # Check cache first
        cached_response = upstash_redis.get_chat_cache(request.message)
        if cached_response:
            logger.info(f"Cache hit for query: {request.message[:50]}...")
            
            # Return cached response as streaming
            def stream_cached():
                yield cached_response
            
            return StreamingResponse(
                stream_cached(),
                media_type="text/plain",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Cache": "HIT",
                }
            )
        
        # Cache miss - perform RAG query
        logger.info(f"Cache miss for query: {request.message[:50]}...")
        
        # Get relevant context from RAG
        context = rag_service.get_relevant_context_from_text(
            db, request.message, limit=settings.RAG_TOP_K
        )
        
        # Stream response from Gemini
        full_response = ""
        
        def generate_response():
            nonlocal full_response
            try:
                # Stream AI response
                for chunk in gemini_client.generate_streaming_response(
                    request.message,
                    context=context,
                    subject=None  # Can be enhanced with subject_id
                ):
                    full_response += chunk
                    yield chunk
                
                # Save complete response to cache
                if full_response:
                    upstash_redis.set_chat_cache(
                        request.message,
                        full_response,
                        ttl=settings.RAG_TTL_SECONDS
                    )
                    logger.info(f"Cached response for query: {request.message[:50]}...")
                
            except Exception as e:
                logger.error(f"Error in streaming response: {e}")
                yield f"\n\n[Error: {str(e)}]"
        
        return StreamingResponse(
            generate_response(),
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Cache": "MISS",
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in chat stream endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process chat request: {str(e)}"
        )


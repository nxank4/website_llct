from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import json
import logging
from ....core.database import get_db
from ....models.chat import ChatSession, ChatMessage, ChatType, MessageRole
from ....models.user import User
from ....ai.gemini_client import gemini_client
from ....services.rag_service import RagService

# NOTE: redis_service removed - server/ does not use Redis according to system architecture
from ....middleware.auth import get_current_user
from ....schemas.chat import (
    ChatSessionCreate,
    ChatSessionResponse,
    ChatMessageCreate,
    ChatMessageResponse,
    ChatStreamResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/sessions", response_model=ChatSessionResponse)
def create_chat_session(
    session_data: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new chat session"""
    try:
        chat_session = ChatSession(
            user_id=current_user.id,
            chat_type=session_data.chat_type,
            subject_id=session_data.subject_id,
            title=session_data.title,
            context=session_data.context,
        )

        db.add(chat_session)
        db.commit()
        db.refresh(chat_session)

        return chat_session

    except Exception as e:
        logger.error(f"Error creating chat session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create chat session",
        )


@router.get("/sessions", response_model=List[ChatSessionResponse])
def get_user_chat_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 20,
):
    """Get user's chat sessions"""
    try:
        sessions = (
            db.query(ChatSession)
            .filter(
                ChatSession.user_id == current_user.id, ChatSession.is_active == True
            )
            .offset(skip)
            .limit(limit)
            .all()
        )

        return sessions

    except Exception as e:
        logger.error(f"Error getting chat sessions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get chat sessions",
        )


@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
def get_chat_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get specific chat session"""
    try:
        session = (
            db.query(ChatSession)
            .filter(
                ChatSession.id == session_id, ChatSession.user_id == current_user.id
            )
            .first()
        )

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found"
            )

        return session

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting chat session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get chat session",
        )


@router.post("/sessions/{session_id}/messages", response_model=ChatMessageResponse)
def send_message(
    session_id: int,
    message_data: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a message in chat session"""
    try:
        # Get chat session
        session = (
            db.query(ChatSession)
            .filter(
                ChatSession.id == session_id, ChatSession.user_id == current_user.id
            )
            .first()
        )

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found"
            )

        # Save user message
        user_message = ChatMessage(
            session_id=session_id, role=MessageRole.USER, content=message_data.content
        )
        db.add(user_message)
        db.commit()

        # Get relevant context for RAG
        context = ""
        if session.chat_type == ChatType.Q_AND_A and session.subject_id:
            context = RagService().get_relevant_context_from_text(
                db, message_data.content
            )

        # Generate AI response
        ai_response = gemini_client.generate_chat_response(
            message_data.content,
            context=context,
            subject=session.subject.name if session.subject else None,
        )

        # Save AI response
        ai_message = ChatMessage(
            session_id=session_id, role=MessageRole.ASSISTANT, content=ai_response
        )
        db.add(ai_message)
        db.commit()
        db.refresh(ai_message)

        return ai_message

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send message",
        )


@router.post("/sessions/{session_id}/stream")
def stream_chat_response(
    session_id: int,
    message_data: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Stream AI response for real-time chat"""
    try:
        # Get chat session
        session = (
            db.query(ChatSession)
            .filter(
                ChatSession.id == session_id, ChatSession.user_id == current_user.id
            )
            .first()
        )

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found"
            )

        # Save user message
        user_message = ChatMessage(
            session_id=session_id, role=MessageRole.USER, content=message_data.content
        )
        db.add(user_message)
        db.commit()

        # Get relevant context for RAG
        context = ""
        if session.chat_type == ChatType.Q_AND_A and session.subject_id:
            context = RagService().get_relevant_context_from_text(
                db, message_data.content
            )

        def generate_response():
            try:
                # Stream AI response
                for chunk in gemini_client.generate_streaming_response(
                    message_data.content,
                    context=context,
                    subject=session.subject.name if session.subject else None,
                ):
                    yield f"data: {json.dumps({'content': chunk, 'type': 'chunk'})}\n\n"

                # Save complete AI response
                ai_message = ChatMessage(
                    session_id=session_id,
                    role=MessageRole.ASSISTANT,
                    content=ai_response,
                )
                db.add(ai_message)
                db.commit()

                yield f"data: {json.dumps({'type': 'complete'})}\n\n"

            except Exception as e:
                logger.error(f"Error in streaming response: {e}")
                yield f"data: {json.dumps({'error': str(e), 'type': 'error'})}\n\n"

        return StreamingResponse(
            generate_response(),
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error streaming chat response: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to stream response",
        )


@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
def get_chat_messages(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 50,
):
    """Get messages from chat session"""
    try:
        # Verify session ownership
        session = (
            db.query(ChatSession)
            .filter(
                ChatSession.id == session_id, ChatSession.user_id == current_user.id
            )
            .first()
        )

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found"
            )

        messages = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at)
            .offset(skip)
            .limit(limit)
            .all()
        )

        return messages

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting chat messages: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get messages",
        )


@router.delete("/sessions/{session_id}")
def delete_chat_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete chat session"""
    try:
        session = (
            db.query(ChatSession)
            .filter(
                ChatSession.id == session_id, ChatSession.user_id == current_user.id
            )
            .first()
        )

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found"
            )

        session.is_active = False
        db.commit()

        return {"message": "Chat session deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting chat session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete chat session",
        )

"""Chat/AI Mentor router: Session management and messaging."""
from datetime import datetime
from uuid import UUID
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.security import get_current_active_user
from app.ai_service import generate_mentor_response

router = APIRouter(prefix="/chat", tags=["AI Mentor Chat"])


@router.get("/sessions", response_model=List[schemas.ChatSessionResponse])
def get_chat_sessions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get all chat sessions for the authenticated user."""
    sessions = (
        db.query(models.ChatSession)
        .filter(models.ChatSession.user_id == current_user.id)
        .order_by(models.ChatSession.updated_at.desc())
        .all()
    )
    return sessions


@router.post("/sessions", response_model=schemas.ChatSessionResponse, status_code=status.HTTP_201_CREATED)
def create_chat_session(
    payload: schemas.ChatSessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Create a new chat session."""
    title = payload.title or "New Chat Session"
    session = models.ChatSession(
        user_id=current_user.id,
        title=title
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.delete("/sessions/{session_id}", response_model=schemas.MessageResponse)
def delete_chat_session(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Delete a chat session and its message history."""
    session = (
        db.query(models.ChatSession)
        .filter(models.ChatSession.id == session_id, models.ChatSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    
    db.delete(session)
    db.commit()
    return {"message": "Chat session deleted successfully", "success": True}


@router.get("/sessions/{session_id}/messages", response_model=List[schemas.ChatMessageResponse])
def get_chat_messages(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get all messages in a specific chat session."""
    session = (
        db.query(models.ChatSession)
        .filter(models.ChatSession.id == session_id, models.ChatSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    
    return session.messages


@router.post("/sessions/{session_id}/messages", response_model=schemas.ChatMessageResponse, status_code=status.HTTP_201_CREATED)
def send_chat_message(
    session_id: UUID,
    payload: schemas.ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Send a user message, trigger AI Mentor response, save and return assistant's response."""
    session = (
        db.query(models.ChatSession)
        .filter(models.ChatSession.id == session_id, models.ChatSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )

    # 1. Save user's message
    user_msg = models.ChatMessage(
        session_id=session.id,
        role="user",
        content=payload.content
    )
    db.add(user_msg)
    
    # 2. Update session title if it was the default "New Chat Session"
    if session.title == "New Chat Session":
        # Snippet user message for title (first 40 characters)
        session.title = payload.content[:40] + ("..." if len(payload.content) > 40 else "")

    # 3. Retrieve chat history in this session
    # Force loading/refreshing current state to include user_msg
    db.commit()
    db.refresh(session)
    
    chat_history = [
        {"role": msg.role, "content": msg.content}
        for msg in session.messages
    ]

    # 4. Compile user context if onboarding/personality profile is present
    user_profile_context = None
    if current_user.personality_profile:
        pp = current_user.personality_profile
        user_profile_context = {
            "personality_type": pp.personality_type,
            "personality_summary": pp.personality_summary,
            "goals": current_user.profile.goals if current_user.profile else [],
            "interests": current_user.profile.interests if current_user.profile else [],
            "strengths": pp.identified_strengths,
            "skills_to_learn": current_user.onboarding_response.skills_to_learn if current_user.onboarding_response else [],
        }

    # 5. Generate assistant response
    assistant_content = generate_mentor_response(chat_history, user_profile_context)

    # 6. Save assistant response
    assistant_msg = models.ChatMessage(
        session_id=session.id,
        role="assistant",
        content=assistant_content
    )
    db.add(assistant_msg)
    
    # 7. Update session updated_at timestamp
    session.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(assistant_msg)

    return assistant_msg

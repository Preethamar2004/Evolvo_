import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.security import get_current_active_user
from app import guild_service
from app.guild_schemas import (
    GuildCreate,
    GuildUpdate,
    GuildChatSend,
    GuildChallengeCreate,
    ChallengeProgressUpdate,
    GuildResponse,
    GuildDetailResponse,
    GuildMemberResponse,
    GuildChatMessageResponse,
    GuildChallengeResponse,
    GuildLeaderboardEntry,
    GuildRecommendation,
)

router = APIRouter(prefix="/guilds", tags=["Guilds"])


@router.post("/seed", status_code=status.HTTP_200_OK)
def seed_guilds(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Seed the default interest-based guilds and achievements."""
    return guild_service.seed_default_guilds(db)


@router.get("/", response_model=List[GuildResponse])
def get_guilds(
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """List public guilds with search and category filtering."""
    return guild_service.list_guilds(db, category=category, search=search)


@router.post("/", response_model=GuildResponse, status_code=status.HTTP_201_CREATED)
def create_new_guild(
    payload: GuildCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Create a new user-managed guild."""
    return guild_service.create_guild(db, current_user, payload)


@router.get("/recommendations", response_model=List[GuildRecommendation])
def get_recommended_guilds(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Get AI-powered guild recommendations for the current user."""
    return guild_service.recommend_guilds(db, current_user)


@router.get("/leaderboard", response_model=List[GuildLeaderboardEntry])
def get_global_guild_leaderboard(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Get global guild leaderboard ranked by XP."""
    return guild_service.get_guild_leaderboard(db, limit=limit)


@router.get("/{guild_id}", response_model=GuildDetailResponse)
def get_guild(
    guild_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Get detailed information about a guild (chat, members, challenges, achievements)."""
    return guild_service.get_guild_detail(db, current_user, guild_id)


@router.patch("/{guild_id}", response_model=GuildResponse)
def update_guild_settings(
    guild_id: uuid.UUID,
    payload: GuildUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Update settings of a guild (owner/admin only)."""
    return guild_service.update_guild(db, current_user, guild_id, payload)


@router.post("/{guild_id}/join", response_model=GuildMemberResponse)
def join_a_guild(
    guild_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Join a public guild."""
    return guild_service.join_guild(db, current_user, guild_id)


@router.post("/{guild_id}/leave")
def leave_a_guild(
    guild_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Leave a guild."""
    success = guild_service.leave_guild(db, current_user, guild_id)
    return {"message": "Successfully left the guild" if success else "Failed to leave"}


@router.post("/{guild_id}/chat", response_model=GuildChatMessageResponse)
def send_message(
    guild_id: uuid.UUID,
    payload: GuildChatSend,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Send a chat message to a guild."""
    return guild_service.send_chat_message(db, current_user, guild_id, payload.content)


@router.get("/{guild_id}/chat", response_model=List[GuildChatMessageResponse])
def get_messages(
    guild_id: uuid.UUID,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Get recent chat messages from a guild."""
    return guild_service.get_chat_messages(db, guild_id, limit=limit)


@router.post("/{guild_id}/challenges", response_model=GuildChallengeResponse, status_code=status.HTTP_201_CREATED)
def create_guild_challenge(
    guild_id: uuid.UUID,
    payload: GuildChallengeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Create a new group challenge in the guild (owner/admin only)."""
    return guild_service.create_challenge(db, current_user, guild_id, payload)


@router.post("/challenges/{challenge_id}/join")
def join_guild_challenge(
    challenge_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Join an active guild challenge."""
    guild_service.join_challenge(db, current_user, challenge_id)
    return {"message": "Successfully joined the challenge"}


@router.post("/challenges/{challenge_id}/progress")
def log_guild_challenge_progress(
    challenge_id: uuid.UUID,
    payload: ChallengeProgressUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Log progress for a guild challenge."""
    return guild_service.log_challenge_progress(db, current_user, challenge_id, payload.increment)


@router.get("/{guild_id}/members/leaderboard")
def get_guild_member_leaderboard(
    guild_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Get internal guild leaderboard for members."""
    return guild_service.get_member_leaderboard(db, guild_id)

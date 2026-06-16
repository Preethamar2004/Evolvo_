import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, field_validator
from app.models import GuildCategory, GuildMemberRole, GuildChallengeStatus


# ─── Request Schemas ──────────────────────────────────────────────────────────

class GuildCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: GuildCategory
    icon: Optional[str] = "🛡️"
    is_public: bool = True
    max_members: int = 100

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v_stripped = v.strip()
        if len(v_stripped) < 3 or len(v_stripped) > 100:
            raise ValueError("Guild name must be between 3 and 100 characters")
        return v_stripped


class GuildUpdate(BaseModel):
    description: Optional[str] = None
    icon: Optional[str] = None
    banner_url: Optional[str] = None
    is_public: Optional[bool] = None
    max_members: Optional[int] = None


class GuildChatSend(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("Chat content cannot be empty")
        return v_stripped


class GuildChallengeCreate(BaseModel):
    title: str
    description: Optional[str] = None
    xp_reward: int = 100
    target_count: int = 1
    ends_at: datetime


class ChallengeProgressUpdate(BaseModel):
    increment: int = 1


# ─── Response Schemas ─────────────────────────────────────────────────────────

class GuildResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: Optional[str]
    category: GuildCategory
    icon: Optional[str]
    banner_url: Optional[str]
    is_public: bool
    max_members: int
    xp: int
    level: int
    member_count: int
    created_by: Optional[uuid.UUID]
    created_at: datetime

    class Config:
        from_attributes = True


class GuildMemberResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    username: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    role: GuildMemberRole
    xp_contributed: int
    joined_at: datetime

    class Config:
        from_attributes = True


class GuildChatMessageResponse(BaseModel):
    id: uuid.UUID
    guild_id: uuid.UUID
    user_id: uuid.UUID
    username: str
    avatar_url: Optional[str]
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class GuildChallengeResponse(BaseModel):
    id: uuid.UUID
    guild_id: uuid.UUID
    title: str
    description: Optional[str]
    xp_reward: int
    target_count: int
    status: GuildChallengeStatus
    starts_at: datetime
    ends_at: datetime
    participants_count: int = 0
    user_progress: Optional[int] = None
    user_completed: bool = False

    class Config:
        from_attributes = True


class GuildAchievementResponse(BaseModel):
    id: uuid.UUID
    guild_id: uuid.UUID
    title: str
    description: Optional[str]
    icon: Optional[str]
    xp_reward: int
    unlocked: bool
    unlocked_at: Optional[datetime]

    class Config:
        from_attributes = True


class GuildDetailResponse(BaseModel):
    guild: GuildResponse
    members: List[GuildMemberResponse]
    recent_chat: List[GuildChatMessageResponse]
    challenges: List[GuildChallengeResponse]
    achievements: List[GuildAchievementResponse]
    user_role: Optional[GuildMemberRole] = None

    class Config:
        from_attributes = True


class GuildLeaderboardEntry(BaseModel):
    guild_id: uuid.UUID
    guild_name: str
    guild_icon: Optional[str]
    category: GuildCategory
    total_xp: int
    level: int
    member_count: int
    rank: int

    class Config:
        from_attributes = True


class GuildRecommendation(BaseModel):
    guild_id: uuid.UUID
    guild_name: str
    guild_icon: Optional[str]
    category: GuildCategory
    description: Optional[str]
    member_count: int
    reason: str

    class Config:
        from_attributes = True

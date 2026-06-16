import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, field_validator, model_validator
import re


# ─── Token Schemas ───────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[str] = None
    username: Optional[str] = None


# ─── Auth Schemas ─────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if len(v) < 3 or len(v) > 50:
            raise ValueError("Username must be between 3 and 50 characters")
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError("Username can only contain letters, numbers, underscores, and hyphens")
        return v.lower()

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one digit")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "username": "evolvouser",
                "password": "SecurePass123",
                "full_name": "John Doe"
            }
        }


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "SecurePass123"
            }
        }


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one digit")
        return v


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


# ─── Profile Schemas ──────────────────────────────────────────────────────────

class UserProfileBase(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    age: Optional[int] = None
    country: Optional[str] = None
    skills: Optional[List[str]] = []
    interests: Optional[List[str]] = []
    hobbies: Optional[List[str]] = []
    goals: Optional[List[str]] = []
    social_links: Optional[Dict[str, str]] = {}


class UserProfileUpdate(UserProfileBase):
    @field_validator("age")
    @classmethod
    def validate_age(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and (v < 13 or v > 120):
            raise ValueError("Age must be between 13 and 120")
        return v


class UserProfileResponse(UserProfileBase):
    id: uuid.UUID
    user_id: uuid.UUID
    avatar_url: Optional[str] = None
    banner_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Gamification Schemas ─────────────────────────────────────────────────────

class GamificationResponse(BaseModel):
    xp: int
    level: int
    total_xp_earned: int
    streak_days: int
    xp_to_next_level: int
    level_progress_percent: float

    class Config:
        from_attributes = True


# ─── Mission Schemas ──────────────────────────────────────────────────────────

class MissionResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str]
    xp_reward: int
    difficulty: Optional[str]
    category: Optional[str]
    icon: Optional[str]
    status: str
    progress: float
    started_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Achievement Schemas ──────────────────────────────────────────────────────

class AchievementResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str]
    icon: Optional[str]
    xp_reward: int
    rarity: str
    earned_at: datetime

    class Config:
        from_attributes = True


# ─── User Schemas ─────────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    username: str
    role: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login: Optional[datetime]
    profile: Optional[UserProfileResponse] = None

    class Config:
        from_attributes = True


class UserDashboardResponse(BaseModel):
    user: UserResponse
    gamification: Optional[GamificationResponse] = None
    active_missions: List[MissionResponse] = []
    recent_achievements: List[AchievementResponse] = []
    achievement_count: int = 0

    class Config:
        from_attributes = True


# ─── Generic Response ─────────────────────────────────────────────────────────

class MessageResponse(BaseModel):
    message: str
    success: bool = True


# ─── Chat Schemas ────────────────────────────────────────────────────────────

class ChatMessageCreate(BaseModel):
    content: str


class ChatMessageResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSessionCreate(BaseModel):
    title: Optional[str] = None


class ChatSessionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChatSessionDetailResponse(ChatSessionResponse):
    messages: List[ChatMessageResponse] = []

    class Config:
        from_attributes = True


# ─── Social Network Schemas ──────────────────────────────────────────────────

class SocialUserResponse(BaseModel):
    id: uuid.UUID
    username: str
    profile: Optional[UserProfileResponse] = None

    class Config:
        from_attributes = True


class PostCreate(BaseModel):
    content: Optional[str] = None
    media_url: Optional[str] = None
    media_type: Optional[str] = None # "image" or "video"
    post_type: str = "text" # "text", "achievement", "mission_completion", "progress"
    achievement_id: Optional[uuid.UUID] = None
    mission_id: Optional[uuid.UUID] = None
    xp_gained: int = 0


class PostLikeResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    post_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True


class PostCommentCreate(BaseModel):
    content: str


class PostCommentResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    post_id: uuid.UUID
    content: str
    created_at: datetime
    user: SocialUserResponse

    class Config:
        from_attributes = True


class PostResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    content: Optional[str]
    media_url: Optional[str]
    media_type: Optional[str]
    post_type: str
    achievement_id: Optional[uuid.UUID]
    mission_id: Optional[uuid.UUID]
    xp_gained: int
    created_at: datetime
    updated_at: datetime
    user: SocialUserResponse
    likes: List[PostLikeResponse] = []
    comments_count: int = 0
    likes_count: int = 0
    growth_score: float = 0.0

    class Config:
        from_attributes = True


class FriendRequestCreate(BaseModel):
    receiver_id: uuid.UUID


class FriendRequestResponse(BaseModel):
    id: uuid.UUID
    sender_id: uuid.UUID
    receiver_id: uuid.UUID
    status: str
    created_at: datetime
    sender: SocialUserResponse
    receiver: SocialUserResponse

    class Config:
        from_attributes = True


class NotificationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    sender_id: uuid.UUID
    notification_type: str
    post_id: Optional[uuid.UUID]
    is_read: bool
    created_at: datetime
    sender: SocialUserResponse
    post: Optional[PostResponse] = None

    class Config:
        from_attributes = True


class FollowStatusResponse(BaseModel):
    is_following: bool


# ─── Analytics Schemas ────────────────────────────────────────────────────────

class XPLogResponse(BaseModel):
    id: uuid.UUID
    xp_amount: int
    source: str
    category: Optional[str]
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class DashboardAnalyticsResponse(BaseModel):
    xp_growth: List[dict] # {"date": "YYYY-MM-DD", "cumulative_xp": int, "daily_xp": int}
    category_distribution: Dict[str, int]
    mission_statistics: dict
    forecast: dict


# ─── Future Self Schemas ──────────────────────────────────────────────────────

class FutureSelfSimulationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    simulations: List[dict]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Entertainment Schemas ────────────────────────────────────────────────────

class MovieChallengeResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str]
    director: Optional[str]
    year: Optional[int]
    genre: Optional[str]
    poster_url: Optional[str]
    xp_reward: int
    quiz_data: Optional[dict]
    is_active: bool

    class Config:
        from_attributes = True


class GamingTournamentResponse(BaseModel):
    id: uuid.UUID
    title: str
    game_name: str
    description: Optional[str]
    xp_reward: int
    starts_at: datetime
    ends_at: datetime
    status: str
    participants_count: int = 0

    class Config:
        from_attributes = True


class SportsChallengeCreate(BaseModel):
    activity_type: str
    target_description: str
    target_value: int


class SportsChallengeResponse(BaseModel):
    id: uuid.UUID
    activity_type: str
    target_description: str
    target_value: int
    current_value: int
    xp_reward: int
    status: str
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class FunQuestResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str]
    quest_type: str
    xp_reward: int
    difficulty: str

    class Config:
        from_attributes = True

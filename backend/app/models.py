import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, Integer, Float, Text,
    DateTime, ForeignKey, ARRAY, Enum as SAEnum, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class UserRole(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"
    MODERATOR = "moderator"


class User(Base):
    """Core user account model."""
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.USER, nullable=False)

    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    onboarding_complete = Column(Boolean, default=False, nullable=False)

    # Password reset
    password_reset_token = Column(String(255), nullable=True)
    password_reset_expires = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    gamification = relationship("UserGamification", back_populates="user", uselist=False, cascade="all, delete-orphan")
    missions = relationship("UserMission", back_populates="user", cascade="all, delete-orphan")
    achievements = relationship("UserAchievement", back_populates="user", cascade="all, delete-orphan")
    onboarding_response = relationship("OnboardingResponse", back_populates="user", uselist=False, cascade="all, delete-orphan")
    personality_profile = relationship("PersonalityProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    
    posts = relationship("Post", back_populates="user", cascade="all, delete-orphan")
    likes = relationship("PostLike", back_populates="user", cascade="all, delete-orphan")
    comments = relationship("PostComment", back_populates="user", cascade="all, delete-orphan")
    
    sent_friend_requests = relationship("FriendRequest", foreign_keys="FriendRequest.sender_id", back_populates="sender", cascade="all, delete-orphan")
    received_friend_requests = relationship("FriendRequest", foreign_keys="FriendRequest.receiver_id", back_populates="receiver", cascade="all, delete-orphan")
    
    notifications_received = relationship("Notification", foreign_keys="Notification.user_id", back_populates="user", cascade="all, delete-orphan")
    notifications_sent = relationship("Notification", foreign_keys="Notification.sender_id", back_populates="sender", cascade="all, delete-orphan")
    guild_memberships = relationship("GuildMember", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.username}>"


class UserProfile(Base):
    """Extended user profile information."""
    __tablename__ = "user_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)

    # Personal Info
    full_name = Column(String(150), nullable=True)
    bio = Column(Text, nullable=True)
    age = Column(Integer, nullable=True)
    country = Column(String(100), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    banner_url = Column(String(500), nullable=True)

    # Interests & Goals (stored as arrays)
    skills = Column(ARRAY(String), default=list, nullable=False, server_default="{}")
    interests = Column(ARRAY(String), default=list, nullable=False, server_default="{}")
    hobbies = Column(ARRAY(String), default=list, nullable=False, server_default="{}")
    goals = Column(ARRAY(String), default=list, nullable=False, server_default="{}")

    # Social Links
    social_links = Column(JSONB, default=dict, nullable=False, server_default="{}")

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationship
    user = relationship("User", back_populates="profile")

    def __repr__(self):
        return f"<UserProfile user_id={self.user_id}>"


class UserGamification(Base):
    """User XP, level, and gamification data."""
    __tablename__ = "user_gamification"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)

    xp = Column(Integer, default=0, nullable=False)
    level = Column(Integer, default=1, nullable=False)
    total_xp_earned = Column(Integer, default=0, nullable=False)
    streak_days = Column(Integer, default=0, nullable=False)
    last_activity_date = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="gamification")

    def __repr__(self):
        return f"<UserGamification user_id={self.user_id} level={self.level} xp={self.xp}>"


class MissionStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"


class MissionType(str, enum.Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    PERMANENT = "permanent"


class Mission(Base):
    """Mission/quest definitions."""
    __tablename__ = "missions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    xp_reward = Column(Integer, default=0, nullable=False)
    difficulty = Column(String(50), nullable=True)   # easy / medium / hard / legendary
    category = Column(String(100), nullable=True)    # Education / Fitness / etc.
    icon = Column(String(100), nullable=True)
    mission_type = Column(SAEnum(MissionType), default=MissionType.PERMANENT, nullable=False)
    target_count = Column(Integer, default=1, nullable=False)  # steps needed
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user_missions = relationship("UserMission", back_populates="mission")

    def __repr__(self):
        return f"<Mission {self.title}>"


class UserMission(Base):
    """User's progress on missions."""
    __tablename__ = "user_missions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    mission_id = Column(UUID(as_uuid=True), ForeignKey("missions.id", ondelete="CASCADE"), nullable=False)

    status = Column(SAEnum(MissionStatus), default=MissionStatus.ACTIVE, nullable=False)
    progress = Column(Float, default=0.0, nullable=False)   # 0.0 → 1.0
    current_count = Column(Integer, default=0, nullable=False)  # step counter
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)   # for daily/weekly/monthly

    # Relationships
    user = relationship("User", back_populates="missions")
    mission = relationship("Mission", back_populates="user_missions")

    def __repr__(self):
        return f"<UserMission user_id={self.user_id} mission_id={self.mission_id}>"


class Achievement(Base):
    """Achievement definitions."""
    __tablename__ = "achievements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(100), nullable=True)
    xp_reward = Column(Integer, default=0, nullable=False)
    rarity = Column(String(50), default="common", nullable=False)  # common/rare/epic/legendary
    badge_color = Column(String(20), nullable=True)  # hex color for badge
    # Unlock conditions (checked by AchievementEngine)
    condition_type = Column(String(100), nullable=True)  # missions_completed / xp_earned / streak_days / level_reached
    condition_value = Column(Integer, default=0, nullable=False)
    condition_category = Column(String(100), nullable=True)  # optional category filter
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user_achievements = relationship("UserAchievement", back_populates="achievement")

    def __repr__(self):
        return f"<Achievement {self.title}>"


class UserAchievement(Base):
    """Achievements earned by users."""
    __tablename__ = "user_achievements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    achievement_id = Column(UUID(as_uuid=True), ForeignKey("achievements.id", ondelete="CASCADE"), nullable=False)

    earned_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="achievements")
    achievement = relationship("Achievement", back_populates="user_achievements")

    def __repr__(self):
        return f"<UserAchievement user_id={self.user_id} achievement_id={self.achievement_id}>"


# ─── Onboarding & AI Personality Models ──────────────────────────

class OnboardingResponse(Base):
    """Stores the raw answers from the onboarding questionnaire."""
    __tablename__ = "onboarding_responses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)

    # The 10 onboarding questions — stored as arrays of answers
    hobbies        = Column(ARRAY(String), default=list, nullable=False, server_default="{}")
    interests      = Column(ARRAY(String), default=list, nullable=False, server_default="{}")
    sports         = Column(ARRAY(String), default=list, nullable=False, server_default="{}")
    movies         = Column(ARRAY(String), default=list, nullable=False, server_default="{}")
    games          = Column(ARRAY(String), default=list, nullable=False, server_default="{}")
    skills_to_learn = Column(ARRAY(String), default=list, nullable=False, server_default="{}")
    career_goals   = Column(ARRAY(String), default=list, nullable=False, server_default="{}")
    personal_goals = Column(ARRAY(String), default=list, nullable=False, server_default="{}")
    strengths      = Column(ARRAY(String), default=list, nullable=False, server_default="{}")
    areas_to_improve = Column(ARRAY(String), default=list, nullable=False, server_default="{}")

    # Timestamps
    submitted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at   = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationship
    user = relationship("User", back_populates="onboarding_response")

    def __repr__(self):
        return f"<OnboardingResponse user_id={self.user_id}>"


class PersonalityProfile(Base):
    """AI-generated personality analysis from onboarding answers."""
    __tablename__ = "personality_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)

    # ── Personality Type ──────────────────────────────────────────
    personality_type  = Column(String(100), nullable=True)   # e.g. "The Visionary Creator"
    personality_emoji = Column(String(10), nullable=True)    # e.g. "🚀"
    personality_summary = Column(Text, nullable=True)        # 2-3 sentence overview

    # ── Six Scores (0–100) ────────────────────────────────────────
    knowledge_score    = Column(Integer, default=0, nullable=False)
    fitness_score      = Column(Integer, default=0, nullable=False)
    creativity_score   = Column(Integer, default=0, nullable=False)
    leadership_score   = Column(Integer, default=0, nullable=False)
    communication_score = Column(Integer, default=0, nullable=False)
    social_score       = Column(Integer, default=0, nullable=False)

    # ── AI Insights (stored as arrays) ───────────────────────────
    identified_strengths      = Column(ARRAY(String), default=list, nullable=False, server_default="{}")
    identified_weaknesses     = Column(ARRAY(String), default=list, nullable=False, server_default="{}")
    growth_opportunities      = Column(ARRAY(String), default=list, nullable=False, server_default="{}")
    motivation_style          = Column(String(200), nullable=True)  # e.g. "Achievement-driven"
    motivation_description    = Column(Text, nullable=True)

    # ── Recommended Paths ─────────────────────────────────────────
    recommended_missions      = Column(ARRAY(String), default=list, nullable=False, server_default="{}")
    recommended_skills        = Column(ARRAY(String), default=list, nullable=False, server_default="{}")
    archetype_tags            = Column(ARRAY(String), default=list, nullable=False, server_default="{}")

    # ── Raw AI response (for debugging / re-analysis) ─────────────
    raw_ai_response = Column(JSONB, default=dict, nullable=False, server_default="{}")

    # Timestamps
    generated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at   = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationship
    user = relationship("User", back_populates="personality_profile")

    def __repr__(self):
        return f"<PersonalityProfile user_id={self.user_id} type={self.personality_type}>"


class ChatSession(Base):
    """Stores a user's conversational session with the AI Mentor."""
    __tablename__ = "chat_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), default="New Chat Session", nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.created_at")

    def __repr__(self):
        return f"<ChatSession id={self.id} title={self.title}>"


class ChatMessage(Base):
    """Stores individual messages within a ChatSession."""
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(50), nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    session = relationship("ChatSession", back_populates="messages")

    def __repr__(self):
        return f"<ChatMessage id={self.id} role={self.role}>"


class Post(Base):
    """Stores user posts, achievements shared, progress logs, and completions."""
    __tablename__ = "posts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=True)
    
    media_url = Column(String(500), nullable=True)
    media_type = Column(String(50), nullable=True) # "image" or "video"
    
    post_type = Column(String(50), default="text", nullable=False) # "text", "achievement", "mission_completion", "progress"
    
    achievement_id = Column(UUID(as_uuid=True), ForeignKey("achievements.id", ondelete="SET NULL"), nullable=True)
    mission_id = Column(UUID(as_uuid=True), ForeignKey("missions.id", ondelete="SET NULL"), nullable=True)
    xp_gained = Column(Integer, default=0, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="posts")
    likes = relationship("PostLike", back_populates="post", cascade="all, delete-orphan")
    comments = relationship("PostComment", back_populates="post", cascade="all, delete-orphan")
    achievement = relationship("Achievement")
    mission = relationship("Mission")

    def __repr__(self):
        return f"<Post id={self.id} type={self.post_type} user={self.user_id}>"


class PostLike(Base):
    """User likes on posts."""
    __tablename__ = "post_likes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="likes")
    post = relationship("Post", back_populates="likes")

    def __repr__(self):
        return f"<PostLike user={self.user_id} post={self.post_id}>"


class PostComment(Base):
    """Comments left by users on posts."""
    __tablename__ = "post_comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="comments")
    post = relationship("Post", back_populates="comments")

    def __repr__(self):
        return f"<PostComment user={self.user_id} post={self.post_id}>"


class UserFollow(Base):
    """User following status."""
    __tablename__ = "user_follows"

    follower_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    following_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class FriendRequest(Base):
    """Friend requests sent between users."""
    __tablename__ = "friend_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    receiver_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), default="pending", nullable=False) # "pending", "accepted", "declined"
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_friend_requests")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_friend_requests")

    def __repr__(self):
        return f"<FriendRequest sender={self.sender_id} receiver={self.receiver_id} status={self.status}>"


class Notification(Base):
    """Notifications sent to users for interactive updates."""
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False) # Recipient
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False) # Actor
    notification_type = Column(String(50), nullable=False) # "like", "comment", "follow", "friend_request", "achievement_shared"
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="notifications_received")
    sender = relationship("User", foreign_keys=[sender_id], back_populates="notifications_sent")
    post = relationship("Post")

    def __repr__(self):
        return f"<Notification type={self.notification_type} recipient={self.user_id} read={self.is_read}>"


class GuildCategory(str, enum.Enum):
    AI = "ai"
    CRICKET = "cricket"
    GAMING = "gaming"
    MOVIE = "movie"
    STARTUP = "startup"
    FITNESS = "fitness"
    EDUCATION = "education"
    PROGRAMMING = "programming"
    CREATIVITY = "creativity"
    OTHER = "other"


class Guild(Base):
    __tablename__ = "guilds"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(SAEnum(GuildCategory), nullable=False)
    icon = Column(String(100), nullable=True)
    banner_url = Column(String(500), nullable=True)
    is_public = Column(Boolean, default=True, nullable=False)
    max_members = Column(Integer, default=100, nullable=False)
    xp = Column(Integer, default=0, nullable=False)
    level = Column(Integer, default=1, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    members = relationship("GuildMember", back_populates="guild", cascade="all, delete-orphan")
    chat_messages = relationship("GuildChatMessage", back_populates="guild", cascade="all, delete-orphan")
    challenges = relationship("GuildChallenge", back_populates="guild", cascade="all, delete-orphan")
    achievements = relationship("GuildAchievement", back_populates="guild", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Guild {self.name}>"


class GuildMemberRole(str, enum.Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"


class GuildMember(Base):
    __tablename__ = "guild_members"
    __table_args__ = (UniqueConstraint("guild_id", "user_id", name="uq_guild_user"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    guild_id = Column(UUID(as_uuid=True), ForeignKey("guilds.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(SAEnum(GuildMemberRole), default=GuildMemberRole.MEMBER, nullable=False)
    xp_contributed = Column(Integer, default=0, nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    guild = relationship("Guild", back_populates="members")
    user = relationship("User", back_populates="guild_memberships")

    def __repr__(self):
        return f"<GuildMember guild={self.guild_id} user={self.user_id} role={self.role}>"


class GuildChatMessage(Base):
    __tablename__ = "guild_chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    guild_id = Column(UUID(as_uuid=True), ForeignKey("guilds.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    guild = relationship("Guild", back_populates="chat_messages")
    user = relationship("User")

    def __repr__(self):
        return f"<GuildChatMessage guild={self.guild_id} user={self.user_id}>"


class GuildChallengeStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    EXPIRED = "expired"


class GuildChallenge(Base):
    __tablename__ = "guild_challenges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    guild_id = Column(UUID(as_uuid=True), ForeignKey("guilds.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    xp_reward = Column(Integer, default=0, nullable=False)
    target_count = Column(Integer, default=1, nullable=False)
    status = Column(SAEnum(GuildChallengeStatus), default=GuildChallengeStatus.ACTIVE, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    starts_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    ends_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    guild = relationship("Guild", back_populates="challenges")
    creator = relationship("User", foreign_keys=[created_by])
    participants = relationship("GuildChallengeParticipant", back_populates="challenge", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<GuildChallenge {self.title}>"


class GuildChallengeParticipant(Base):
    __tablename__ = "guild_challenge_participants"
    __table_args__ = (UniqueConstraint("challenge_id", "user_id", name="uq_challenge_user"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    challenge_id = Column(UUID(as_uuid=True), ForeignKey("guild_challenges.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    progress = Column(Integer, default=0, nullable=False)
    completed = Column(Boolean, default=False, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    challenge = relationship("GuildChallenge", back_populates="participants")
    user = relationship("User")

    def __repr__(self):
        return f"<GuildChallengeParticipant challenge={self.challenge_id} user={self.user_id}>"


class GuildAchievement(Base):
    __tablename__ = "guild_achievements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    guild_id = Column(UUID(as_uuid=True), ForeignKey("guilds.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(100), nullable=True)
    xp_reward = Column(Integer, default=0, nullable=False)
    condition_type = Column(String(100), nullable=False) # e.g. members_count, guild_xp, challenges_completed
    condition_value = Column(Integer, nullable=False)
    unlocked = Column(Boolean, default=False, nullable=False)
    unlocked_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    guild = relationship("Guild", back_populates="achievements")

    def __repr__(self):
        return f"<GuildAchievement {self.title}>"


# ─── Analytics & Growth (Phase 9) ─────────────────────────────────────────────

class XPLog(Base):
    """Tracks every instance of XP gained for growth analytics."""
    __tablename__ = "xp_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    xp_amount = Column(Integer, nullable=False)
    source = Column(String(100), nullable=False) # e.g., 'mission', 'achievement', 'tournament', 'sports'
    category = Column(String(100), nullable=True) # e.g., 'Fitness', 'Knowledge', 'Social'
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<XPLog user={self.user_id} xp={self.xp_amount} source={self.source}>"


# ─── Future Self Simulator (Phase 8) ──────────────────────────────────────────

class FutureSelfSimulation(Base):
    """Stores AI-generated future self simulations."""
    __tablename__ = "future_self_simulations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # JSON array containing the 5 future paths
    simulations = Column(JSONB, nullable=False, server_default="[]")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<FutureSelfSimulation user={self.user_id}>"


# ─── Entertainment System (Phase 7) ───────────────────────────────────────────

class MovieChallenge(Base):
    __tablename__ = "movie_challenges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    director = Column(String(150), nullable=True)
    year = Column(Integer, nullable=True)
    genre = Column(String(100), nullable=True)
    poster_url = Column(String(500), nullable=True)
    xp_reward = Column(Integer, default=50, nullable=False)
    
    # JSON containing the quiz questions
    quiz_data = Column(JSONB, nullable=True, server_default="{}")
    
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<MovieChallenge {self.title}>"


class MovieReview(Base):
    __tablename__ = "movie_reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    movie_id = Column(UUID(as_uuid=True), ForeignKey("movie_challenges.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Integer, nullable=False) # 1-5
    review_text = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<MovieReview user={self.user_id} movie={self.movie_id}>"


class MovieQuizAttempt(Base):
    __tablename__ = "movie_quiz_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    movie_id = Column(UUID(as_uuid=True), ForeignKey("movie_challenges.id", ondelete="CASCADE"), nullable=False)
    score = Column(Integer, nullable=False)
    max_score = Column(Integer, nullable=False)
    completed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<MovieQuizAttempt user={self.user_id} score={self.score}>"


class MovieComment(Base):
    __tablename__ = "movie_comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    movie_id = Column(UUID(as_uuid=True), ForeignKey("movie_challenges.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User")

    def __repr__(self):
        return f"<MovieComment user={self.user_id} movie={self.movie_id}>"


class GamingTournament(Base):
    __tablename__ = "gaming_tournaments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String(200), nullable=False)
    game_name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    xp_reward = Column(Integer, default=100, nullable=False)
    starts_at = Column(DateTime(timezone=True), nullable=False)
    ends_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(50), default="upcoming", nullable=False) # upcoming, active, completed
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<GamingTournament {self.title}>"


class GamingTournamentParticipant(Base):
    __tablename__ = "gaming_tournament_participants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tournament_id = Column(UUID(as_uuid=True), ForeignKey("gaming_tournaments.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    score = Column(Integer, default=0, nullable=False)
    registered_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User")

    def __repr__(self):
        return f"<GamingTournamentParticipant user={self.user_id} tournament={self.tournament_id}>"


class SportsChallenge(Base):
    __tablename__ = "sports_challenges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    activity_type = Column(String(100), nullable=False) # e.g., cricket_batting, running
    target_description = Column(String(255), nullable=False)
    target_value = Column(Integer, nullable=False)
    current_value = Column(Integer, default=0, nullable=False)
    xp_reward = Column(Integer, default=20, nullable=False)
    status = Column(String(50), default="active", nullable=False) # active, completed
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self):
        return f"<SportsChallenge user={self.user_id} type={self.activity_type}>"


class FunQuest(Base):
    __tablename__ = "fun_quests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    quest_type = Column(String(100), nullable=False) # random, social, exploration
    xp_reward = Column(Integer, default=30, nullable=False)
    difficulty = Column(String(50), default="easy", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<FunQuest {self.title}>"


class UserFunQuest(Base):
    __tablename__ = "user_fun_quests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    quest_id = Column(UUID(as_uuid=True), ForeignKey("fun_quests.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), default="active", nullable=False) # active, completed
    completed_at = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self):
        return f"<UserFunQuest user={self.user_id} quest={self.quest_id}>"

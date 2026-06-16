"""
Mission System Schemas — Evolvo Phase 3
Covers: missions, user-missions, achievements, leaderboard, badges & titles.
"""
import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


# ─── Enums / Constants ───────────────────────────────────────────────────────

MISSION_CATEGORIES = [
    "Education", "Programming", "AI Learning", "Sports", "Cricket",
    "Fitness", "Movies", "Gaming", "Communication", "Leadership",
    "Entrepreneurship", "Creativity",
]

DIFFICULTY_LEVELS = ["easy", "medium", "hard", "legendary"]

MISSION_TYPES = ["daily", "weekly", "monthly", "permanent"]


# ─── Mission Catalog Schemas ──────────────────────────────────────────────────

class MissionBase(BaseModel):
    title: str
    description: Optional[str] = None
    xp_reward: int = 50
    difficulty: str = "easy"
    category: str = "General"
    icon: Optional[str] = None
    mission_type: str = "permanent"  # daily / weekly / monthly / permanent
    target_count: int = 1           # e.g. "do 30 push-ups" → target=30


class MissionCreate(MissionBase):
    pass


class MissionOut(MissionBase):
    id: uuid.UUID
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── User Mission (progress tracking) ────────────────────────────────────────

class UserMissionOut(BaseModel):
    id: uuid.UUID
    mission_id: uuid.UUID
    title: str
    description: Optional[str]
    xp_reward: int
    difficulty: str
    category: str
    icon: Optional[str]
    mission_type: str
    target_count: int
    status: str          # active / completed / failed / paused
    progress: float      # 0.0 → 1.0
    current_count: int   # actual step counter
    started_at: datetime
    completed_at: Optional[datetime]
    expires_at: Optional[datetime]

    class Config:
        from_attributes = True


class MissionStartRequest(BaseModel):
    mission_id: uuid.UUID


class MissionProgressRequest(BaseModel):
    user_mission_id: uuid.UUID
    increment: int = 1   # how many steps to log


class MissionCompleteRequest(BaseModel):
    user_mission_id: uuid.UUID


# ─── Achievement Schemas ──────────────────────────────────────────────────────

class AchievementOut(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str]
    icon: Optional[str]
    xp_reward: int
    rarity: str          # common / rare / epic / legendary
    badge_color: Optional[str]
    earned_at: Optional[datetime] = None
    is_earned: bool = False

    class Config:
        from_attributes = True


# ─── Gamification / Leaderboard ───────────────────────────────────────────────

class LeaderboardEntry(BaseModel):
    rank: int
    username: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    level: int
    total_xp_earned: int
    streak_days: int
    achievement_count: int

    class Config:
        from_attributes = True


class LeaderboardResponse(BaseModel):
    entries: List[LeaderboardEntry]
    my_rank: Optional[int] = None
    total_players: int


# ─── Missions Page Response ───────────────────────────────────────────────────

class MissionsPageResponse(BaseModel):
    daily: List[UserMissionOut] = []
    weekly: List[UserMissionOut] = []
    monthly: List[UserMissionOut] = []
    active: List[UserMissionOut] = []
    completed: List[UserMissionOut] = []
    available: List[MissionOut] = []

    class Config:
        from_attributes = True


# ─── Achievements Page Response ───────────────────────────────────────────────

class AchievementsPageResponse(BaseModel):
    earned: List[AchievementOut] = []
    locked: List[AchievementOut] = []
    total_earned: int = 0
    total_xp_from_achievements: int = 0

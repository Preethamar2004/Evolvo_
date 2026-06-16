"""
Mission System Router — Evolvo Phase 3

Endpoints:
  GET  /missions/               → Full missions page data
  POST /missions/start          → Start a mission
  POST /missions/progress       → Log step progress
  POST /missions/complete       → Mark mission complete
  GET  /missions/achievements   → Achievements page
  GET  /missions/leaderboard    → Global leaderboard
  POST /missions/seed           → (Dev) Seed missions & achievements
  GET  /missions/available      → List all available missions
  GET  /missions/categories     → List all categories
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app import models
from app import mission_schemas as ms
from app import mission_service as svc
from app.database import get_db
from app.security import get_current_active_user

router = APIRouter(prefix="/missions", tags=["Missions"])


# ── Full page data ────────────────────────────────────────────────

@router.get("/", response_model=ms.MissionsPageResponse)
def get_missions_page(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Get full missions data: active, daily, weekly, monthly, completed, available."""
    return svc.get_missions_page(db, current_user)


# ── Start / Progress / Complete ────────────────────────────────────

@router.post("/start", response_model=ms.UserMissionOut)
def start_mission(
    payload: ms.MissionStartRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Assign a mission to the current user and begin tracking."""
    return svc.start_mission(db, current_user, payload.mission_id)


@router.post("/progress", response_model=ms.UserMissionOut)
def log_progress(
    payload: ms.MissionProgressRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Log step progress on an active user mission."""
    return svc.log_mission_progress(db, current_user, payload.user_mission_id, payload.increment)


@router.post("/complete", response_model=ms.UserMissionOut)
def complete_mission(
    payload: ms.MissionCompleteRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Mark a mission as 100% complete and award XP."""
    return svc.complete_mission(db, current_user, payload.user_mission_id)


# ── Achievements ───────────────────────────────────────────────────

@router.get("/achievements", response_model=ms.AchievementsPageResponse)
def get_achievements(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Get all achievements split into earned and locked."""
    return svc.get_achievements_page(db, current_user)


# ── Leaderboard ────────────────────────────────────────────────────

@router.get("/leaderboard", response_model=ms.LeaderboardResponse)
def get_leaderboard(
    limit: int = Query(default=50, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Global leaderboard sorted by total XP earned."""
    return svc.get_leaderboard(db, current_user, limit=limit)


# ── Available missions ─────────────────────────────────────────────

@router.get("/available")
def get_available_missions(
    category: Optional[str] = Query(default=None),
    mission_type: Optional[str] = Query(default=None),
    difficulty: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """List all available mission definitions with optional filters."""
    q = db.query(models.Mission).filter(models.Mission.is_active == True)
    if category:
        q = q.filter(models.Mission.category == category)
    if mission_type:
        q = q.filter(models.Mission.mission_type == mission_type)
    if difficulty:
        q = q.filter(models.Mission.difficulty == difficulty)

    missions = q.order_by(models.Mission.category, models.Mission.xp_reward).all()
    return [
        {
            "id": m.id,
            "title": m.title,
            "description": m.description,
            "xp_reward": m.xp_reward,
            "difficulty": m.difficulty,
            "category": m.category,
            "icon": m.icon,
            "mission_type": m.mission_type.value if hasattr(m.mission_type, 'value') else str(m.mission_type),
            "target_count": m.target_count,
            "is_active": m.is_active,
            "created_at": m.created_at,
        }
        for m in missions
    ]


# ── Categories ─────────────────────────────────────────────────────

@router.get("/categories")
def get_categories():
    """Return all available mission categories."""
    return {"categories": ms.MISSION_CATEGORIES}


# ── Seed (Dev only) ────────────────────────────────────────────────

@router.post("/seed")
def seed_data(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Seed missions and achievements database. Idempotent — safe to run multiple times."""
    result = svc.seed_missions_and_achievements(db)
    return {
        "success": True,
        "message": f"Seeded {result['missions_added']} missions and {result['achievements_added']} achievements.",
        **result
    }

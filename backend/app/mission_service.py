"""
Mission Service — Evolvo Phase 3

Business logic for:
- Listing available missions by category / type
- Starting / progressing / completing missions
- Achievement engine (auto-unlock on condition met)
- Streak management
- Leaderboard
- Data seeding
"""
from datetime import datetime, timedelta, date
from typing import Optional, List
import uuid

from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from fastapi import HTTPException, status

from app import models, mission_schemas
from app.security import calculate_level_from_xp


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _mission_expires_at(mission_type: str) -> Optional[datetime]:
    """Calculate expiry based on mission type."""
    now = datetime.utcnow()
    if mission_type == "daily":
        # Expires at midnight UTC
        tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        return tomorrow
    elif mission_type == "weekly":
        days_until_monday = (7 - now.weekday()) % 7 or 7
        return (now + timedelta(days=days_until_monday)).replace(hour=0, minute=0, second=0, microsecond=0)
    elif mission_type == "monthly":
        if now.month == 12:
            return now.replace(year=now.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        return now.replace(month=now.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0)
    return None


def _serialize_user_mission(um: models.UserMission, mission: models.Mission) -> dict:
    return {
        "id": um.id,
        "mission_id": mission.id,
        "title": mission.title,
        "description": mission.description,
        "xp_reward": mission.xp_reward,
        "difficulty": mission.difficulty or "easy",
        "category": mission.category or "General",
        "icon": mission.icon,
        "mission_type": mission.mission_type.value if hasattr(mission.mission_type, 'value') else str(mission.mission_type),
        "target_count": mission.target_count,
        "status": um.status.value if hasattr(um.status, 'value') else str(um.status),
        "progress": um.progress,
        "current_count": um.current_count,
        "started_at": um.started_at,
        "completed_at": um.completed_at,
        "expires_at": um.expires_at,
    }


# ─── Missions Service ─────────────────────────────────────────────────────────

def get_missions_page(db: Session, user: models.User) -> dict:
    """Aggregate all mission data for the missions page."""

    # User's in-progress and completed missions
    user_missions_q = (
        db.query(models.UserMission, models.Mission)
        .join(models.Mission, models.UserMission.mission_id == models.Mission.id)
        .filter(models.UserMission.user_id == user.id)
        .all()
    )

    daily, weekly, monthly, active, completed = [], [], [], [], []
    started_mission_ids = set()

    for um, m in user_missions_q:
        started_mission_ids.add(m.id)
        serialized = _serialize_user_mission(um, m)

        # Skip expired non-completed timed missions
        if um.expires_at and um.expires_at < datetime.utcnow() and um.status != models.MissionStatus.COMPLETED:
            continue

        mt = m.mission_type.value if hasattr(m.mission_type, 'value') else str(m.mission_type)
        if um.status == models.MissionStatus.COMPLETED:
            completed.append(serialized)
        elif mt == "daily":
            daily.append(serialized)
        elif mt == "weekly":
            weekly.append(serialized)
        elif mt == "monthly":
            monthly.append(serialized)
        else:
            active.append(serialized)

    # Available missions (not yet started)
    available_q = (
        db.query(models.Mission)
        .filter(
            models.Mission.is_active == True,
            ~models.Mission.id.in_(started_mission_ids) if started_mission_ids else True
        )
        .order_by(models.Mission.category, models.Mission.difficulty)
        .all()
    )

    available = []
    for m in available_q:
        available.append({
            "id": m.id,
            "title": m.title,
            "description": m.description,
            "xp_reward": m.xp_reward,
            "difficulty": m.difficulty or "easy",
            "category": m.category or "General",
            "icon": m.icon,
            "mission_type": m.mission_type.value if hasattr(m.mission_type, 'value') else str(m.mission_type),
            "target_count": m.target_count,
            "is_active": m.is_active,
            "created_at": m.created_at,
        })

    return {
        "daily": daily,
        "weekly": weekly,
        "monthly": monthly,
        "active": active,
        "completed": completed[:20],
        "available": available,
    }


def start_mission(db: Session, user: models.User, mission_id: uuid.UUID) -> dict:
    """Assign a mission to a user and begin tracking progress."""
    mission = db.query(models.Mission).filter(
        models.Mission.id == mission_id,
        models.Mission.is_active == True
    ).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    mt = mission.mission_type.value if hasattr(mission.mission_type, 'value') else str(mission.mission_type)

    # For timed missions, allow re-start after expiry
    existing = db.query(models.UserMission).filter(
        models.UserMission.user_id == user.id,
        models.UserMission.mission_id == mission_id
    ).first()

    if existing:
        if existing.status == models.MissionStatus.ACTIVE:
            raise HTTPException(status_code=409, detail="Mission already active")
        if existing.status == models.MissionStatus.COMPLETED and mt == "permanent":
            raise HTTPException(status_code=409, detail="Mission already completed")
        # Expired timed or failed mission — reset
        existing.status = models.MissionStatus.ACTIVE
        existing.progress = 0.0
        existing.current_count = 0
        existing.started_at = datetime.utcnow()
        existing.completed_at = None
        existing.expires_at = _mission_expires_at(mt)
        db.commit()
        db.refresh(existing)
        return _serialize_user_mission(existing, mission)

    um = models.UserMission(
        user_id=user.id,
        mission_id=mission.id,
        status=models.MissionStatus.ACTIVE,
        progress=0.0,
        current_count=0,
        expires_at=_mission_expires_at(mt),
    )
    db.add(um)
    db.commit()
    db.refresh(um)
    return _serialize_user_mission(um, mission)


def log_mission_progress(db: Session, user: models.User, user_mission_id: uuid.UUID, increment: int = 1) -> dict:
    """Increment progress on a user mission. Auto-completes when target reached."""
    um = db.query(models.UserMission).filter(
        models.UserMission.id == user_mission_id,
        models.UserMission.user_id == user.id
    ).first()
    if not um:
        raise HTTPException(status_code=404, detail="User mission not found")
    if um.status != models.MissionStatus.ACTIVE:
        raise HTTPException(status_code=400, detail=f"Mission is {um.status.value}, cannot log progress")

    mission = um.mission
    new_count = min(um.current_count + increment, mission.target_count)
    um.current_count = new_count
    um.progress = round(new_count / mission.target_count, 4)

    newly_completed = False
    if new_count >= mission.target_count:
        um.status = models.MissionStatus.COMPLETED
        um.completed_at = datetime.utcnow()
        newly_completed = True
        _award_xp(db, user, mission.xp_reward, source="mission", category=mission.category, description=f"Completed mission: {mission.title}")
        _update_streak(db, user)
        _run_achievement_engine(db, user)

    db.commit()
    db.refresh(um)
    return _serialize_user_mission(um, mission)


def complete_mission(db: Session, user: models.User, user_mission_id: uuid.UUID) -> dict:
    """Forcefully mark a mission complete (100% progress)."""
    return log_mission_progress(db, user, user_mission_id, increment=999999)


# ─── XP & Streak ─────────────────────────────────────────────────────────────

def _award_xp(db: Session, user: models.User, xp: int, source: str = "general", category: str = None, description: str = None):
    """Add XP to user gamification, recalculate level, and log to XPLog."""
    gam = db.query(models.UserGamification).filter(
        models.UserGamification.user_id == user.id
    ).first()
    if not gam:
        return
    gam.xp += xp
    gam.total_xp_earned += xp
    gam.level = calculate_level_from_xp(gam.total_xp_earned)
    
    xplog = models.XPLog(
        user_id=user.id,
        xp_amount=xp,
        source=source,
        category=category,
        description=description
    )
    db.add(xplog)
    db.flush()


def _update_streak(db: Session, user: models.User):
    """Update the daily activity streak."""
    gam = db.query(models.UserGamification).filter(
        models.UserGamification.user_id == user.id
    ).first()
    if not gam:
        return

    today = datetime.utcnow().date()
    last_date = gam.last_activity_date.date() if gam.last_activity_date else None

    if last_date is None:
        gam.streak_days = 1
    elif last_date == today:
        pass  # Already logged today
    elif last_date == today - timedelta(days=1):
        gam.streak_days += 1
    else:
        gam.streak_days = 1  # Streak broken

    gam.last_activity_date = datetime.utcnow()
    db.flush()


# ─── Achievement Engine ───────────────────────────────────────────────────────

def _run_achievement_engine(db: Session, user: models.User):
    """Check all unearned achievements and unlock any whose conditions are met."""
    # Already-earned IDs
    earned_ids = {
        ua.achievement_id
        for ua in db.query(models.UserAchievement).filter(
            models.UserAchievement.user_id == user.id
        ).all()
    }

    # All active achievements not yet earned
    candidates = db.query(models.Achievement).filter(
        models.Achievement.is_active == True,
        ~models.Achievement.id.in_(earned_ids) if earned_ids else True
    ).all()

    gam = db.query(models.UserGamification).filter(
        models.UserGamification.user_id == user.id
    ).first()

    for ach in candidates:
        if _check_achievement_condition(db, user, gam, ach):
            ua = models.UserAchievement(user_id=user.id, achievement_id=ach.id)
            db.add(ua)
            # Bonus XP for achievement
            if gam and ach.xp_reward > 0:
                _award_xp(db, user, ach.xp_reward, source="achievement", category=ach.condition_category, description=f"Unlocked achievement: {ach.title}")

    db.flush()


def _check_achievement_condition(db: Session, user: models.User, gam, ach: models.Achievement) -> bool:
    """Evaluate a single achievement condition."""
    ct = ach.condition_type
    val = ach.condition_value
    cat = ach.condition_category

    if not ct:
        return False

    if ct == "missions_completed":
        q = db.query(func.count(models.UserMission.id)).filter(
            models.UserMission.user_id == user.id,
            models.UserMission.status == models.MissionStatus.COMPLETED,
        )
        if cat:
            q = q.join(models.Mission).filter(models.Mission.category == cat)
        return q.scalar() >= val

    elif ct == "xp_earned":
        return (gam.total_xp_earned if gam else 0) >= val

    elif ct == "streak_days":
        return (gam.streak_days if gam else 0) >= val

    elif ct == "level_reached":
        return (gam.level if gam else 1) >= val

    return False


# ─── Achievements Page ────────────────────────────────────────────────────────

def get_achievements_page(db: Session, user: models.User) -> dict:
    """Return all achievements split into earned/locked."""
    earned_map = {
        ua.achievement_id: ua.earned_at
        for ua in db.query(models.UserAchievement).filter(
            models.UserAchievement.user_id == user.id
        ).all()
    }

    all_achievements = db.query(models.Achievement).filter(
        models.Achievement.is_active == True
    ).order_by(models.Achievement.rarity, models.Achievement.title).all()

    earned, locked = [], []
    total_xp = 0

    for ach in all_achievements:
        data = {
            "id": ach.id,
            "title": ach.title,
            "description": ach.description,
            "icon": ach.icon,
            "xp_reward": ach.xp_reward,
            "rarity": ach.rarity,
            "badge_color": ach.badge_color,
            "is_earned": ach.id in earned_map,
            "earned_at": earned_map.get(ach.id),
        }
        if ach.id in earned_map:
            earned.append(data)
            total_xp += ach.xp_reward
        else:
            locked.append(data)

    return {
        "earned": earned,
        "locked": locked,
        "total_earned": len(earned),
        "total_xp_from_achievements": total_xp,
    }


# ─── Leaderboard ──────────────────────────────────────────────────────────────

def get_leaderboard(db: Session, user: models.User, limit: int = 50) -> dict:
    """Top players by total XP earned."""
    rows = (
        db.query(
            models.User,
            models.UserGamification,
            models.UserProfile,
            func.count(models.UserAchievement.id).label("achievement_count"),
        )
        .join(models.UserGamification, models.User.id == models.UserGamification.user_id)
        .outerjoin(models.UserProfile, models.User.id == models.UserProfile.user_id)
        .outerjoin(models.UserAchievement, models.User.id == models.UserAchievement.user_id)
        .filter(models.User.is_active == True)
        .group_by(models.User.id, models.UserGamification.id, models.UserProfile.id)
        .order_by(desc(models.UserGamification.total_xp_earned))
        .limit(limit)
        .all()
    )

    entries = []
    my_rank = None
    for i, (u, gam, profile, ach_count) in enumerate(rows, start=1):
        if u.id == user.id:
            my_rank = i
        entries.append({
            "rank": i,
            "username": u.username,
            "full_name": profile.full_name if profile else None,
            "avatar_url": profile.avatar_url if profile else None,
            "level": gam.level,
            "total_xp_earned": gam.total_xp_earned,
            "streak_days": gam.streak_days,
            "achievement_count": ach_count,
        })

    return {
        "entries": entries,
        "my_rank": my_rank,
        "total_players": db.query(func.count(models.User.id)).filter(models.User.is_active == True).scalar(),
    }


# ─── Seed Data ────────────────────────────────────────────────────────────────

SEED_MISSIONS = [
    # ── Education ────────────────────────────────────────────
    {"title": "Read for 30 Minutes", "description": "Read any book, article, or study material for 30 continuous minutes.", "xp_reward": 50, "difficulty": "easy", "category": "Education", "icon": "📚", "mission_type": "daily", "target_count": 1},
    {"title": "Complete an Online Course Module", "description": "Finish one lesson or module on Coursera, Udemy, or similar platform.", "xp_reward": 100, "difficulty": "medium", "category": "Education", "icon": "🎓", "mission_type": "weekly", "target_count": 1},
    {"title": "Study Streak: 7 Days", "description": "Study for at least 30 minutes every day for 7 consecutive days.", "xp_reward": 300, "difficulty": "hard", "category": "Education", "icon": "📖", "mission_type": "monthly", "target_count": 7},
    {"title": "Take Structured Notes", "description": "Take detailed, organized notes during a study session.", "xp_reward": 60, "difficulty": "easy", "category": "Education", "icon": "✏️", "mission_type": "daily", "target_count": 1},
    {"title": "Learn a New Concept", "description": "Research and understand one completely new concept in any field.", "xp_reward": 80, "difficulty": "medium", "category": "Education", "icon": "💡", "mission_type": "permanent", "target_count": 1},

    # ── Programming ───────────────────────────────────────────
    {"title": "Code for 1 Hour", "description": "Write and run code for a continuous hour on any project.", "xp_reward": 75, "difficulty": "easy", "category": "Programming", "icon": "💻", "mission_type": "daily", "target_count": 1},
    {"title": "Solve 3 LeetCode Problems", "description": "Complete 3 coding challenges on LeetCode or HackerRank.", "xp_reward": 150, "difficulty": "medium", "category": "Programming", "icon": "🧩", "mission_type": "weekly", "target_count": 3},
    {"title": "Build a Side Project Feature", "description": "Design and implement a complete feature for any personal project.", "xp_reward": 200, "difficulty": "hard", "category": "Programming", "icon": "🔧", "mission_type": "weekly", "target_count": 1},
    {"title": "Push Code to GitHub", "description": "Make a meaningful commit and push code to a GitHub repository.", "xp_reward": 50, "difficulty": "easy", "category": "Programming", "icon": "🐙", "mission_type": "daily", "target_count": 1},
    {"title": "Complete a Full-Stack Feature", "description": "Build a feature that includes both frontend and backend components.", "xp_reward": 400, "difficulty": "legendary", "category": "Programming", "icon": "🚀", "mission_type": "monthly", "target_count": 1},

    # ── AI Learning ───────────────────────────────────────────
    {"title": "Read an AI Paper", "description": "Read and summarize an AI/ML research paper.", "xp_reward": 120, "difficulty": "medium", "category": "AI Learning", "icon": "🤖", "mission_type": "weekly", "target_count": 1},
    {"title": "Train a Simple Model", "description": "Train and evaluate a machine learning model on any dataset.", "xp_reward": 200, "difficulty": "hard", "category": "AI Learning", "icon": "🧠", "mission_type": "weekly", "target_count": 1},
    {"title": "Prompt Engineering Session", "description": "Practice and document 10 different AI prompts for a specific task.", "xp_reward": 80, "difficulty": "easy", "category": "AI Learning", "icon": "✨", "mission_type": "daily", "target_count": 1},
    {"title": "Complete an AI Tutorial", "description": "Follow along with an AI/ML tutorial and reproduce the results.", "xp_reward": 150, "difficulty": "medium", "category": "AI Learning", "icon": "📝", "mission_type": "weekly", "target_count": 1},

    # ── Sports ────────────────────────────────────────────────
    {"title": "30-Minute Sport Practice", "description": "Engage in any sport (football, tennis, swimming, etc.) for 30 minutes.", "xp_reward": 60, "difficulty": "easy", "category": "Sports", "icon": "⚽", "mission_type": "daily", "target_count": 1},
    {"title": "Play a Competitive Match", "description": "Participate in a competitive sports match or tournament.", "xp_reward": 150, "difficulty": "medium", "category": "Sports", "icon": "🏆", "mission_type": "weekly", "target_count": 1},
    {"title": "Learn a New Sport Technique", "description": "Learn and practice a new technical move in any sport.", "xp_reward": 100, "difficulty": "medium", "category": "Sports", "icon": "🎯", "mission_type": "permanent", "target_count": 1},

    # ── Cricket ───────────────────────────────────────────────
    {"title": "Cricket Practice Session", "description": "Practice batting, bowling or fielding for at least 45 minutes.", "xp_reward": 75, "difficulty": "easy", "category": "Cricket", "icon": "🏏", "mission_type": "daily", "target_count": 1},
    {"title": "Bowl 50 Balls", "description": "Bowl 50 quality deliveries in practice or a match.", "xp_reward": 100, "difficulty": "medium", "category": "Cricket", "icon": "⚡", "mission_type": "weekly", "target_count": 50},
    {"title": "Score 50 Runs", "description": "Score 50 runs in a practice session or a match.", "xp_reward": 150, "difficulty": "hard", "category": "Cricket", "icon": "🎉", "mission_type": "monthly", "target_count": 50},
    {"title": "Watch and Analyze a Cricket Match", "description": "Watch a full cricket match and note key strategies used.", "xp_reward": 60, "difficulty": "easy", "category": "Cricket", "icon": "📺", "mission_type": "weekly", "target_count": 1},

    # ── Fitness ───────────────────────────────────────────────
    {"title": "Morning Workout", "description": "Complete any workout in the morning before 10 AM.", "xp_reward": 80, "difficulty": "easy", "category": "Fitness", "icon": "🏋️", "mission_type": "daily", "target_count": 1},
    {"title": "100 Push-Ups Challenge", "description": "Complete 100 push-ups in one day (can be split into sets).", "xp_reward": 120, "difficulty": "medium", "category": "Fitness", "icon": "💪", "mission_type": "weekly", "target_count": 100},
    {"title": "Run 5 Kilometers", "description": "Run a continuous 5km without stopping.", "xp_reward": 150, "difficulty": "hard", "category": "Fitness", "icon": "🏃", "mission_type": "weekly", "target_count": 1},
    {"title": "10,000 Steps Daily", "description": "Walk at least 10,000 steps in a single day.", "xp_reward": 70, "difficulty": "easy", "category": "Fitness", "icon": "👟", "mission_type": "daily", "target_count": 10000},
    {"title": "30-Day Fitness Challenge", "description": "Complete a workout every day for a full month.", "xp_reward": 500, "difficulty": "legendary", "category": "Fitness", "icon": "🔥", "mission_type": "monthly", "target_count": 30},

    # ── Movies ────────────────────────────────────────────────
    {"title": "Watch a Classic Film", "description": "Watch a movie rated 90+ on Rotten Tomatoes or 8+ on IMDb.", "xp_reward": 50, "difficulty": "easy", "category": "Movies", "icon": "🎬", "mission_type": "weekly", "target_count": 1},
    {"title": "Review a Movie", "description": "Write a thoughtful 200+ word review after watching a movie.", "xp_reward": 80, "difficulty": "medium", "category": "Movies", "icon": "📝", "mission_type": "weekly", "target_count": 1},
    {"title": "Cinema Week: 5 Movies", "description": "Watch 5 different movies in a single week.", "xp_reward": 200, "difficulty": "hard", "category": "Movies", "icon": "🎥", "mission_type": "monthly", "target_count": 5},

    # ── Gaming ────────────────────────────────────────────────
    {"title": "1 Hour Gaming Session", "description": "Play a game mindfully for one focused hour.", "xp_reward": 40, "difficulty": "easy", "category": "Gaming", "icon": "🎮", "mission_type": "daily", "target_count": 1},
    {"title": "Complete a Game Level/Stage", "description": "Complete any significant milestone in a game.", "xp_reward": 80, "difficulty": "medium", "category": "Gaming", "icon": "🎯", "mission_type": "weekly", "target_count": 1},
    {"title": "Play with Friends Online", "description": "Join and complete an online multiplayer session.", "xp_reward": 60, "difficulty": "easy", "category": "Gaming", "icon": "👥", "mission_type": "weekly", "target_count": 1},

    # ── Communication ─────────────────────────────────────────
    {"title": "Public Speaking Practice", "description": "Speak for 5 minutes on any topic (record yourself or speak to someone).", "xp_reward": 100, "difficulty": "medium", "category": "Communication", "icon": "🎤", "mission_type": "daily", "target_count": 1},
    {"title": "Write a Blog Post", "description": "Write and publish a 500+ word article or blog post.", "xp_reward": 200, "difficulty": "hard", "category": "Communication", "icon": "✍️", "mission_type": "monthly", "target_count": 1},
    {"title": "Have a Deep Conversation", "description": "Have a meaningful 30-minute conversation with someone new.", "xp_reward": 70, "difficulty": "medium", "category": "Communication", "icon": "💬", "mission_type": "weekly", "target_count": 1},
    {"title": "Write 3 LinkedIn Posts", "description": "Create and publish 3 professional posts this week.", "xp_reward": 150, "difficulty": "hard", "category": "Communication", "icon": "💼", "mission_type": "weekly", "target_count": 3},

    # ── Leadership ────────────────────────────────────────────
    {"title": "Lead a Team Meeting", "description": "Facilitate or lead any team meeting or group discussion.", "xp_reward": 150, "difficulty": "medium", "category": "Leadership", "icon": "👑", "mission_type": "weekly", "target_count": 1},
    {"title": "Mentor Someone", "description": "Spend 30+ minutes mentoring or teaching a skill to someone.", "xp_reward": 120, "difficulty": "medium", "category": "Leadership", "icon": "🤝", "mission_type": "weekly", "target_count": 1},
    {"title": "Delegate Effectively", "description": "Delegate at least 3 tasks with clear instructions and follow-up.", "xp_reward": 100, "difficulty": "hard", "category": "Leadership", "icon": "📋", "mission_type": "monthly", "target_count": 3},

    # ── Entrepreneurship ──────────────────────────────────────
    {"title": "Validate a Business Idea", "description": "Research and validate a startup idea with at least 3 potential customers.", "xp_reward": 300, "difficulty": "hard", "category": "Entrepreneurship", "icon": "💡", "mission_type": "monthly", "target_count": 1},
    {"title": "Study a Successful Startup", "description": "Research and document lessons from a successful company's growth story.", "xp_reward": 100, "difficulty": "medium", "category": "Entrepreneurship", "icon": "📊", "mission_type": "weekly", "target_count": 1},
    {"title": "Create a Business Plan Draft", "description": "Write a rough 1-page business plan for any idea.", "xp_reward": 200, "difficulty": "hard", "category": "Entrepreneurship", "icon": "📄", "mission_type": "monthly", "target_count": 1},
    {"title": "Network with 3 Professionals", "description": "Connect and have a conversation with 3 industry professionals.", "xp_reward": 150, "difficulty": "medium", "category": "Entrepreneurship", "icon": "🌐", "mission_type": "monthly", "target_count": 3},

    # ── Creativity ────────────────────────────────────────────
    {"title": "Daily Sketch or Drawing", "description": "Spend 20+ minutes drawing, sketching, or doing digital art.", "xp_reward": 50, "difficulty": "easy", "category": "Creativity", "icon": "🎨", "mission_type": "daily", "target_count": 1},
    {"title": "Compose a Song or Beat", "description": "Create a short musical piece using any instrument or DAW.", "xp_reward": 200, "difficulty": "hard", "category": "Creativity", "icon": "🎵", "mission_type": "monthly", "target_count": 1},
    {"title": "Write a Short Story", "description": "Write a complete short story (500+ words) with a beginning, middle, and end.", "xp_reward": 150, "difficulty": "medium", "category": "Creativity", "icon": "📖", "mission_type": "monthly", "target_count": 1},
    {"title": "Photography Walk", "description": "Go on a dedicated photography walk and take 20+ intentional photos.", "xp_reward": 80, "difficulty": "easy", "category": "Creativity", "icon": "📸", "mission_type": "weekly", "target_count": 1},
]


SEED_ACHIEVEMENTS = [
    # ── First Steps ────────────────────────────────────────────
    {"title": "First Mission", "description": "Complete your very first mission.", "icon": "🎯", "xp_reward": 50, "rarity": "common", "badge_color": "#94a3b8", "condition_type": "missions_completed", "condition_value": 1, "condition_category": None},
    {"title": "Mission Starter", "description": "Complete 5 missions.", "icon": "⚡", "xp_reward": 100, "rarity": "common", "badge_color": "#94a3b8", "condition_type": "missions_completed", "condition_value": 5, "condition_category": None},
    {"title": "Mission Achiever", "description": "Complete 25 missions.", "icon": "🏅", "xp_reward": 250, "rarity": "rare", "badge_color": "#6b8eff", "condition_type": "missions_completed", "condition_value": 25, "condition_category": None},
    {"title": "Mission Master", "description": "Complete 100 missions.", "icon": "🏆", "xp_reward": 1000, "rarity": "epic", "badge_color": "#c084fc", "condition_type": "missions_completed", "condition_value": 100, "condition_category": None},
    {"title": "Legendary Quester", "description": "Complete 500 missions.", "icon": "👑", "xp_reward": 5000, "rarity": "legendary", "badge_color": "#fbbf24", "condition_type": "missions_completed", "condition_value": 500, "condition_category": None},

    # ── XP Milestones ─────────────────────────────────────────
    {"title": "XP Seeker", "description": "Earn 500 total XP.", "icon": "⭐", "xp_reward": 0, "rarity": "common", "badge_color": "#94a3b8", "condition_type": "xp_earned", "condition_value": 500, "condition_category": None},
    {"title": "XP Hunter", "description": "Earn 2,500 total XP.", "icon": "🌟", "xp_reward": 0, "rarity": "rare", "badge_color": "#6b8eff", "condition_type": "xp_earned", "condition_value": 2500, "condition_category": None},
    {"title": "XP Collector", "description": "Earn 10,000 total XP.", "icon": "💎", "xp_reward": 500, "rarity": "epic", "badge_color": "#c084fc", "condition_type": "xp_earned", "condition_value": 10000, "condition_category": None},
    {"title": "XP Legend", "description": "Earn 50,000 total XP.", "icon": "🔮", "xp_reward": 2000, "rarity": "legendary", "badge_color": "#fbbf24", "condition_type": "xp_earned", "condition_value": 50000, "condition_category": None},

    # ── Level Milestones ──────────────────────────────────────
    {"title": "Level 5 Reached", "description": "Reach Level 5.", "icon": "🆙", "xp_reward": 100, "rarity": "common", "badge_color": "#94a3b8", "condition_type": "level_reached", "condition_value": 5, "condition_category": None},
    {"title": "Level 10 Reached", "description": "Reach Level 10.", "icon": "🔟", "xp_reward": 250, "rarity": "rare", "badge_color": "#6b8eff", "condition_type": "level_reached", "condition_value": 10, "condition_category": None},
    {"title": "Level 25 Reached", "description": "Reach Level 25.", "icon": "💯", "xp_reward": 500, "rarity": "epic", "badge_color": "#c084fc", "condition_type": "level_reached", "condition_value": 25, "condition_category": None},
    {"title": "Level 50 Reached", "description": "Reach Level 50.", "icon": "🌠", "xp_reward": 2000, "rarity": "legendary", "badge_color": "#fbbf24", "condition_type": "level_reached", "condition_value": 50, "condition_category": None},

    # ── Streak Achievements ────────────────────────────────────
    {"title": "On Fire", "description": "Maintain a 3-day activity streak.", "icon": "🔥", "xp_reward": 75, "rarity": "common", "badge_color": "#94a3b8", "condition_type": "streak_days", "condition_value": 3, "condition_category": None},
    {"title": "Week Warrior", "description": "Maintain a 7-day streak.", "icon": "⚔️", "xp_reward": 200, "rarity": "rare", "badge_color": "#6b8eff", "condition_type": "streak_days", "condition_value": 7, "condition_category": None},
    {"title": "Month Master", "description": "Maintain a 30-day streak.", "icon": "🗓️", "xp_reward": 1000, "rarity": "epic", "badge_color": "#c084fc", "condition_type": "streak_days", "condition_value": 30, "condition_category": None},
    {"title": "Unstoppable", "description": "Maintain a 100-day streak.", "icon": "💫", "xp_reward": 5000, "rarity": "legendary", "badge_color": "#fbbf24", "condition_type": "streak_days", "condition_value": 100, "condition_category": None},

    # ── Category Specialists ───────────────────────────────────
    {"title": "Code Ninja", "description": "Complete 10 Programming missions.", "icon": "🥷", "xp_reward": 300, "rarity": "rare", "badge_color": "#6b8eff", "condition_type": "missions_completed", "condition_value": 10, "condition_category": "Programming"},
    {"title": "AI Pioneer", "description": "Complete 10 AI Learning missions.", "icon": "🤖", "xp_reward": 300, "rarity": "rare", "badge_color": "#6b8eff", "condition_type": "missions_completed", "condition_value": 10, "condition_category": "AI Learning"},
    {"title": "Fitness Freak", "description": "Complete 15 Fitness missions.", "icon": "🏋️", "xp_reward": 300, "rarity": "rare", "badge_color": "#6b8eff", "condition_type": "missions_completed", "condition_value": 15, "condition_category": "Fitness"},
    {"title": "Cricket Legend", "description": "Complete 15 Cricket missions.", "icon": "🏏", "xp_reward": 300, "rarity": "rare", "badge_color": "#6b8eff", "condition_type": "missions_completed", "condition_value": 15, "condition_category": "Cricket"},
    {"title": "Creative Genius", "description": "Complete 10 Creativity missions.", "icon": "🎨", "xp_reward": 300, "rarity": "rare", "badge_color": "#6b8eff", "condition_type": "missions_completed", "condition_value": 10, "condition_category": "Creativity"},
    {"title": "Leader of Leaders", "description": "Complete 10 Leadership missions.", "icon": "👑", "xp_reward": 300, "rarity": "epic", "badge_color": "#c084fc", "condition_type": "missions_completed", "condition_value": 10, "condition_category": "Leadership"},
    {"title": "Entrepreneur Spirit", "description": "Complete 10 Entrepreneurship missions.", "icon": "💡", "xp_reward": 400, "rarity": "epic", "badge_color": "#c084fc", "condition_type": "missions_completed", "condition_value": 10, "condition_category": "Entrepreneurship"},
]


def seed_missions_and_achievements(db: Session) -> dict:
    """Idempotently seed the missions and achievements tables."""
    missions_added = 0
    for m_data in SEED_MISSIONS:
        exists = db.query(models.Mission).filter(models.Mission.title == m_data["title"]).first()
        if not exists:
            mission_type_map = {
                "daily": models.MissionType.DAILY,
                "weekly": models.MissionType.WEEKLY,
                "monthly": models.MissionType.MONTHLY,
                "permanent": models.MissionType.PERMANENT,
            }
            m = models.Mission(
                title=m_data["title"],
                description=m_data["description"],
                xp_reward=m_data["xp_reward"],
                difficulty=m_data["difficulty"],
                category=m_data["category"],
                icon=m_data["icon"],
                mission_type=mission_type_map.get(m_data["mission_type"], models.MissionType.PERMANENT),
                target_count=m_data["target_count"],
            )
            db.add(m)
            missions_added += 1

    achievements_added = 0
    for a_data in SEED_ACHIEVEMENTS:
        exists = db.query(models.Achievement).filter(models.Achievement.title == a_data["title"]).first()
        if not exists:
            a = models.Achievement(
                title=a_data["title"],
                description=a_data["description"],
                icon=a_data["icon"],
                xp_reward=a_data["xp_reward"],
                rarity=a_data["rarity"],
                badge_color=a_data.get("badge_color"),
                condition_type=a_data.get("condition_type"),
                condition_value=a_data.get("condition_value", 0),
                condition_category=a_data.get("condition_category"),
            )
            db.add(a)
            achievements_added += 1

    db.commit()
    return {"missions_added": missions_added, "achievements_added": achievements_added}

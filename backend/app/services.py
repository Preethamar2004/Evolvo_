from datetime import datetime, timedelta
from typing import Optional
import uuid

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app import models, schemas
from app.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    calculate_level_from_xp, calculate_xp_to_next_level,
    calculate_level_progress, generate_reset_token
)
from app.config import settings


# ─── Auth Service ─────────────────────────────────────────────────────────────

def register_user(db: Session, payload: schemas.RegisterRequest) -> models.User:
    """Register a new user with profile and gamification records."""
    # Check uniqueness
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    if db.query(models.User).filter(models.User.username == payload.username).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")

    # Create user
    user = models.User(
        email=payload.email,
        username=payload.username,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.flush()  # Get the user ID

    # Create profile
    profile = models.UserProfile(
        user_id=user.id,
        full_name=payload.full_name,
    )
    db.add(profile)

    # Create gamification record
    gamification = models.UserGamification(user_id=user.id)
    db.add(gamification)

    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> Optional[models.User]:
    """Authenticate user credentials."""
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def login_user(db: Session, payload: schemas.LoginRequest) -> dict:
    """Authenticate and return JWT tokens."""
    user = authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled. Please contact support."
        )

    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()

    token_data = {"sub": str(user.id), "username": user.username}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


def initiate_forgot_password(db: Session, email: str) -> bool:
    """Generate and store a password reset token."""
    user = db.query(models.User).filter(models.User.email == email).first()
    # Always return True to avoid email enumeration attacks
    if not user:
        return True

    reset_token = generate_reset_token()
    user.password_reset_token = reset_token
    user.password_reset_expires = datetime.utcnow() + timedelta(hours=1)
    db.commit()

    # TODO: Send reset email via SMTP
    # send_reset_email(user.email, reset_token)
    return True


def reset_password(db: Session, token: str, new_password: str) -> bool:
    """Reset user password using a valid reset token."""
    user = db.query(models.User).filter(
        models.User.password_reset_token == token,
        models.User.password_reset_expires > datetime.utcnow()
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    user.hashed_password = hash_password(new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    db.commit()
    return True


def change_password(db: Session, user: models.User, current_password: str, new_password: str) -> bool:
    """Change user password after verifying the current one."""
    if not verify_password(current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    user.hashed_password = hash_password(new_password)
    db.commit()
    return True


# ─── Profile Service ──────────────────────────────────────────────────────────

def get_user_profile(db: Session, user_id: uuid.UUID) -> models.UserProfile:
    """Fetch the user's profile record."""
    profile = db.query(models.UserProfile).filter(
        models.UserProfile.user_id == user_id
    ).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return profile


def update_user_profile(
    db: Session,
    user_id: uuid.UUID,
    payload: schemas.UserProfileUpdate
) -> models.UserProfile:
    """Update profile fields for a user."""
    profile = get_user_profile(db, user_id)
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile


def update_avatar(db: Session, user_id: uuid.UUID, avatar_url: str) -> models.UserProfile:
    """Update user avatar URL."""
    profile = get_user_profile(db, user_id)
    profile.avatar_url = avatar_url
    db.commit()
    db.refresh(profile)
    return profile


# ─── Dashboard Service ────────────────────────────────────────────────────────

def get_dashboard_data(db: Session, user: models.User) -> dict:
    """Aggregate all dashboard data for the user."""
    # Gamification
    gamification = db.query(models.UserGamification).filter(
        models.UserGamification.user_id == user.id
    ).first()

    gamification_data = None
    if gamification:
        level = calculate_level_from_xp(gamification.total_xp_earned)
        gamification_data = {
            "xp": gamification.xp,
            "level": level,
            "total_xp_earned": gamification.total_xp_earned,
            "streak_days": gamification.streak_days,
            "xp_to_next_level": calculate_xp_to_next_level(gamification.total_xp_earned, level),
            "level_progress_percent": calculate_level_progress(gamification.total_xp_earned, level),
        }

    # Active missions
    active_missions = (
        db.query(models.UserMission, models.Mission)
        .join(models.Mission, models.UserMission.mission_id == models.Mission.id)
        .filter(
            models.UserMission.user_id == user.id,
            models.UserMission.status == models.MissionStatus.ACTIVE
        )
        .limit(5)
        .all()
    )

    missions_data = []
    for um, mission in active_missions:
        missions_data.append({
            "id": um.id,
            "title": mission.title,
            "description": mission.description,
            "xp_reward": mission.xp_reward,
            "difficulty": mission.difficulty,
            "category": mission.category,
            "icon": mission.icon,
            "status": um.status.value,
            "progress": um.progress,
            "started_at": um.started_at,
            "completed_at": um.completed_at,
        })

    # Achievements
    achievement_count = db.query(models.UserAchievement).filter(
        models.UserAchievement.user_id == user.id
    ).count()

    recent_achievements = (
        db.query(models.UserAchievement, models.Achievement)
        .join(models.Achievement, models.UserAchievement.achievement_id == models.Achievement.id)
        .filter(models.UserAchievement.user_id == user.id)
        .order_by(models.UserAchievement.earned_at.desc())
        .limit(5)
        .all()
    )

    achievements_data = []
    for ua, achievement in recent_achievements:
        achievements_data.append({
            "id": ua.id,
            "title": achievement.title,
            "description": achievement.description,
            "icon": achievement.icon,
            "xp_reward": achievement.xp_reward,
            "rarity": achievement.rarity,
            "earned_at": ua.earned_at,
        })

    return {
        "user": user,
        "gamification": gamification_data,
        "active_missions": missions_data,
        "recent_achievements": achievements_data,
        "achievement_count": achievement_count,
    }

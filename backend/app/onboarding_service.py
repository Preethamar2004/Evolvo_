"""Onboarding service — saves answers, triggers AI analysis, stores personality profile."""
import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app import models
from app.onboarding_schemas import OnboardingSubmitRequest
from app.ai_service import analyze_personality


def get_onboarding_status(db: Session, user: models.User) -> dict:
    """Return whether the user has completed onboarding and has a personality profile."""
    has_profile = db.query(models.PersonalityProfile).filter(
        models.PersonalityProfile.user_id == user.id
    ).first() is not None

    return {
        "onboarding_complete": user.onboarding_complete,
        "has_personality_profile": has_profile,
    }


def submit_onboarding(
    db: Session,
    user: models.User,
    payload: OnboardingSubmitRequest,
) -> models.PersonalityProfile:
    """
    1. Save / update onboarding answers.
    2. Call Gemini AI to analyze them.
    3. Save / update the PersonalityProfile.
    4. Mark user.onboarding_complete = True.
    """
    # ── Step 1: Save raw answers ──────────────────────────────────
    existing_response = db.query(models.OnboardingResponse).filter(
        models.OnboardingResponse.user_id == user.id
    ).first()

    if existing_response:
        # Update existing
        for field, value in payload.model_dump().items():
            setattr(existing_response, field, value)
        db.flush()
    else:
        onboarding_response = models.OnboardingResponse(
            user_id=user.id,
            **payload.model_dump()
        )
        db.add(onboarding_response)
        db.flush()

    # ── Step 2: Run AI Analysis ───────────────────────────────────
    answers_dict = payload.model_dump()
    try:
        analysis = analyze_personality(answers_dict)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI analysis failed: {str(e)}"
        )

    # ── Step 3: Save / update PersonalityProfile ──────────────────
    existing_profile = db.query(models.PersonalityProfile).filter(
        models.PersonalityProfile.user_id == user.id
    ).first()

    if existing_profile:
        for field, value in analysis.items():
            setattr(existing_profile, field, value)
        db.flush()
        personality_profile = existing_profile
    else:
        personality_profile = models.PersonalityProfile(
            user_id=user.id,
            **analysis,
        )
        db.add(personality_profile)
        db.flush()

    # ── Step 4: Mark onboarding complete ─────────────────────────
    user.onboarding_complete = True

    # ── Step 5: Update UserProfile with onboarding data ──────────
    user_profile = db.query(models.UserProfile).filter(
        models.UserProfile.user_id == user.id
    ).first()
    if user_profile:
        if payload.hobbies:
            user_profile.hobbies = payload.hobbies
        if payload.interests:
            user_profile.interests = payload.interests
        if payload.skills_to_learn:
            user_profile.skills = payload.skills_to_learn
        if payload.personal_goals:
            user_profile.goals = payload.personal_goals

    db.commit()
    db.refresh(personality_profile)
    return personality_profile


def get_personality_profile(db: Session, user_id: uuid.UUID) -> models.PersonalityProfile:
    """Fetch the user's personality profile or raise 404."""
    profile = db.query(models.PersonalityProfile).filter(
        models.PersonalityProfile.user_id == user_id
    ).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Personality profile not found. Please complete onboarding first."
        )
    return profile


def regenerate_profile(
    db: Session,
    user: models.User,
) -> models.PersonalityProfile:
    """Re-run AI analysis on existing onboarding answers."""
    onboarding = db.query(models.OnboardingResponse).filter(
        models.OnboardingResponse.user_id == user.id
    ).first()
    if not onboarding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No onboarding answers found. Please complete onboarding first."
        )

    # Re-run analysis
    answers_dict = {
        "hobbies": onboarding.hobbies,
        "interests": onboarding.interests,
        "sports": onboarding.sports,
        "movies": onboarding.movies,
        "games": onboarding.games,
        "skills_to_learn": onboarding.skills_to_learn,
        "career_goals": onboarding.career_goals,
        "personal_goals": onboarding.personal_goals,
        "strengths": onboarding.strengths,
        "areas_to_improve": onboarding.areas_to_improve,
    }
    analysis = analyze_personality(answers_dict)

    existing_profile = db.query(models.PersonalityProfile).filter(
        models.PersonalityProfile.user_id == user.id
    ).first()

    if existing_profile:
        for field, value in analysis.items():
            setattr(existing_profile, field, value)
        db.commit()
        db.refresh(existing_profile)
        return existing_profile

    profile = models.PersonalityProfile(user_id=user.id, **analysis)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile

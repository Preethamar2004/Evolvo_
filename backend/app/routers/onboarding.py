"""Onboarding router — questionnaire submission and personality profile endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.security import get_current_active_user
from app.onboarding_schemas import (
    OnboardingSubmitRequest,
    OnboardingSubmitResponse,
    OnboardingStatusResponse,
    PersonalityProfileResponse,
)
from app import onboarding_service

router = APIRouter(prefix="/onboarding", tags=["Onboarding & Personality"])


@router.get("/status", response_model=OnboardingStatusResponse)
def get_status(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Check whether the current user has completed onboarding."""
    return onboarding_service.get_onboarding_status(db, current_user)


@router.post("/submit", response_model=OnboardingSubmitResponse, status_code=status.HTTP_200_OK)
def submit_onboarding(
    payload: OnboardingSubmitRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    Submit onboarding questionnaire answers.
    Triggers AI personality analysis via Google Gemini.
    Returns the generated PersonalityProfile.
    """
    profile = onboarding_service.submit_onboarding(db, current_user, payload)
    return OnboardingSubmitResponse(
        message="Onboarding complete! Your personality profile has been generated.",
        onboarding_complete=True,
        personality_profile=PersonalityProfileResponse.from_orm_with_scores(profile),
    )


@router.get("/profile", response_model=PersonalityProfileResponse)
def get_personality_profile(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Get the current user's AI-generated personality profile."""
    profile = onboarding_service.get_personality_profile(db, current_user.id)
    return PersonalityProfileResponse.from_orm_with_scores(profile)


@router.post("/regenerate", response_model=PersonalityProfileResponse)
def regenerate_profile(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Re-run AI analysis on existing onboarding answers to refresh personality profile."""
    profile = onboarding_service.regenerate_profile(db, current_user)
    return PersonalityProfileResponse.from_orm_with_scores(profile)


@router.get("/public/{username}", response_model=PersonalityProfileResponse)
def get_public_profile(
    username: str,
    db: Session = Depends(get_db),
):
    """Get a public user's personality profile by username."""
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    profile = onboarding_service.get_personality_profile(db, user.id)
    return PersonalityProfileResponse.from_orm_with_scores(profile)

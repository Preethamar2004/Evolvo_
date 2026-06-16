from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict

from app import models, schemas
from app.database import get_db
from app.security import get_current_active_user
from app.ai_service import recommend_entertainment_activities

router = APIRouter(prefix="/entertainment", tags=["Entertainment"])

@router.get("/recommendations")
def get_recommendations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    profile = db.query(models.UserProfile).filter(models.UserProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    profile_dict = {
        "interests": profile.interests,
        "hobbies": profile.hobbies,
    }
    recommendations = recommend_entertainment_activities(profile_dict)
    return recommendations


@router.get("/movies", response_model=List[schemas.MovieChallengeResponse])
def get_movies(db: Session = Depends(get_db)):
    movies = db.query(models.MovieChallenge).filter(models.MovieChallenge.is_active == True).all()
    return movies


@router.get("/gaming", response_model=List[schemas.GamingTournamentResponse])
def get_tournaments(db: Session = Depends(get_db)):
    tournaments = db.query(models.GamingTournament).order_by(models.GamingTournament.starts_at.asc()).all()
    for t in tournaments:
        t.participants_count = db.query(models.GamingTournamentParticipant).filter(models.GamingTournamentParticipant.tournament_id == t.id).count()
    return tournaments


@router.get("/sports", response_model=List[schemas.SportsChallengeResponse])
def get_sports(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    challenges = db.query(models.SportsChallenge).filter(models.SportsChallenge.user_id == current_user.id).all()
    return challenges


@router.post("/sports", response_model=schemas.SportsChallengeResponse)
def create_sports_challenge(
    payload: schemas.SportsChallengeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    challenge = models.SportsChallenge(
        user_id=current_user.id,
        activity_type=payload.activity_type,
        target_description=payload.target_description,
        target_value=payload.target_value,
        current_value=0
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    return challenge


@router.get("/quests", response_model=List[schemas.FunQuestResponse])
def get_quests(db: Session = Depends(get_db)):
    quests = db.query(models.FunQuest).filter(models.FunQuest.is_active == True).all()
    return quests

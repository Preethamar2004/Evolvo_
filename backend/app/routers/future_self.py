from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json

from app import models, schemas
from app.database import get_db
from app.security import get_current_active_user
from app.ai_service import generate_future_selves

router = APIRouter(prefix="/future-self", tags=["Future Self"])

@router.get("/", response_model=schemas.FutureSelfSimulationResponse)
def get_future_self_simulation(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    simulation = db.query(models.FutureSelfSimulation).filter(
        models.FutureSelfSimulation.user_id == current_user.id
    ).order_by(models.FutureSelfSimulation.created_at.desc()).first()
    
    if not simulation:
        raise HTTPException(status_code=404, detail="No simulation found. Please run a simulation first.")
    
    return simulation

@router.post("/simulate", response_model=schemas.FutureSelfSimulationResponse)
def simulate_future_self(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    profile = db.query(models.UserProfile).filter(models.UserProfile.user_id == current_user.id).first()
    gamification = db.query(models.UserGamification).filter(models.UserGamification.user_id == current_user.id).first()
    
    if not profile or not gamification:
        raise HTTPException(status_code=400, detail="Incomplete user profile or gamification data")
        
    profile_dict = {
        "interests": profile.interests,
        "skills": profile.skills,
        "goals": profile.goals
    }
    
    gamification_dict = {
        "level": gamification.level,
        "total_xp": gamification.total_xp_earned
    }
    
    # Generate new simulation
    simulations_data = generate_future_selves(profile_dict, gamification_dict)
    
    # Save to database
    new_sim = models.FutureSelfSimulation(
        user_id=current_user.id,
        simulations=simulations_data
    )
    db.add(new_sim)
    db.commit()
    db.refresh(new_sim)
    
    return new_sim

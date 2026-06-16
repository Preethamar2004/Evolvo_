from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Dict, List

from app import models, schemas
from app.database import get_db
from app.security import get_current_active_user, calculate_xp_to_next_level, calculate_level_from_xp

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/dashboard", response_model=schemas.DashboardAnalyticsResponse)
def get_analytics_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    # 1. XP Growth (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    xp_logs = db.query(models.XPLog).filter(
        models.XPLog.user_id == current_user.id,
        models.XPLog.created_at >= thirty_days_ago
    ).order_by(models.XPLog.created_at.asc()).all()
    
    # Calculate daily XP
    daily_xp_map = {}
    for log in xp_logs:
        date_str = log.created_at.strftime('%Y-%m-%d')
        daily_xp_map[date_str] = daily_xp_map.get(date_str, 0) + log.xp_amount
        
    # Build timeline
    xp_growth = []
    cumulative_xp = db.query(models.UserGamification).filter(
        models.UserGamification.user_id == current_user.id
    ).first().total_xp_earned if db.query(models.UserGamification).filter(models.UserGamification.user_id == current_user.id).first() else 0
    
    # We need to backtrack cumulative XP to 30 days ago to build the graph correctly, 
    # but for simplicity in this visualization, we will build cumulative growth from the logs we have.
    running_xp = cumulative_xp - sum(daily_xp_map.values())
    
    for i in range(30):
        d = thirty_days_ago + timedelta(days=i)
        date_str = d.strftime('%Y-%m-%d')
        daily_earned = daily_xp_map.get(date_str, 0)
        running_xp += daily_earned
        xp_growth.append({
            "date": date_str,
            "daily_xp": daily_earned,
            "cumulative_xp": running_xp
        })

    # 2. Category Distribution
    category_logs = db.query(
        models.XPLog.category, 
        func.sum(models.XPLog.xp_amount)
    ).filter(
        models.XPLog.user_id == current_user.id,
        models.XPLog.category.isnot(None)
    ).group_by(models.XPLog.category).all()
    
    category_distribution = {cat: int(total) for cat, total in category_logs if cat}
    
    # Fill defaults if missing
    for cat in ["Knowledge", "Fitness", "Creativity", "Leadership", "Communication", "Social"]:
        if cat not in category_distribution:
            category_distribution[cat] = 0

    # 3. Mission Statistics
    total_started = db.query(models.UserMission).filter(models.UserMission.user_id == current_user.id).count()
    total_completed = db.query(models.UserMission).filter(
        models.UserMission.user_id == current_user.id,
        models.UserMission.status == models.MissionStatus.COMPLETED
    ).count()
    completion_rate = round((total_completed / total_started * 100) if total_started > 0 else 0, 1)

    mission_statistics = {
        "total_started": total_started,
        "total_completed": total_completed,
        "completion_rate": completion_rate
    }
    
    # 4. Forecast (Simple linear projection)
    avg_daily_xp = sum(daily_xp_map.values()) / 30.0 if daily_xp_map else 0
    projected_xp_30_days = cumulative_xp + int(avg_daily_xp * 30)
    projected_level_30_days = calculate_level_from_xp(projected_xp_30_days)
    
    forecast = {
        "current_level": calculate_level_from_xp(cumulative_xp),
        "avg_daily_xp": round(avg_daily_xp, 1),
        "projected_level_1_month": projected_level_30_days,
        "projected_xp_1_month": projected_xp_30_days
    }
    
    return {
        "xp_growth": xp_growth,
        "category_distribution": category_distribution,
        "mission_statistics": mission_statistics,
        "forecast": forecast
    }

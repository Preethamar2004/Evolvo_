"""Dashboard routes: user stats, missions, achievements."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import schemas, services, models
from app.database import get_db
from app.security import get_current_active_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/", response_model=schemas.UserDashboardResponse)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get complete dashboard data for the current user."""
    data = services.get_dashboard_data(db, current_user)
    return {
        "user": data["user"],
        "gamification": data["gamification"],
        "active_missions": data["active_missions"],
        "recent_achievements": data["recent_achievements"],
        "achievement_count": data["achievement_count"],
    }

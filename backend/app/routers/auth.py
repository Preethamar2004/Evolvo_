"""Authentication routes: register, login, logout, password management."""
import os
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app import schemas, services, models
from app.database import get_db
from app.security import get_current_active_user, decode_token, create_access_token
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account."""
    user = services.register_user(db, payload)
    return user


@router.post("/login", response_model=schemas.Token)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    """Login and receive JWT access + refresh tokens."""
    return services.login_user(db, payload)


@router.post("/logout", response_model=schemas.MessageResponse)
def logout(current_user: models.User = Depends(get_current_active_user)):
    """Logout the current user (client should discard tokens)."""
    # Stateless JWT logout — client discards tokens
    # For server-side invalidation, implement a token blacklist (Redis recommended)
    return {"message": "Successfully logged out", "success": True}


@router.post("/refresh", response_model=schemas.Token)
def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    """Refresh access token using a valid refresh token."""
    payload = decode_token(refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token type"
        )
    user_id = payload.get("sub")
    username = payload.get("username")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    token_data = {"sub": str(user.id), "username": user.username}
    from app.security import create_refresh_token
    return {
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
        "token_type": "bearer",
    }


@router.post("/forgot-password", response_model=schemas.MessageResponse)
def forgot_password(payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Send a password reset email."""
    services.initiate_forgot_password(db, payload.email)
    return {"message": "If that email is registered, a reset link has been sent.", "success": True}


@router.post("/reset-password", response_model=schemas.MessageResponse)
def reset_password(payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using a valid reset token."""
    services.reset_password(db, payload.token, payload.new_password)
    return {"message": "Password reset successfully", "success": True}


@router.post("/change-password", response_model=schemas.MessageResponse)
def change_password(
    payload: schemas.ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Change the current user's password."""
    services.change_password(db, current_user, payload.current_password, payload.new_password)
    return {"message": "Password changed successfully", "success": True}


@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_active_user)):
    """Get the current authenticated user's info."""
    return current_user

"""Social router: Feed, Posts, Likes, Comments, Friends, Follows, and Notifications."""
import math
from datetime import datetime
from uuid import UUID
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app import models, schemas
from app.database import get_db
from app.security import get_current_active_user

router = APIRouter(prefix="/social", tags=["Social Network"])


@router.get("/feed", response_model=List[schemas.PostResponse])
def get_growth_feed(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Retrieve feed posts sorted by a custom Growth-Prioritized algorithm.
    Prioritizes achievements, progress, and mission completions over sheer popularity.
    """
    posts = db.query(models.Post).all()
    now = datetime.utcnow()
    
    feed_items = []
    for post in posts:
        # 1. Base growth weight based on post type
        if post.post_type == "achievement":
            weight = 5.0
        elif post.post_type == "mission_completion":
            weight = 4.0
        elif post.post_type == "progress":
            weight = 3.0
        else:
            weight = 1.0
            
        # 2. XP bonus
        # Logarithmic scaling of XP gained to prevent huge outliers from dominating completely
        xp_bonus = math.log1p(post.xp_gained) if post.xp_gained > 0 else 0.0
        
        # 3. Engagement (minor boost, not primary factor)
        likes_count = len(post.likes)
        comments_count = db.query(models.PostComment).filter(models.PostComment.post_id == post.id).count()
        engagement_boost = 0.15 * (likes_count + comments_count)
        
        # 4. Time decay factor
        # hours_old = time elapsed since post creation
        hours_old = (now - post.created_at).total_seconds() / 3600.0
        time_decay = (hours_old + 2.0) ** 1.5
        
        # Growth algorithm formula
        growth_score = ((weight + xp_bonus) + engagement_boost) / time_decay
        
        # Build response item
        feed_items.append({
            "id": post.id,
            "user_id": post.user_id,
            "content": post.content,
            "media_url": post.media_url,
            "media_type": post.media_type,
            "post_type": post.post_type,
            "achievement_id": post.achievement_id,
            "mission_id": post.mission_id,
            "xp_gained": post.xp_gained,
            "created_at": post.created_at,
            "updated_at": post.updated_at,
            "user": post.user,
            "likes": [schemas.PostLikeResponse.model_validate(l) for l in post.likes],
            "comments_count": comments_count,
            "likes_count": likes_count,
            "growth_score": growth_score
        })
        
    # Sort by growth score descending
    feed_items.sort(key=lambda x: x["growth_score"], reverse=True)
    return feed_items


@router.post("/posts", response_model=schemas.PostResponse, status_code=status.HTTP_201_CREATED)
def create_post(
    payload: schemas.PostCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Create a new feed post (regular, achievement share, progress log)."""
    post = models.Post(
        user_id=current_user.id,
        content=payload.content,
        media_url=payload.media_url,
        media_type=payload.media_type,
        post_type=payload.post_type,
        achievement_id=payload.achievement_id,
        mission_id=payload.mission_id,
        xp_gained=payload.xp_gained
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    
    # Notify followers if sharing an achievement
    if post.post_type == "achievement":
        followers = db.query(models.UserFollow).filter(models.UserFollow.following_id == current_user.id).all()
        for f in followers:
            notif = models.Notification(
                user_id=f.follower_id,
                sender_id=current_user.id,
                notification_type="achievement_shared",
                post_id=post.id
            )
            db.add(notif)
        db.commit()
        
    # Build complete return representation
    return {
        "id": post.id,
        "user_id": post.user_id,
        "content": post.content,
        "media_url": post.media_url,
        "media_type": post.media_type,
        "post_type": post.post_type,
        "achievement_id": post.achievement_id,
        "mission_id": post.mission_id,
        "xp_gained": post.xp_gained,
        "created_at": post.created_at,
        "updated_at": post.updated_at,
        "user": current_user,
        "likes": [],
        "comments_count": 0,
        "likes_count": 0,
        "growth_score": 1.0
    }


@router.post("/posts/{post_id}/like", response_model=schemas.MessageResponse)
def toggle_like_post(
    post_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Toggle like state on a post."""
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    like = db.query(models.PostLike).filter(
        models.PostLike.post_id == post_id,
        models.PostLike.user_id == current_user.id
    ).first()
    
    if like:
        db.delete(like)
        db.commit()
        return {"message": "Post unliked", "success": True}
    else:
        new_like = models.PostLike(user_id=current_user.id, post_id=post_id)
        db.add(new_like)
        
        # Send Notification to post owner
        if post.user_id != current_user.id:
            notif = models.Notification(
                user_id=post.user_id,
                sender_id=current_user.id,
                notification_type="like",
                post_id=post.id
            )
            db.add(notif)
            
        db.commit()
        return {"message": "Post liked", "success": True}


@router.post("/posts/{post_id}/comments", response_model=schemas.PostCommentResponse, status_code=status.HTTP_201_CREATED)
def add_comment(
    post_id: UUID,
    payload: schemas.PostCommentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Add a comment to a post."""
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    comment = models.PostComment(
        user_id=current_user.id,
        post_id=post_id,
        content=payload.content
    )
    db.add(comment)
    
    # Notify post owner
    if post.user_id != current_user.id:
        notif = models.Notification(
            user_id=post.user_id,
            sender_id=current_user.id,
            notification_type="comment",
            post_id=post.id
        )
        db.add(notif)
        
    db.commit()
    db.refresh(comment)
    return comment


@router.get("/posts/{post_id}/comments", response_model=List[schemas.PostCommentResponse])
def get_comments(
    post_id: UUID,
    db: Session = Depends(get_db)
):
    """Retrieve comments for a post."""
    return db.query(models.PostComment).filter(models.PostComment.post_id == post_id).order_by(models.PostComment.created_at.asc()).all()


@router.post("/follow/{user_id}", response_model=schemas.FollowStatusResponse)
def toggle_follow_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Toggle following status on a user."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot follow yourself")
        
    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    follow = db.query(models.UserFollow).filter(
        models.UserFollow.follower_id == current_user.id,
        models.UserFollow.following_id == user_id
    ).first()
    
    if follow:
        db.delete(follow)
        db.commit()
        return {"is_following": False}
    else:
        new_follow = models.UserFollow(follower_id=current_user.id, following_id=user_id)
        db.add(new_follow)
        
        # Send Notification to target
        notif = models.Notification(
            user_id=user_id,
            sender_id=current_user.id,
            notification_type="follow"
        )
        db.add(notif)
        
        db.commit()
        return {"is_following": True}


@router.get("/friend-requests", response_model=List[schemas.FriendRequestResponse])
def get_friend_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get pending friend requests received by the user."""
    return db.query(models.FriendRequest).filter(
        models.FriendRequest.receiver_id == current_user.id,
        models.FriendRequest.status == "pending"
    ).all()


@router.post("/friend-requests", response_model=schemas.FriendRequestResponse, status_code=status.HTTP_201_CREATED)
def send_friend_request(
    payload: schemas.FriendRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Send a new friend request to a user."""
    if payload.receiver_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot send friend request to yourself")
        
    # Check if a pending or active request already exists
    existing = db.query(models.FriendRequest).filter(
        ((models.FriendRequest.sender_id == current_user.id) & (models.FriendRequest.receiver_id == payload.receiver_id)) |
        ((models.FriendRequest.sender_id == payload.receiver_id) & (models.FriendRequest.receiver_id == current_user.id))
    ).first()
    
    if existing:
        if existing.status == "pending":
            raise HTTPException(status_code=400, detail="Friend request is already pending")
        elif existing.status == "accepted":
            raise HTTPException(status_code=400, detail="You are already friends")
            
    req = models.FriendRequest(
        sender_id=current_user.id,
        receiver_id=payload.receiver_id,
        status="pending"
    )
    db.add(req)
    
    # Notify recipient
    notif = models.Notification(
        user_id=payload.receiver_id,
        sender_id=current_user.id,
        notification_type="friend_request"
    )
    db.add(notif)
    
    db.commit()
    db.refresh(req)
    return req


@router.post("/friend-requests/{request_id}/respond", response_model=schemas.FriendRequestResponse)
def respond_friend_request(
    request_id: UUID,
    status_choice: str, # "accepted" or "declined"
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Respond to an incoming friend request."""
    if status_choice not in ["accepted", "declined"]:
        raise HTTPException(status_code=400, detail="Invalid status choice")
        
    req = db.query(models.FriendRequest).filter(
        models.FriendRequest.id == request_id,
        models.FriendRequest.receiver_id == current_user.id
    ).first()
    
    if not req:
        raise HTTPException(status_code=404, detail="Friend request not found")
        
    req.status = status_choice
    
    # If accepted, automatically set up reciprocal follows to make them "friends" on feed
    if status_choice == "accepted":
        # Follow check sender -> receiver
        f1 = db.query(models.UserFollow).filter(
            models.UserFollow.follower_id == req.sender_id,
            models.UserFollow.following_id == req.receiver_id
        ).first()
        if not f1:
            db.add(models.UserFollow(follower_id=req.sender_id, following_id=req.receiver_id))
            
        # Follow check receiver -> sender
        f2 = db.query(models.UserFollow).filter(
            models.UserFollow.follower_id == req.receiver_id,
            models.UserFollow.following_id == req.sender_id
        ).first()
        if not f2:
            db.add(models.UserFollow(follower_id=req.receiver_id, following_id=req.sender_id))
            
        # Notify sender they are now friends
        notif = models.Notification(
            user_id=req.sender_id,
            sender_id=current_user.id,
            notification_type="follow"
        )
        db.add(notif)
        
    db.commit()
    db.refresh(req)
    return req


@router.get("/notifications", response_model=List[schemas.NotificationResponse])
def get_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get all notifications for current user (recent first)."""
    return db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    ).order_by(models.Notification.created_at.desc()).all()


@router.post("/notifications/{notification_id}/read", response_model=schemas.MessageResponse)
def mark_notification_read(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Mark a notification as read."""
    notif = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == current_user.id
    ).first()
    
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notif.is_read = True
    db.commit()
    return {"message": "Notification marked as read", "success": True}

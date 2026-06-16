import re
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from fastapi import HTTPException, status

from app import models
from app.guild_schemas import GuildCreate, GuildUpdate, GuildChallengeCreate
from app.security import calculate_level_from_xp


def _slugify(name: str) -> str:
    """Generate a unique, URL-safe slug from a string."""
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_-]+", "-", slug)
    slug = re.sub(r"^-+|-+$", "", slug)
    return slug


def _award_user_xp(db: Session, user_id: uuid.UUID, xp: int):
    """Add XP to user gamification and recalculate level."""
    gam = db.query(models.UserGamification).filter(
        models.UserGamification.user_id == user_id
    ).first()
    if gam:
        gam.xp += xp
        gam.total_xp_earned += xp
        gam.level = calculate_level_from_xp(gam.total_xp_earned)
        db.flush()


def _award_guild_xp(db: Session, guild: models.Guild, xp: int):
    """Add XP to guild and recalculate level."""
    guild.xp += xp
    guild.level = calculate_level_from_xp(guild.xp)
    db.flush()
    check_guild_achievements(db, guild.id)


def create_guild(db: Session, user: models.User, payload: GuildCreate) -> models.Guild:
    """Create a new guild, making the creator the OWNER."""
    # Check uniqueness
    slug = _slugify(payload.name)
    existing_slug = db.query(models.Guild).filter(models.Guild.slug == slug).first()
    if existing_slug:
        # Append random suffix if slug collides
        slug = f"{slug}-{uuid.uuid4().hex[:4]}"

    existing_name = db.query(models.Guild).filter(models.Guild.name == payload.name).first()
    if existing_name:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A guild with this name already exists"
        )

    guild = models.Guild(
        name=payload.name,
        slug=slug,
        description=payload.description,
        category=payload.category,
        icon=payload.icon,
        is_public=payload.is_public,
        max_members=payload.max_members,
        created_by=user.id,
    )
    db.add(guild)
    db.flush()

    # Add creator as OWNER
    member = models.GuildMember(
        guild_id=guild.id,
        user_id=user.id,
        role=models.GuildMemberRole.OWNER,
    )
    db.add(member)
    db.commit()
    db.refresh(guild)
    setattr(guild, "member_count", 1)
    return guild


def update_guild(db: Session, user: models.User, guild_id: uuid.UUID, payload: GuildUpdate) -> models.Guild:
    """Update guild settings (OWNER or ADMIN only)."""
    guild = db.query(models.Guild).filter(models.Guild.id == guild_id).first()
    if not guild:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guild not found")

    # Verify role
    member = db.query(models.GuildMember).filter(
        models.GuildMember.guild_id == guild_id,
        models.GuildMember.user_id == user.id
    ).first()

    if not member or member.role not in [models.GuildMemberRole.OWNER, models.GuildMemberRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only guild owners or admins can modify settings"
        )

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(guild, field, value)

    db.commit()
    db.refresh(guild)
    
    # Needs member_count for GuildResponse
    member_count = db.query(func.count(models.GuildMember.id)).filter(models.GuildMember.guild_id == guild_id).scalar()
    setattr(guild, "member_count", member_count or 0)
    
    return guild


def list_guilds(db: Session, category: Optional[str] = None, search: Optional[str] = None) -> List[Dict[str, Any]]:
    """List public guilds with member count."""
    query = db.query(
        models.Guild,
        func.count(models.GuildMember.id).label("member_count")
    ).outerjoin(models.GuildMember, models.Guild.id == models.GuildMember.guild_id)

    if category:
        query = query.filter(models.Guild.category == category)
    if search:
        query = query.filter(models.Guild.name.ilike(f"%{search}%") | models.Guild.description.ilike(f"%{search}%"))

    query = query.group_by(models.Guild.id).order_by(desc("member_count"))
    results = query.all()

    output = []
    for guild, member_count in results:
        guild_dict = {
            "id": guild.id,
            "name": guild.name,
            "slug": guild.slug,
            "description": guild.description,
            "category": guild.category,
            "icon": guild.icon,
            "banner_url": guild.banner_url,
            "is_public": guild.is_public,
            "max_members": guild.max_members,
            "xp": guild.xp,
            "level": guild.level,
            "member_count": member_count,
            "created_by": guild.created_by,
            "created_at": guild.created_at,
        }
        output.append(guild_dict)

    return output


def get_guild_detail(db: Session, user: models.User, guild_id: uuid.UUID) -> Dict[str, Any]:
    """Retrieve full guild information."""
    guild = db.query(models.Guild).filter(models.Guild.id == guild_id).first()
    if not guild:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guild not found")

    # Get members list with user details
    members_q = db.query(
        models.GuildMember,
        models.User.username,
        models.UserProfile.full_name,
        models.UserProfile.avatar_url
    ).join(models.User, models.GuildMember.user_id == models.User.id)\
     .outerjoin(models.UserProfile, models.User.id == models.UserProfile.user_id)\
     .filter(models.GuildMember.guild_id == guild_id)\
     .order_by(desc(models.GuildMember.xp_contributed))\
     .all()

    members = []
    user_role = None
    for member, username, full_name, avatar_url in members_q:
        if member.user_id == user.id:
            user_role = member.role
        members.append({
            "id": member.id,
            "user_id": member.user_id,
            "username": username,
            "full_name": full_name,
            "avatar_url": avatar_url,
            "role": member.role,
            "xp_contributed": member.xp_contributed,
            "joined_at": member.joined_at,
        })

    # Get chat history (recent 50 messages)
    chat_q = db.query(
        models.GuildChatMessage,
        models.User.username,
        models.UserProfile.avatar_url
    ).join(models.User, models.GuildChatMessage.user_id == models.User.id)\
     .outerjoin(models.UserProfile, models.User.id == models.UserProfile.user_id)\
     .filter(models.GuildChatMessage.guild_id == guild_id)\
     .order_by(desc(models.GuildChatMessage.created_at))\
     .limit(50)\
     .all()

    chat = []
    for msg, username, avatar_url in reversed(chat_q):
        chat.append({
            "id": msg.id,
            "guild_id": msg.guild_id,
            "user_id": msg.user_id,
            "username": username,
            "avatar_url": avatar_url,
            "content": msg.content,
            "created_at": msg.created_at,
        })

    # Get active & completed challenges
    challenges_q = db.query(
        models.GuildChallenge,
        func.count(models.GuildChallengeParticipant.id).label("participant_count")
    ).outerjoin(models.GuildChallengeParticipant, models.GuildChallenge.id == models.GuildChallengeParticipant.challenge_id)\
     .filter(models.GuildChallenge.guild_id == guild_id)\
     .group_by(models.GuildChallenge.id)\
     .order_by(desc(models.GuildChallenge.created_at))\
     .all()

    challenges = []
    for ch, p_count in challenges_q:
        participant_status = db.query(models.GuildChallengeParticipant).filter(
            models.GuildChallengeParticipant.challenge_id == ch.id,
            models.GuildChallengeParticipant.user_id == user.id
        ).first()

        challenges.append({
            "id": ch.id,
            "guild_id": ch.guild_id,
            "title": ch.title,
            "description": ch.description,
            "xp_reward": ch.xp_reward,
            "target_count": ch.target_count,
            "status": ch.status,
            "starts_at": ch.starts_at,
            "ends_at": ch.ends_at,
            "participants_count": p_count,
            "user_progress": participant_status.progress if participant_status else None,
            "user_completed": participant_status.completed if participant_status else False,
        })

    # Get achievements
    achievements_q = db.query(models.GuildAchievement).filter(
        models.GuildAchievement.guild_id == guild_id
    ).order_by(models.GuildAchievement.unlocked.desc(), models.GuildAchievement.title).all()

    achievements = [{
        "id": ach.id,
        "guild_id": ach.guild_id,
        "title": ach.title,
        "description": ach.description,
        "icon": ach.icon,
        "xp_reward": ach.xp_reward,
        "unlocked": ach.unlocked,
        "unlocked_at": ach.unlocked_at,
    } for ach in achievements_q]

    # Calculate basic guild stats
    member_count = db.query(func.count(models.GuildMember.id)).filter(models.GuildMember.guild_id == guild_id).scalar()

    return {
        "guild": {
            "id": guild.id,
            "name": guild.name,
            "slug": guild.slug,
            "description": guild.description,
            "category": guild.category,
            "icon": guild.icon,
            "banner_url": guild.banner_url,
            "is_public": guild.is_public,
            "max_members": guild.max_members,
            "xp": guild.xp,
            "level": guild.level,
            "member_count": member_count or 0,
            "created_by": guild.created_by,
            "created_at": guild.created_at,
        },
        "members": members,
        "recent_chat": chat,
        "challenges": challenges,
        "achievements": achievements,
        "user_role": user_role,
    }


def join_guild(db: Session, user: models.User, guild_id: uuid.UUID) -> models.GuildMember:
    """Add a user to a guild."""
    guild = db.query(models.Guild).filter(models.Guild.id == guild_id).first()
    if not guild:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guild not found")

    # Check if already a member
    existing = db.query(models.GuildMember).filter(
        models.GuildMember.guild_id == guild_id,
        models.GuildMember.user_id == user.id
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You are already a member of this guild")

    # Check member limit
    member_count = db.query(func.count(models.GuildMember.id)).filter(models.GuildMember.guild_id == guild_id).scalar()
    if member_count >= guild.max_members:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Guild has reached its maximum member limit")

    member = models.GuildMember(
        guild_id=guild_id,
        user_id=user.id,
        role=models.GuildMemberRole.MEMBER,
    )
    db.add(member)
    db.flush()

    # Trigger achievement check for member count
    check_guild_achievements(db, guild_id)

    db.commit()
    db.refresh(member)
    
    # Load profile manually if needed, or rely on relationship
    # `user` is passed in, so we can access user.username and user.profile
    return {
        "id": member.id,
        "user_id": member.user_id,
        "username": user.username,
        "full_name": user.profile.full_name if user.profile else None,
        "avatar_url": user.profile.avatar_url if user.profile else None,
        "role": member.role,
        "xp_contributed": member.xp_contributed,
        "joined_at": member.joined_at
    }


def leave_guild(db: Session, user: models.User, guild_id: uuid.UUID) -> bool:
    """Remove a user from a guild."""
    member = db.query(models.GuildMember).filter(
        models.GuildMember.guild_id == guild_id,
        models.GuildMember.user_id == user.id
    ).first()

    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guild membership not found")

    if member.role == models.GuildMemberRole.OWNER:
        # Check if there are other members
        other_members = db.query(models.GuildMember).filter(
            models.GuildMember.guild_id == guild_id,
            models.GuildMember.user_id != user.id
        ).all()
        if other_members:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="As the owner, you must transfer ownership before leaving the guild"
            )
        else:
            # Delete the guild entirely if owner leaves and no one else is there
            guild = db.query(models.Guild).filter(models.Guild.id == guild_id).first()
            if guild:
                db.delete(guild)
                db.commit()
                return True

    db.delete(member)
    db.commit()
    return True


def send_chat_message(db: Session, user: models.User, guild_id: uuid.UUID, content: str) -> models.GuildChatMessage:
    """Send a chat message to a guild (requires membership)."""
    # Verify membership
    member = db.query(models.GuildMember).filter(
        models.GuildMember.guild_id == guild_id,
        models.GuildMember.user_id == user.id
    ).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You must be a member of the guild to chat")

    msg = models.GuildChatMessage(
        guild_id=guild_id,
        user_id=user.id,
        content=content,
    )
    db.add(msg)

    # Award 2 XP to user and guild for active engagement (limit to one message every 10 sec if needed, but simple for now)
    _award_user_xp(db, user.id, 2)
    _award_guild_xp(db, db.query(models.Guild).filter(models.Guild.id == guild_id).first(), 2)

    db.commit()
    db.refresh(msg)
    
    return {
        "id": msg.id,
        "guild_id": msg.guild_id,
        "user_id": msg.user_id,
        "username": user.username,
        "avatar_url": user.profile.avatar_url if user.profile else None,
        "content": msg.content,
        "created_at": msg.created_at
    }


def get_chat_messages(db: Session, guild_id: uuid.UUID, limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieve chat history."""
    chat_q = db.query(
        models.GuildChatMessage,
        models.User.username,
        models.UserProfile.avatar_url
    ).join(models.User, models.GuildChatMessage.user_id == models.User.id)\
     .outerjoin(models.UserProfile, models.User.id == models.UserProfile.user_id)\
     .filter(models.GuildChatMessage.guild_id == guild_id)\
     .order_by(desc(models.GuildChatMessage.created_at))\
     .limit(limit)\
     .all()

    chat = []
    for msg, username, avatar_url in reversed(chat_q):
        chat.append({
            "id": msg.id,
            "guild_id": msg.guild_id,
            "user_id": msg.user_id,
            "username": username,
            "avatar_url": avatar_url,
            "content": msg.content,
            "created_at": msg.created_at,
        })
    return chat


def create_challenge(db: Session, user: models.User, guild_id: uuid.UUID, payload: GuildChallengeCreate) -> models.GuildChallenge:
    """Create a new guild challenge (OWNER or ADMIN only)."""
    member = db.query(models.GuildMember).filter(
        models.GuildMember.guild_id == guild_id,
        models.GuildMember.user_id == user.id
    ).first()

    if not member or member.role not in [models.GuildMemberRole.OWNER, models.GuildMemberRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only guild owners or admins can create challenges"
        )

    challenge = models.GuildChallenge(
        guild_id=guild_id,
        title=payload.title,
        description=payload.description,
        xp_reward=payload.xp_reward,
        target_count=payload.target_count,
        ends_at=payload.ends_at,
        created_by=user.id,
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    return challenge


def join_challenge(db: Session, user: models.User, challenge_id: uuid.UUID) -> models.GuildChallengeParticipant:
    """Join an active challenge."""
    challenge = db.query(models.GuildChallenge).filter(models.GuildChallenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found")

    if challenge.status != models.GuildChallengeStatus.ACTIVE or challenge.ends_at < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Challenge is no longer active")

    # Must be a member of the guild
    member = db.query(models.GuildMember).filter(
        models.GuildMember.guild_id == challenge.guild_id,
        models.GuildMember.user_id == user.id
    ).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You must be a member of the guild to participate")

    existing = db.query(models.GuildChallengeParticipant).filter(
        models.GuildChallengeParticipant.challenge_id == challenge_id,
        models.GuildChallengeParticipant.user_id == user.id
    ).first()

    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You are already participating in this challenge")

    participant = models.GuildChallengeParticipant(
        challenge_id=challenge_id,
        user_id=user.id,
        progress=0,
        completed=False,
    )
    db.add(participant)
    db.commit()
    db.refresh(participant)
    return participant


def log_challenge_progress(db: Session, user: models.User, challenge_id: uuid.UUID, increment: int = 1) -> Dict[str, Any]:
    """Log progress for a challenge."""
    participant = db.query(models.GuildChallengeParticipant).filter(
        models.GuildChallengeParticipant.challenge_id == challenge_id,
        models.GuildChallengeParticipant.user_id == user.id
    ).first()

    if not participant:
        # Join automatically if not joined
        participant = join_challenge(db, user, challenge_id)

    challenge = participant.challenge
    if challenge.status != models.GuildChallengeStatus.ACTIVE or challenge.ends_at < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Challenge is no longer active")

    if participant.completed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Challenge already completed")

    new_progress = min(participant.progress + increment, challenge.target_count)
    participant.progress = new_progress

    newly_completed = False
    if new_progress >= challenge.target_count:
        participant.completed = True
        participant.completed_at = datetime.utcnow()
        newly_completed = True

        # Award XP to user
        _award_user_xp(db, user.id, challenge.xp_reward)

        # Award XP to guild
        guild = db.query(models.Guild).filter(models.Guild.id == challenge.guild_id).first()
        if guild:
            _award_guild_xp(db, guild, challenge.xp_reward)

        # Update member's contribution
        member = db.query(models.GuildMember).filter(
            models.GuildMember.guild_id == challenge.guild_id,
            models.GuildMember.user_id == user.id
        ).first()
        if member:
            member.xp_contributed += challenge.xp_reward

        # Check for achievements
        check_guild_achievements(db, challenge.guild_id)

    db.commit()
    db.refresh(participant)

    return {
        "participant": {
            "id": participant.id,
            "challenge_id": participant.challenge_id,
            "user_id": participant.user_id,
            "progress": participant.progress,
            "completed": participant.completed,
            "completed_at": participant.completed_at,
        },
        "newly_completed": newly_completed,
        "xp_rewarded": challenge.xp_reward if newly_completed else 0,
    }


def get_guild_leaderboard(db: Session, limit: int = 20) -> List[Dict[str, Any]]:
    """Rank guilds globally by total XP."""
    results = db.query(
        models.Guild,
        func.count(models.GuildMember.id).label("member_count")
    ).outerjoin(models.GuildMember, models.Guild.id == models.GuildMember.guild_id)\
     .group_by(models.Guild.id)\
     .order_by(desc(models.Guild.xp))\
     .limit(limit)\
     .all()

    leaderboard = []
    for rank, (guild, member_count) in enumerate(results, start=1):
        leaderboard.append({
            "guild_id": guild.id,
            "guild_name": guild.name,
            "guild_icon": guild.icon,
            "category": guild.category,
            "total_xp": guild.xp,
            "level": guild.level,
            "member_count": member_count,
            "rank": rank,
        })
    return leaderboard


def get_member_leaderboard(db: Session, guild_id: uuid.UUID) -> List[Dict[str, Any]]:
    """Rank members within a specific guild by xp_contributed."""
    results = db.query(
        models.GuildMember,
        models.User.username,
        models.UserProfile.full_name,
        models.UserProfile.avatar_url
    ).join(models.User, models.GuildMember.user_id == models.User.id)\
     .outerjoin(models.UserProfile, models.User.id == models.UserProfile.user_id)\
     .filter(models.GuildMember.guild_id == guild_id)\
     .order_by(desc(models.GuildMember.xp_contributed))\
     .all()

    leaderboard = []
    for rank, (member, username, full_name, avatar_url) in enumerate(results, start=1):
        leaderboard.append({
            "rank": rank,
            "user_id": member.user_id,
            "username": username,
            "full_name": full_name,
            "avatar_url": avatar_url,
            "xp_contributed": member.xp_contributed,
            "role": member.role,
        })
    return leaderboard


def check_guild_achievements(db: Session, guild_id: uuid.UUID):
    """Check and unlock achievements for a guild."""
    guild = db.query(models.Guild).filter(models.Guild.id == guild_id).first()
    if not guild:
        return

    # Unlocked achievements
    achievements = db.query(models.GuildAchievement).filter(
        models.GuildAchievement.guild_id == guild_id,
        models.GuildAchievement.unlocked == False
    ).all()

    member_count = db.query(func.count(models.GuildMember.id)).filter(models.GuildMember.guild_id == guild_id).scalar()
    completed_challenges_count = db.query(func.count(models.GuildChallenge.id)).filter(
        models.GuildChallenge.guild_id == guild_id,
        models.GuildChallenge.status == models.GuildChallengeStatus.COMPLETED
    ).scalar()

    for ach in achievements:
        unlocked = False
        if ach.condition_type == "members_count" and member_count >= ach.condition_value:
            unlocked = True
        elif ach.condition_type == "guild_xp" and guild.xp >= ach.condition_value:
            unlocked = True
        elif ach.condition_type == "challenges_completed" and completed_challenges_count >= ach.condition_value:
            unlocked = True

        if unlocked:
            ach.unlocked = True
            ach.unlocked_at = datetime.utcnow()
            # Award reward XP to guild
            guild.xp += ach.xp_reward
            guild.level = calculate_level_from_xp(guild.xp)


def recommend_guilds(db: Session, user: models.User) -> List[Dict[str, Any]]:
    """AI personality match logic for guild recommendation."""
    # Load profile data
    profile = db.query(models.PersonalityProfile).filter(models.PersonalityProfile.user_id == user.id).first()
    onboarding = db.query(models.OnboardingResponse).filter(models.OnboardingResponse.user_id == user.id).first()

    # Load all public guilds with member counts
    public_guilds = db.query(
        models.Guild,
        func.count(models.GuildMember.id).label("member_count")
    ).outerjoin(models.GuildMember, models.Guild.id == models.GuildMember.guild_id)\
     .filter(models.Guild.is_public == True)\
     .group_by(models.Guild.id)\
     .all()

    if not public_guilds:
        return []

    # Map categories to interest keywords
    category_keywords = {
        models.GuildCategory.AI: ["ai", "ml", "artificial", "intelligence", "machine learning", "tech", "coding", "programming", "python"],
        models.GuildCategory.CRICKET: ["cricket", "sports", "batting", "bowling", "fielding", "match", "play"],
        models.GuildCategory.GAMING: ["game", "gaming", "play", "multiplayer", "xbox", "ps5", "pc", "esports"],
        models.GuildCategory.MOVIE: ["movie", "movies", "film", "cinema", "show", "series", "watch"],
        models.GuildCategory.STARTUP: ["startup", "business", "founder", "entrepreneur", "launch", "scale", "product"],
        models.GuildCategory.FITNESS: ["fitness", "gym", "workout", "run", "health", "exercise", "bodybuilding"],
        models.GuildCategory.EDUCATION: ["learn", "study", "education", "course", "knowledge", "read", "book"],
        models.GuildCategory.PROGRAMMING: ["code", "programming", "coding", "developer", "software", "development", "web", "app"],
        models.GuildCategory.CREATIVITY: ["creative", "creativity", "art", "design", "music", "write", "paint", "sketch"],
        models.GuildCategory.OTHER: []
    }

    # Aggregate user interest terms
    user_terms = set()
    if onboarding:
        for field in ["hobbies", "interests", "sports", "movies", "games", "skills_to_learn", "career_goals", "personal_goals"]:
            val = getattr(onboarding, field, [])
            if val:
                for term in val:
                    user_terms.update(term.lower().split())

    if profile:
        if profile.archetype_tags:
            for tag in profile.archetype_tags:
                user_terms.update(tag.lower().split())
        if profile.recommended_skills:
            for skill in profile.recommended_skills:
                user_terms.update(skill.lower().split())

    recommendations = []

    for guild, member_count in public_guilds:
        score = 0
        reasons = []

        # Category matching
        cat_words = category_keywords.get(guild.category, [])
        matches = [w for w in cat_words if w in user_terms]
        if matches:
            score += 15
            reasons.append(f"aligns with your interest in {matches[0].upper()}")

        # Content match (description)
        desc_lower = guild.description.lower() if guild.description else ""
        desc_matches = [t for t in user_terms if t in desc_lower and len(t) > 2]
        if desc_matches:
            score += len(desc_matches) * 2
            reasons.append("matches your onboarding goals")

        # Name match
        name_lower = guild.name.lower()
        name_matches = [t for t in user_terms if t in name_lower and len(t) > 2]
        if name_matches:
            score += len(name_matches) * 3
            reasons.append("specifically covers your skills")

        # Basic popularity boosting
        score += min(member_count * 0.5, 5)

        # Generate reason string
        if reasons:
            reason = f"This guild {reasons[0]} and fits your AI personality archetype."
        else:
            reason = "Recommended for you to connect with active learners on Evolvo."

        recommendations.append({
            "guild_id": guild.id,
            "guild_name": guild.name,
            "guild_icon": guild.icon,
            "category": guild.category,
            "description": guild.description,
            "member_count": member_count,
            "reason": reason,
            "score": score
        })

    # Sort by score descending and return top 5
    recommendations.sort(key=lambda x: x["score"], reverse=True)
    return recommendations[:5]


def seed_default_guilds(db: Session) -> dict:
    """Create default guilds and achievements."""
    default_guilds_data = [
        {
            "name": "AI Pioneers",
            "category": models.GuildCategory.AI,
            "icon": "🤖",
            "description": "Master artificial intelligence, machine learning, and LLMs together."
        },
        {
            "name": "Cricket Legends",
            "category": models.GuildCategory.CRICKET,
            "icon": "🏏",
            "description": "Train, strategize, and dominate the cricket pitch."
        },
        {
            "name": "Gaming Elite",
            "category": models.GuildCategory.GAMING,
            "icon": "🎮",
            "description": "Level up your gaming skills and compete in multiplayer challenges."
        },
        {
            "name": "Movie Buffs",
            "category": models.GuildCategory.MOVIE,
            "icon": "🎬",
            "description": "Discuss, review, and discover cinematic masterpieces together."
        },
        {
            "name": "Startup Founders",
            "category": models.GuildCategory.STARTUP,
            "icon": "🚀",
            "description": "Build, launch, and scale startup businesses together."
        }
    ]

    guilds_created = 0
    achievements_created = 0

    for gd in default_guilds_data:
        # Check if already exists
        exists = db.query(models.Guild).filter(models.Guild.name == gd["name"]).first()
        if not exists:
            slug = _slugify(gd["name"])
            guild = models.Guild(
                name=gd["name"],
                slug=slug,
                category=gd["category"],
                icon=gd["icon"],
                description=gd["description"],
                is_public=True,
                max_members=100
            )
            db.add(guild)
            db.flush()
            guilds_created += 1

            # Seed 3 achievements for each guild
            ach1 = models.GuildAchievement(
                guild_id=guild.id,
                title="First Steps",
                description="Reach 5 members in this guild.",
                icon="👥",
                xp_reward=150,
                condition_type="members_count",
                condition_value=5
            )
            ach2 = models.GuildAchievement(
                guild_id=guild.id,
                title="Rising Star",
                description="Accumulate 1000 Guild XP.",
                icon="⭐",
                xp_reward=300,
                condition_type="guild_xp",
                condition_value=1000
            )
            ach3 = models.GuildAchievement(
                guild_id=guild.id,
                title="Elite Squad",
                description="Reach 25 members in this guild.",
                icon="👑",
                xp_reward=500,
                condition_type="members_count",
                condition_value=25
            )
            db.add_all([ach1, ach2, ach3])
            achievements_created += 3

    db.commit()
    return {"guilds_created": guilds_created, "achievements_created": achievements_created}

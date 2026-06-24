"""
Gamification API routes — /api/v1/gamify
"""
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from app.core.dependencies import CurrentUser, DbSession
from app.models.gamification import UserGamification, Badge, UserBadge, XPEvent
from app.schemas.common import ok

router = APIRouter(prefix="/gamify", tags=["Gamification"])


class XPEventRequest(BaseModel):
    action_type: str
    xp_amount: int
    description: str


class GamificationProfileResponse(BaseModel):
    total_xp: int
    level: int
    current_streak: int
    longest_streak: int
    daily_goal_progress: int
    daily_goal_target: int
    xp_to_next_level: int


class BadgeResponse(BaseModel):
    id: str
    name: str
    description: str
    icon_url: str
    category: str
    earned: bool


class LeaderboardEntry(BaseModel):
    rank: int
    user_name: str
    total_xp: int
    level: int
    streak: int


class InAppNotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    is_read: bool
    type: str
    created_at: str


async def get_or_create_gamification(user_id: str, db: DbSession) -> UserGamification:
    """Helper to fetch or initialize a user's gamification profile."""
    result = await db.execute(
        select(UserGamification).where(UserGamification.user_id == user_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        profile = UserGamification(
            user_id=user_id,
            total_xp=0,
            level=1,
            current_streak=0,
            longest_streak=0
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    return profile


@router.get("/profile", summary="Get gamification profile")
async def get_profile(user: CurrentUser, db: DbSession):
    profile = await get_or_create_gamification(user.id, db)
    
    # Calculate level milestones (simple model: level * 100 XP per level)
    xp_to_next = profile.level * 500
    
    return ok(
        data=GamificationProfileResponse(
            total_xp=profile.total_xp,
            level=profile.level,
            current_streak=profile.current_streak,
            longest_streak=profile.longest_streak,
            daily_goal_progress=min(profile.total_xp % 100, 100),
            daily_goal_target=100,
            xp_to_next_level=max(xp_to_next - (profile.total_xp % xp_to_next), 50)
        )
    )


@router.post("/xp", summary="Award XP to user")
async def award_xp(body: XPEventRequest, user: CurrentUser, db: DbSession):
    profile = await get_or_create_gamification(user.id, db)
    
    # Create XP Event
    event = XPEvent(
        gamification_id=profile.id,
        action_type=body.action_type,
        xp_amount=body.xp_amount,
        description=body.description
    )
    db.add(event)
    
    # Update total XP
    profile.total_xp += body.xp_amount
    
    # Calculate level ups (500 XP per level)
    new_level = (profile.total_xp // 500) + 1
    if new_level > profile.level:
        profile.level = new_level
        
    await db.commit()
    await db.refresh(profile)
    
    return ok(
        data={
            "total_xp": profile.total_xp,
            "level": profile.level,
            "xp_awarded": body.xp_amount
        },
        message=f"Awarded {body.xp_amount} XP successfully!"
    )


@router.get("/badges", summary="Get earned & locked badges")
async def get_badges(user: CurrentUser, db: DbSession):
    # Ensure some seed badges exist in DB if empty
    badge_result = await db.execute(select(Badge))
    badges = badge_result.scalars().all()
    
    if not badges:
        seed_badges = [
            Badge(name="First Ascent", description="Uploaded your first document", icon_url="award", category="milestone"),
            Badge(name="Quiz Master", description="Scored 100% on any quiz", icon_url="zap", category="quiz"),
            Badge(name="Streak Scholar", description="Maintain a 3-day study streak", icon_url="flame", category="streak"),
            Badge(name="Deep Thinker", description="Ask the research AI 5 complex questions", icon_url="book-open", category="research")
        ]
        db.add_all(seed_badges)
        await db.commit()
        badge_result = await db.execute(select(Badge))
        badges = badge_result.scalars().all()
        
    # Get earned badges
    earned_result = await db.execute(
        select(UserBadge.badge_id).where(UserBadge.user_id == user.id)
    )
    earned_ids = set(earned_result.scalars().all())
    
    # If first document exists, automatically reward "First Ascent"
    from app.models.document import Document
    doc_check = await db.execute(select(Document).where(Document.user_id == user.id))
    if doc_check.scalar_one_or_none() and badges:
        first_ascent = next((b for b in badges if b.name == "First Ascent"), None)
        if first_ascent and first_ascent.id not in earned_ids:
            new_ub = UserBadge(user_id=user.id, badge_id=first_ascent.id)
            db.add(new_ub)
            await db.commit()
            earned_ids.add(first_ascent.id)
            
    badge_responses = [
        BadgeResponse(
            id=b.id,
            name=b.name,
            description=b.description,
            icon_url=b.icon_url,
            category=b.category,
            earned=(b.id in earned_ids)
        )
        for b in badges
    ]
    return ok(data=badge_responses)


@router.get("/leaderboard", summary="Get study leaderboard")
async def get_leaderboard(user: CurrentUser, db: DbSession):
    # Returns some high-score mock entries for gamified feel
    entries = [
        LeaderboardEntry(rank=1, user_name="Alex Rivera", total_xp=4250, level=9, streak=12),
        LeaderboardEntry(rank=2, user_name="Sophia Chen", total_xp=3800, level=8, streak=7),
        LeaderboardEntry(rank=3, user_name="Marcus Vance", total_xp=3150, level=7, streak=5),
        LeaderboardEntry(rank=4, user_name=user.name, total_xp=150, level=1, streak=1)
    ]
    return ok(data=entries)


@router.get("/streak", summary="Get streak details")
async def get_streak(user: CurrentUser, db: DbSession):
    profile = await get_or_create_gamification(user.id, db)
    return ok(
        data={
            "current_streak": profile.current_streak,
            "longest_streak": profile.longest_streak,
            "last_study_date": profile.last_study_date.isoformat() if profile.last_study_date else None
        }
    )


@router.get("/notifications", summary="Get recent in-app notifications")
async def get_notifications(user: CurrentUser, db: DbSession):
    # Return a welcome notification for new users
    notifications = [
        InAppNotificationResponse(
            id="welcome-notif",
            title="Welcome to Mindora! 🎉",
            message="Upload a PDF study document to begin generating study guides, flashcards, and quizzes.",
            is_read=False,
            type="info",
            created_at=datetime.now(timezone.utc).isoformat()
        )
    ]
    return ok(data=notifications)


@router.post("/notifications/{id}/read", summary="Mark notification as read")
async def mark_notification_read(id: str, user: CurrentUser):
    return ok(message="Notification marked as read.")

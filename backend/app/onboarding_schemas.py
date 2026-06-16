"""Onboarding schemas — request/response types for the questionnaire and AI analysis."""
import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, field_validator


# ─── Onboarding Submission ────────────────────────────────────────

class OnboardingSubmitRequest(BaseModel):
    """The 10-question onboarding form payload."""
    hobbies:           List[str] = []
    interests:         List[str] = []
    sports:            List[str] = []
    movies:            List[str] = []
    games:             List[str] = []
    skills_to_learn:   List[str] = []
    career_goals:      List[str] = []
    personal_goals:    List[str] = []
    strengths:         List[str] = []
    areas_to_improve:  List[str] = []

    @field_validator("*", mode="before")
    @classmethod
    def clean_list(cls, v):
        if isinstance(v, list):
            return [s.strip() for s in v if isinstance(s, str) and s.strip()]
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "hobbies": ["reading", "coding", "hiking"],
                "interests": ["AI", "entrepreneurship", "philosophy"],
                "sports": ["basketball", "swimming"],
                "movies": ["sci-fi", "documentaries"],
                "games": ["strategy games", "puzzle games"],
                "skills_to_learn": ["machine learning", "public speaking"],
                "career_goals": ["software engineer", "startup founder"],
                "personal_goals": ["run a marathon", "write a book"],
                "strengths": ["analytical thinking", "persistence"],
                "areas_to_improve": ["time management", "social confidence"],
            }
        }


class OnboardingResponseSchema(BaseModel):
    """Raw onboarding answers as stored."""
    id: uuid.UUID
    user_id: uuid.UUID
    hobbies: List[str]
    interests: List[str]
    sports: List[str]
    movies: List[str]
    games: List[str]
    skills_to_learn: List[str]
    career_goals: List[str]
    personal_goals: List[str]
    strengths: List[str]
    areas_to_improve: List[str]
    submitted_at: datetime

    class Config:
        from_attributes = True


# ─── Score Models ─────────────────────────────────────────────────

class PersonalityScores(BaseModel):
    knowledge_score:     int
    fitness_score:       int
    creativity_score:    int
    leadership_score:    int
    communication_score: int
    social_score:        int


# ─── Personality Profile Response ─────────────────────────────────

class PersonalityProfileResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID

    personality_type:     Optional[str]
    personality_emoji:    Optional[str]
    personality_summary:  Optional[str]

    scores: PersonalityScores

    identified_strengths:   List[str]
    identified_weaknesses:  List[str]
    growth_opportunities:   List[str]
    motivation_style:       Optional[str]
    motivation_description: Optional[str]
    recommended_missions:   List[str]
    recommended_skills:     List[str]
    archetype_tags:         List[str]

    generated_at: datetime
    updated_at:   datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_with_scores(cls, obj):
        return cls(
            id=obj.id,
            user_id=obj.user_id,
            personality_type=obj.personality_type,
            personality_emoji=obj.personality_emoji,
            personality_summary=obj.personality_summary,
            scores=PersonalityScores(
                knowledge_score=obj.knowledge_score,
                fitness_score=obj.fitness_score,
                creativity_score=obj.creativity_score,
                leadership_score=obj.leadership_score,
                communication_score=obj.communication_score,
                social_score=obj.social_score,
            ),
            identified_strengths=obj.identified_strengths or [],
            identified_weaknesses=obj.identified_weaknesses or [],
            growth_opportunities=obj.growth_opportunities or [],
            motivation_style=obj.motivation_style,
            motivation_description=obj.motivation_description,
            recommended_missions=obj.recommended_missions or [],
            recommended_skills=obj.recommended_skills or [],
            archetype_tags=obj.archetype_tags or [],
            generated_at=obj.generated_at,
            updated_at=obj.updated_at,
        )


# ─── Onboarding Submit Response ───────────────────────────────────

class OnboardingSubmitResponse(BaseModel):
    message:             str
    onboarding_complete: bool
    personality_profile: PersonalityProfileResponse


# ─── Onboarding Status ────────────────────────────────────────────

class OnboardingStatusResponse(BaseModel):
    onboarding_complete: bool
    has_personality_profile: bool

"""Pydantic models for API request/response schemas."""

from __future__ import annotations
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
from typing import Optional


# ── Enums ──────────────────────────────────────────────────────

class SwipeDirection(str, Enum):
    RIGHT = "right"   # user knows the word
    LEFT = "left"     # user doesn't know


class CEFRLevel(str, Enum):
    A1 = "A1"
    A2 = "A2"
    B1 = "B1"
    B2 = "B2"
    C1 = "C1"
    C2 = "C2"


class RecommendationSource(str, Enum):
    LEVEL_MATCH = "level_match"
    TOPIC_INTEREST = "topic_interest"
    SPACED_REPETITION = "spaced_repetition"
    AI_GENERATED = "ai_generated"


class CardCategory(str, Enum):
    VOCABULARY = "vocabulary"
    GRAMMAR = "grammar"
    IDIOM = "idiom"
    COLLOCATION = "collocation"
    PHRASAL_VERB = "phrasal-verb"


class Difficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


# ── Request Models ─────────────────────────────────────────────

class SwipeEventRequest(BaseModel):
    """Sent by the client every time the user swipes a card."""
    user_id: str
    flashcard_id: str
    direction: SwipeDirection
    session_id: Optional[str] = None
    response_time_ms: Optional[int] = None  # time spent looking at card


class GetRecommendationsRequest(BaseModel):
    """Request a batch of recommended words for the user."""
    user_id: str
    count: int = Field(default=10, ge=1, le=50)
    exclude_ids: list[str] = Field(default_factory=list)  # cards already in current session


class UserLevelRequest(BaseModel):
    """Request to get or recalculate user level."""
    user_id: str
    force_recalculate: bool = False


# ── Response Models ────────────────────────────────────────────

class UserLevelResponse(BaseModel):
    user_id: str
    cefr_level: CEFRLevel
    ielts_band: float
    confidence: float
    breakdown: LevelBreakdown
    total_swipes: int
    assessed_at: datetime


class LevelBreakdown(BaseModel):
    vocabulary_score: float
    grammar_score: float
    idiom_score: float
    collocation_score: float


class RecommendedCard(BaseModel):
    flashcard_id: str
    word: str
    definition: str
    example: str
    difficulty: Difficulty
    category: CardCategory
    band: Optional[int] = None
    recommendation_reason: str
    source: RecommendationSource
    relevance_score: float
    interest_tags: list[str] = Field(default_factory=list)


class RecommendationsResponse(BaseModel):
    user_id: str
    user_level: CEFRLevel
    recommendations: list[RecommendedCard]
    generated_at: datetime


class SwipeEventResponse(BaseModel):
    success: bool
    level_updated: bool
    current_level: Optional[CEFRLevel] = None
    message: str


class TopicInterestResponse(BaseModel):
    user_id: str
    interests: list[TopicScore]


class TopicScore(BaseModel):
    category: CardCategory
    interest_score: float
    total_seen: int
    total_known: int


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str

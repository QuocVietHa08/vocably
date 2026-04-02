"""
FastAPI route definitions for the recommendation service.

FAST PATH (client-facing, <30ms):
- POST /api/swipe              — Fire-and-forget swipe recording
- GET  /api/cards/next/:userId — Instant pre-loaded card queue read

SLOW PATH (background or on-demand):
- POST /api/queue/prefill      — Trigger initial queue fill for a user
- POST /api/recommendations    — On-demand AI recommendations (bypass queue)
- POST /api/level              — Get or recalculate user level
- GET  /api/interests/:userId  — Topic interest profile
- GET  /api/due-cards/:userId  — Spaced repetition due cards
- GET  /health                 — Health check
"""

from __future__ import annotations
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from datetime import datetime, timezone

from app.models.schemas import (
    SwipeEventRequest,
    SwipeEventResponse,
    GetRecommendationsRequest,
    RecommendationsResponse,
    UserLevelRequest,
    UserLevelResponse,
    LevelBreakdown,
    TopicInterestResponse,
    TopicScore,
    HealthResponse,
    CEFRLevel,
)
from app.services.background_worker import BackgroundWorker
from app.services.card_queue import CardQueueService
from app.services.recommendation_engine import RecommendationEngine
from app.services.level_detector import LevelDetector
from app.services.topic_tracker import TopicTracker
from app.services.spaced_repetition import SpacedRepetitionScheduler

router = APIRouter()

# ── Service singletons ────────────────────────────────────────
background_worker = BackgroundWorker()
card_queue = CardQueueService()
recommendation_engine = RecommendationEngine()
level_detector = LevelDetector()
topic_tracker = TopicTracker()
sr_scheduler = SpacedRepetitionScheduler()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  FAST PATH — These endpoints are called on every swipe
#  Target latency: <30ms
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.post("/api/swipe")
async def record_swipe(
    request: SwipeEventRequest,
    bg: BackgroundTasks,
):
    """
    Record a card swipe — returns IMMEDIATELY.

    All heavy processing (level detection, topic tracking, SR updates,
    queue refill) happens in a background task. The client never waits.

    Response: { "ok": true }
    Latency: ~10-20ms (just enqueues the background job)
    """
    # Enqueue all processing to run AFTER we return 200
    bg.add_task(
        background_worker.process_swipe_background,
        user_id=request.user_id,
        flashcard_id=request.flashcard_id,
        direction=request.direction.value,
        session_id=request.session_id,
        response_time_ms=request.response_time_ms,
    )

    # Return instantly
    return {"ok": True}


@router.get("/api/cards/next/{user_id}")
async def get_next_cards(
    user_id: str,
    count: int = Query(default=10, ge=1, le=30),
    bg: BackgroundTasks = None,
):
    """
    Get the next batch of recommended cards — INSTANT.

    Reads from the pre-computed card_queue table.
    No AI calls, no joins — single indexed query.

    Call this when:
    - App opens (load first 10 cards)
    - User is running low on cards (prefetch next batch)

    Response: { cards: [...], remaining: N, queue_healthy: bool }
    Latency: ~15-25ms
    """
    try:
        cards = card_queue.get_next_cards(user_id, count=count)
        remaining = card_queue.get_queue_depth(user_id)

        # If queue is getting low, trigger a background refill
        if remaining < 5 and bg:
            bg.add_task(
                background_worker.prefill_queue_for_user,
                user_id=user_id,
            )

        return {
            "user_id": user_id,
            "cards": cards,
            "count": len(cards),
            "remaining": remaining,
            "queue_healthy": remaining >= 5,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get cards: {str(e)}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  QUEUE MANAGEMENT — Called on app open / session start
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.post("/api/queue/prefill")
async def prefill_queue(
    request: dict,
    bg: BackgroundTasks,
):
    """
    Ensure the user's card queue is filled.

    Call this when the user opens the app. If the queue already has
    enough cards, this returns immediately. Otherwise it triggers
    a background fill and returns what's available now.

    Body: { "user_id": "..." }
    """
    user_id = request.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")

    try:
        depth = card_queue.get_queue_depth(user_id)

        if depth < 5:
            # Queue is low — trigger background fill
            bg.add_task(
                background_worker.prefill_queue_for_user,
                user_id=user_id,
            )

        return {
            "user_id": user_id,
            "current_depth": depth,
            "filling": depth < 5,
            "message": "Queue is being filled" if depth < 5 else "Queue is healthy",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to prefill queue: {str(e)}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  SLOW PATH — On-demand endpoints (not called during swiping)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="ok",
        service="vocally-recommendation",
        version="1.0.0",
    )


@router.post("/api/recommendations", response_model=RecommendationsResponse)
async def get_recommendations(request: GetRecommendationsRequest):
    """
    On-demand AI recommendations (bypasses the queue).

    Use GET /api/cards/next/:userId for the fast pre-loaded path.
    This endpoint is for admin tools or explicit "refresh" requests.
    """
    try:
        result = await recommendation_engine.get_recommendations(
            user_id=request.user_id,
            count=request.count,
            exclude_ids=request.exclude_ids,
        )
        return RecommendationsResponse(
            user_id=result["user_id"],
            user_level=CEFRLevel(result["user_level"]),
            recommendations=result["recommendations"],
            generated_at=datetime.fromisoformat(result["generated_at"]),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get recommendations: {str(e)}")


@router.post("/api/level", response_model=UserLevelResponse)
async def get_user_level(request: UserLevelRequest):
    """Get or recalculate user's CEFR level and IELTS band."""
    try:
        result = await level_detector.detect_level(
            user_id=request.user_id,
            force=request.force_recalculate,
        )
        return UserLevelResponse(
            user_id=result["user_id"],
            cefr_level=CEFRLevel(result["cefr_level"]),
            ielts_band=float(result["ielts_band"]),
            confidence=float(result["confidence"]),
            breakdown=LevelBreakdown(
                vocabulary_score=float(result["vocabulary_score"]),
                grammar_score=float(result["grammar_score"]),
                idiom_score=float(result["idiom_score"]),
                collocation_score=float(result["collocation_score"]),
            ),
            total_swipes=result["total_swipes"],
            assessed_at=datetime.fromisoformat(result["assessed_at"]),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user level: {str(e)}")


@router.get("/api/interests/{user_id}", response_model=TopicInterestResponse)
async def get_topic_interests(user_id: str):
    """Get the user's topic interest profile across all categories."""
    try:
        interests = await topic_tracker.get_user_interests(user_id)
        return TopicInterestResponse(
            user_id=user_id,
            interests=[
                TopicScore(
                    category=i["category"],
                    interest_score=float(i["interest_score"]),
                    total_seen=i["total_seen"],
                    total_known=i["total_known"],
                )
                for i in interests
            ],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get interests: {str(e)}")


@router.get("/api/due-cards/{user_id}")
async def get_due_cards(
    user_id: str,
    limit: int = Query(default=20, ge=1, le=100),
):
    """Get flashcards that are due for spaced repetition review."""
    try:
        due = await sr_scheduler.get_due_cards(user_id, limit=limit)
        struggling = await sr_scheduler.get_struggling_cards(user_id, limit=5)
        return {
            "user_id": user_id,
            "due_cards": due,
            "struggling_cards": struggling,
            "total_due": len(due),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get due cards: {str(e)}")

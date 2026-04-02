"""
Topic Interest Tracker

Monitors which categories and topics the user engages with most,
and adjusts interest scores to bias recommendations toward
content the user finds interesting.

Signals used:
- Swipe direction (right = positive engagement)
- Response time (longer = more engaged/curious)
- Category distribution of known words
- Repeat visits to same category
"""

from __future__ import annotations
import logging
from datetime import datetime, timezone

from app.core.database import get_supabase

logger = logging.getLogger(__name__)

# Categories in the system
ALL_CATEGORIES = ["vocabulary", "grammar", "idiom", "collocation", "phrasal-verb"]

# Response time thresholds (ms) for engagement signals
QUICK_DISMISS_MS = 800     # < 800ms = barely looked at it
ENGAGED_THRESHOLD_MS = 3000  # > 3s = genuinely interested
DEEP_INTEREST_MS = 6000     # > 6s = very curious about this word


class TopicTracker:
    """Tracks and updates user topic interest scores."""

    def __init__(self):
        self.db = get_supabase()

    async def record_engagement(
        self,
        user_id: str,
        category: str,
        direction: str,
        response_time_ms: int | None = None,
    ) -> dict:
        """
        Record a single engagement event and update interest scores.

        Returns the updated interest profile for the category.
        """
        # Fetch or initialize the topic interest record
        existing = self._get_interest(user_id, category)

        if existing:
            # Update existing record
            new_seen = existing["total_seen"] + 1
            new_known = existing["total_known"] + (1 if direction == "right" else 0)
            new_time = existing["total_time_ms"] + (response_time_ms or 0)

            # Calculate new interest score
            interest_score = self._compute_interest_score(
                total_seen=new_seen,
                total_known=new_known,
                total_time_ms=new_time,
                direction=direction,
                response_time_ms=response_time_ms,
                current_score=existing["interest_score"],
            )

            self.db.table("topic_interests").update({
                "total_seen": new_seen,
                "total_known": new_known,
                "total_time_ms": new_time,
                "interest_score": round(interest_score, 3),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", existing["id"]).execute()

            return {
                "category": category,
                "interest_score": round(interest_score, 3),
                "total_seen": new_seen,
                "total_known": new_known,
            }
        else:
            # Create new record
            is_known = 1 if direction == "right" else 0
            interest_score = self._compute_interest_score(
                total_seen=1,
                total_known=is_known,
                total_time_ms=response_time_ms or 0,
                direction=direction,
                response_time_ms=response_time_ms,
                current_score=0.5,  # neutral starting point
            )

            self.db.table("topic_interests").insert({
                "user_id": user_id,
                "category": category,
                "total_seen": 1,
                "total_known": is_known,
                "total_time_ms": response_time_ms or 0,
                "interest_score": round(interest_score, 3),
            }).execute()

            return {
                "category": category,
                "interest_score": round(interest_score, 3),
                "total_seen": 1,
                "total_known": is_known,
            }

    async def get_user_interests(self, user_id: str) -> list[dict]:
        """Get all topic interest scores for a user, sorted by interest."""
        result = (
            self.db.table("topic_interests")
            .select("category, interest_score, total_seen, total_known")
            .eq("user_id", user_id)
            .order("interest_score", desc=True)
            .execute()
        )
        return result.data or []

    async def get_top_categories(self, user_id: str, n: int = 3) -> list[str]:
        """Get the user's top-N most interesting categories."""
        interests = await self.get_user_interests(user_id)
        if not interests:
            # Default ordering for new users
            return ["vocabulary", "idiom", "collocation"]
        return [i["category"] for i in interests[:n]]

    def _compute_interest_score(
        self,
        total_seen: int,
        total_known: int,
        total_time_ms: int,
        direction: str,
        response_time_ms: int | None,
        current_score: float,
    ) -> float:
        """
        Compute an interest score (0.0 - 1.0) for a category.

        Factors:
        1. Engagement rate — how often user swipes right (knows) in this category
        2. Time investment — average response time (longer = more interest)
        3. Momentum — recent interactions weighted more via exponential moving average
        4. Challenge preference — users often find slightly-hard content more interesting
        """
        # Factor 1: Knowledge rate (0-1)
        knowledge_rate = total_known / total_seen if total_seen > 0 else 0.5

        # Users find content most interesting when they know ~60-70% (zone of proximal development)
        # Too easy (>90% known) → boring. Too hard (<30% known) → frustrating.
        zpd_bonus = 1.0 - abs(knowledge_rate - 0.65) * 1.5
        zpd_bonus = max(0.0, min(1.0, zpd_bonus))

        # Factor 2: Time investment (0-1)
        avg_time = total_time_ms / total_seen if total_seen > 0 else 2000
        if avg_time < QUICK_DISMISS_MS:
            time_factor = 0.2  # dismissing quickly = low interest
        elif avg_time < ENGAGED_THRESHOLD_MS:
            time_factor = 0.5  # normal engagement
        elif avg_time < DEEP_INTEREST_MS:
            time_factor = 0.8  # clearly interested
        else:
            time_factor = 1.0  # deeply curious

        # Factor 3: Current response time signal
        response_signal = 0.5
        if response_time_ms is not None:
            if response_time_ms >= DEEP_INTEREST_MS:
                response_signal = 1.0
            elif response_time_ms >= ENGAGED_THRESHOLD_MS:
                response_signal = 0.75
            elif response_time_ms < QUICK_DISMISS_MS:
                response_signal = 0.2

        # Factor 4: Swipe direction signal
        direction_signal = 0.7 if direction == "right" else 0.4
        # Swiping left isn't necessarily "uninteresting" — user might want to learn it
        # But swiping right consistently suggests comfort/engagement

        # Combine factors with weights
        raw_score = (
            zpd_bonus * 0.30 +
            time_factor * 0.20 +
            response_signal * 0.20 +
            direction_signal * 0.15 +
            knowledge_rate * 0.15
        )

        # Exponential moving average with current score (momentum)
        # Alpha controls how quickly the score responds to new data
        alpha = 0.3 if total_seen > 10 else 0.5  # more reactive with less data
        smoothed = alpha * raw_score + (1 - alpha) * current_score

        return max(0.01, min(0.99, smoothed))

    def _get_interest(self, user_id: str, category: str) -> dict | None:
        """Get the current interest record for a user+category."""
        result = (
            self.db.table("topic_interests")
            .select("*")
            .eq("user_id", user_id)
            .eq("category", category)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None

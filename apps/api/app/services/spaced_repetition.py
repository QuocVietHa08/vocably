"""
Spaced Repetition Scheduler (SM-2 Algorithm)

Implements the SuperMemo SM-2 algorithm to schedule optimal review
times for words the user is learning. Words swiped left (don't know)
get scheduled for near-term review; words swiped right get pushed
further into the future.

SM-2 Parameters:
- quality (0-5): how well the user recalled the word
  - 0-2: "blackout" / wrong / swiped left
  - 3: correct with serious difficulty
  - 4: correct with some hesitation
  - 5: perfect recall / instant swipe right
- easiness_factor (EF): starts at 2.5, adjusted per review
- interval: days until next review
- repetition: count of consecutive correct recalls
"""

from __future__ import annotations
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.core.database import get_supabase

logger = logging.getLogger(__name__)

# Response time thresholds for mapping to SM-2 quality scores
INSTANT_RECALL_MS = 1500      # < 1.5s = quality 5 (perfect)
GOOD_RECALL_MS = 3000         # < 3s = quality 4
HESITANT_RECALL_MS = 5000     # < 5s = quality 3


class SpacedRepetitionScheduler:
    """SM-2 based spaced repetition for flashcard reviews."""

    def __init__(self):
        self.db = get_supabase()

    async def process_review(
        self,
        user_id: str,
        flashcard_id: str,
        direction: str,
        response_time_ms: Optional[int] = None,
    ) -> dict:
        """
        Process a card review (swipe) and update the scheduling.

        Returns the updated scheduling info.
        """
        # Map swipe to SM-2 quality score
        quality = self._swipe_to_quality(direction, response_time_ms)

        # Get or create the SR record
        record = self._get_or_create_record(user_id, flashcard_id)

        # Apply SM-2 algorithm
        new_ef, new_interval, new_rep, new_streak = self._sm2_update(
            easiness_factor=float(record["easiness_factor"]),
            interval_days=record["interval_days"],
            repetition=record["repetition"],
            streak=record["streak"],
            quality=quality,
        )

        # Calculate next review date
        next_review = datetime.now(timezone.utc) + timedelta(days=new_interval)

        # Update the record
        update_data = {
            "easiness_factor": round(new_ef, 2),
            "interval_days": new_interval,
            "repetition": new_rep,
            "quality": quality,
            "streak": new_streak,
            "next_review_at": next_review.isoformat(),
            "last_reviewed_at": datetime.now(timezone.utc).isoformat(),
            "total_reviews": record["total_reviews"] + 1,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        self.db.table("spaced_repetition").update(update_data).eq(
            "id", record["id"]
        ).execute()

        return {
            "flashcard_id": flashcard_id,
            "quality": quality,
            "easiness_factor": round(new_ef, 2),
            "interval_days": new_interval,
            "next_review_at": next_review.isoformat(),
            "streak": new_streak,
            "total_reviews": record["total_reviews"] + 1,
        }

    async def get_due_cards(
        self, user_id: str, limit: int = 20
    ) -> list[dict]:
        """
        Get cards that are due for review (next_review_at <= now).

        Returns flashcard IDs sorted by urgency (most overdue first).
        """
        now = datetime.now(timezone.utc).isoformat()

        result = (
            self.db.table("spaced_repetition")
            .select("flashcard_id, next_review_at, easiness_factor, interval_days, streak, repetition")
            .eq("user_id", user_id)
            .lte("next_review_at", now)
            .order("next_review_at", desc=False)  # most overdue first
            .limit(limit)
            .execute()
        )

        return result.data or []

    async def get_struggling_cards(
        self, user_id: str, limit: int = 10
    ) -> list[dict]:
        """
        Get cards the user is struggling with most.
        (Low easiness factor, low streak, many reviews)
        """
        result = (
            self.db.table("spaced_repetition")
            .select("flashcard_id, easiness_factor, streak, total_reviews, interval_days")
            .eq("user_id", user_id)
            .lt("easiness_factor", 2.0)  # struggling threshold
            .order("easiness_factor", desc=False)
            .limit(limit)
            .execute()
        )

        return result.data or []

    def _sm2_update(
        self,
        easiness_factor: float,
        interval_days: int,
        repetition: int,
        streak: int,
        quality: int,
    ) -> tuple[float, int, int, int]:
        """
        Core SM-2 algorithm update.

        Returns: (new_ef, new_interval, new_repetition, new_streak)
        """
        # Update easiness factor
        # EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
        new_ef = easiness_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        new_ef = max(1.3, new_ef)  # minimum EF is 1.3

        if quality < 3:
            # Failed recall — reset repetition count, short interval
            new_interval = 1  # review tomorrow
            new_rep = 0
            new_streak = 0
        else:
            # Successful recall
            new_rep = repetition + 1
            new_streak = streak + 1

            if new_rep == 1:
                new_interval = 1
            elif new_rep == 2:
                new_interval = 3
            else:
                new_interval = round(interval_days * new_ef)

            # Cap interval at 180 days
            new_interval = min(180, new_interval)

        return new_ef, new_interval, new_rep, new_streak

    def _swipe_to_quality(self, direction: str, response_time_ms: Optional[int]) -> int:
        """
        Map a swipe direction + response time to SM-2 quality (0-5).

        Right swipe = knew the word (quality 3-5 depending on speed)
        Left swipe  = didn't know (quality 0-2 depending on engagement)
        """
        if direction == "right":
            # User knew the word
            if response_time_ms is None:
                return 4  # default: good recall

            if response_time_ms < INSTANT_RECALL_MS:
                return 5  # instant recall — perfect
            elif response_time_ms < GOOD_RECALL_MS:
                return 4  # good recall
            else:
                return 3  # knew it but had to think
        else:
            # User didn't know the word
            if response_time_ms is None:
                return 1  # default: didn't know

            if response_time_ms < INSTANT_RECALL_MS:
                return 0  # instant dismiss — complete blackout
            elif response_time_ms < HESITANT_RECALL_MS:
                return 1  # spent some time but still wrong
            else:
                return 2  # spent significant time, almost knew it

    def _get_or_create_record(self, user_id: str, flashcard_id: str) -> dict:
        """Get existing SR record or create a new one."""
        result = (
            self.db.table("spaced_repetition")
            .select("*")
            .eq("user_id", user_id)
            .eq("flashcard_id", flashcard_id)
            .limit(1)
            .execute()
        )

        if result.data:
            return result.data[0]

        # Create new record with defaults
        new_record = {
            "user_id": user_id,
            "flashcard_id": flashcard_id,
            "easiness_factor": 2.50,
            "interval_days": 0,
            "repetition": 0,
            "quality": 0,
            "streak": 0,
            "next_review_at": datetime.now(timezone.utc).isoformat(),
            "total_reviews": 0,
        }

        insert_result = self.db.table("spaced_repetition").insert(new_record).execute()
        return insert_result.data[0] if insert_result.data else new_record

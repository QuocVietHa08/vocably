"""
Swipe Event Processor

Central coordinator that handles incoming swipe events and
triggers all downstream services:
1. Records the raw swipe event
2. Updates topic interest scores
3. Processes spaced repetition scheduling
4. Triggers level re-assessment when needed
"""

from __future__ import annotations
import logging
from datetime import datetime, timezone

from app.core.database import get_supabase
from app.core.config import get_settings
from app.services.level_detector import LevelDetector
from app.services.topic_tracker import TopicTracker
from app.services.spaced_repetition import SpacedRepetitionScheduler

logger = logging.getLogger(__name__)


class SwipeProcessor:
    """Processes swipe events and coordinates all downstream updates."""

    def __init__(self):
        self.db = get_supabase()
        self.settings = get_settings()
        self.level_detector = LevelDetector()
        self.topic_tracker = TopicTracker()
        self.sr_scheduler = SpacedRepetitionScheduler()

    async def process_swipe(
        self,
        user_id: str,
        flashcard_id: str,
        direction: str,
        session_id: str | None = None,
        response_time_ms: int | None = None,
    ) -> dict:
        """
        Process a single swipe event end-to-end.

        Returns a summary of what was updated.
        """
        # 1. Record the raw swipe event
        self._record_swipe(user_id, flashcard_id, direction, session_id, response_time_ms)

        # 2. Get flashcard category for topic tracking
        card_category = self._get_card_category(flashcard_id)

        # 3. Update topic interest scores
        if card_category:
            await self.topic_tracker.record_engagement(
                user_id=user_id,
                category=card_category,
                direction=direction,
                response_time_ms=response_time_ms,
            )

        # 4. Update spaced repetition schedule
        sr_result = await self.sr_scheduler.process_review(
            user_id=user_id,
            flashcard_id=flashcard_id,
            direction=direction,
            response_time_ms=response_time_ms,
        )

        # 5. Check if level should be re-assessed
        level_updated = False
        current_level = None
        swipe_count = self._get_total_swipe_count(user_id)

        should_reassess = (
            swipe_count % self.settings.level_reassessment_interval == 0
            and swipe_count >= self.settings.min_swipes_for_detection
        )

        if should_reassess:
            level_data = await self.level_detector.detect_level(user_id, force=True)
            level_updated = True
            current_level = level_data["cefr_level"]
            logger.info(
                f"User {user_id} level reassessed after {swipe_count} swipes: {current_level}"
            )
        else:
            # Get current level without recalculating
            existing = self.level_detector._get_latest_level(user_id)
            if existing:
                current_level = existing["cefr_level"]

        return {
            "success": True,
            "level_updated": level_updated,
            "current_level": current_level,
            "spaced_repetition": {
                "next_review_at": sr_result["next_review_at"],
                "interval_days": sr_result["interval_days"],
                "streak": sr_result["streak"],
            },
            "message": (
                f"Level updated to {current_level}!"
                if level_updated
                else f"Swipe recorded. Next level check in {self.settings.level_reassessment_interval - (swipe_count % self.settings.level_reassessment_interval)} swipes."
            ),
        }

    def _record_swipe(
        self,
        user_id: str,
        flashcard_id: str,
        direction: str,
        session_id: str | None,
        response_time_ms: int | None,
    ) -> None:
        """Insert a raw swipe event into the database."""
        try:
            record = {
                "user_id": user_id,
                "flashcard_id": flashcard_id,
                "direction": direction,
                "response_time_ms": response_time_ms,
            }
            if session_id:
                record["session_id"] = session_id

            self.db.table("swipe_events").insert(record).execute()
        except Exception as e:
            logger.error(f"Failed to record swipe event: {e}")

    def _get_card_category(self, flashcard_id: str) -> str | None:
        """Look up the category of a flashcard."""
        try:
            result = (
                self.db.table("flashcards")
                .select("category")
                .eq("id", flashcard_id)
                .limit(1)
                .execute()
            )
            if result.data:
                return result.data[0]["category"]
        except Exception as e:
            logger.error(f"Failed to get card category: {e}")
        return None

    def _get_total_swipe_count(self, user_id: str) -> int:
        """Get the total number of swipes for a user."""
        try:
            result = (
                self.db.table("swipe_events")
                .select("id", count="exact")
                .eq("user_id", user_id)
                .execute()
            )
            return result.count or 0
        except Exception as e:
            logger.error(f"Failed to count swipes: {e}")
            return 0

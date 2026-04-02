"""
Background Worker — Async processing triggered after swipe events.

Runs in FastAPI's BackgroundTasks so the swipe endpoint returns
instantly (~20ms) while all the heavy processing happens behind
the scenes:

1. Record the swipe event
2. Update topic interest scores
3. Update spaced repetition schedule
4. Check if level needs re-assessment
5. If queue is running low → trigger AI to generate more cards

The client never waits for any of this.
"""

from __future__ import annotations
import logging
from datetime import datetime, timezone

from app.core.database import get_supabase
from app.core.config import get_settings
from app.services.level_detector import LevelDetector
from app.services.topic_tracker import TopicTracker
from app.services.spaced_repetition import SpacedRepetitionScheduler
from app.services.recommendation_engine import RecommendationEngine
from app.services.card_queue import CardQueueService, QUEUE_LOW_WATERMARK, QUEUE_TARGET_SIZE

logger = logging.getLogger(__name__)


class BackgroundWorker:
    """Handles all async processing after a swipe event."""

    def __init__(self):
        self.db = get_supabase()
        self.settings = get_settings()
        self.level_detector = LevelDetector()
        self.topic_tracker = TopicTracker()
        self.sr_scheduler = SpacedRepetitionScheduler()
        self.recommendation_engine = RecommendationEngine()
        self.card_queue = CardQueueService()

    async def process_swipe_background(
        self,
        user_id: str,
        flashcard_id: str,
        direction: str,
        session_id: str | None = None,
        response_time_ms: int | None = None,
    ) -> None:
        """
        Full background processing pipeline for a swipe event.

        This runs asynchronously — the API has already returned 200 to the client.
        """
        try:
            # 1. Record the raw swipe event
            self._record_swipe(user_id, flashcard_id, direction, session_id, response_time_ms)

            # 2. Mark this card as swiped in the queue
            self.card_queue.mark_swiped(user_id, flashcard_id)

            # 3. Get flashcard category for topic tracking
            card_category = self._get_card_category(flashcard_id)

            # 4. Update topic interest scores
            if card_category:
                await self.topic_tracker.record_engagement(
                    user_id=user_id,
                    category=card_category,
                    direction=direction,
                    response_time_ms=response_time_ms,
                )

            # 5. Update spaced repetition schedule
            await self.sr_scheduler.process_review(
                user_id=user_id,
                flashcard_id=flashcard_id,
                direction=direction,
                response_time_ms=response_time_ms,
            )

            # 6. Check if level should be re-assessed
            swipe_count = self._get_total_swipe_count(user_id)
            should_reassess = (
                swipe_count >= self.settings.min_swipes_for_detection
                and swipe_count % self.settings.level_reassessment_interval == 0
            )
            if should_reassess:
                level_data = await self.level_detector.detect_level(user_id, force=True)
                logger.info(
                    f"User {user_id} level reassessed: {level_data['cefr_level']} "
                    f"(confidence: {level_data['confidence']})"
                )

            # 7. Refill the card queue if it's running low
            await self._maybe_refill_queue(user_id)

        except Exception as e:
            logger.error(f"Background processing failed for user {user_id}: {e}", exc_info=True)

    async def prefill_queue_for_user(self, user_id: str) -> int:
        """
        Called when a user first opens the app or has an empty queue.
        Generates a full batch of recommendations and loads the queue.
        """
        try:
            # Expire stale cards first
            self.card_queue.expire_old_cards(user_id)

            # Check current depth
            depth = self.card_queue.get_queue_depth(user_id)
            if depth >= QUEUE_LOW_WATERMARK:
                return depth  # queue is fine

            # Get IDs already in queue to avoid duplicates
            exclude_ids = list(self.card_queue.get_already_queued_ids(user_id))

            # Generate recommendations
            needed = QUEUE_TARGET_SIZE - depth
            result = await self.recommendation_engine.get_recommendations(
                user_id=user_id,
                count=needed,
                exclude_ids=exclude_ids,
            )

            recommendations = result.get("recommendations", [])

            # Fill the queue
            inserted = self.card_queue.fill_queue(user_id, recommendations)
            logger.info(f"Pre-filled queue with {inserted} cards for user {user_id}")

            return depth + inserted

        except Exception as e:
            logger.error(f"Failed to prefill queue for user {user_id}: {e}", exc_info=True)
            return 0

    async def _maybe_refill_queue(self, user_id: str) -> None:
        """Check queue depth and refill if running low."""
        if not self.card_queue.needs_refill(user_id):
            return

        logger.info(f"Queue low for user {user_id}, triggering refill...")

        # Expire stale entries first
        self.card_queue.expire_old_cards(user_id)

        # Get IDs to exclude (already in queue + recently swiped)
        exclude_ids = list(self.card_queue.get_already_queued_ids(user_id))

        # Generate new recommendations
        depth = self.card_queue.get_queue_depth(user_id)
        needed = QUEUE_TARGET_SIZE - depth

        try:
            result = await self.recommendation_engine.get_recommendations(
                user_id=user_id,
                count=needed,
                exclude_ids=exclude_ids,
            )

            recommendations = result.get("recommendations", [])
            inserted = self.card_queue.fill_queue(user_id, recommendations)
            logger.info(f"Refilled queue with {inserted} cards for user {user_id}")

        except Exception as e:
            logger.error(f"Queue refill failed for user {user_id}: {e}")

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
            return result.data[0]["category"] if result.data else None
        except Exception as e:
            logger.error(f"Failed to get card category: {e}")
            return None

    def _get_total_swipe_count(self, user_id: str) -> int:
        """Get total swipe count for a user."""
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

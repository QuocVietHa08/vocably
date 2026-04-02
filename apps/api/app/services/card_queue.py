"""
Card Queue Service — Pre-computed recommendation queue for instant reads.

Architecture:
┌──────────┐     fire & forget      ┌──────────────┐
│  Client   │ ──── POST /swipe ───► │ Background   │
│  (mobile) │                       │ Worker       │
│           │ ◄── GET /cards/next   │ (fills queue)│
│           │     (instant, ~20ms)  │              │
└──────────┘                       └──────┬───────┘
                                          │ async
                                          ▼
                                   ┌──────────────┐
                                   │  card_queue   │
                                   │  (Supabase)   │
                                   │  ready cards  │
                                   └──────────────┘

The queue always keeps 10-20 cards pre-loaded per user.
When the client fetches cards, they're already there — no AI wait.
The background worker refills the queue after each swipe batch.
"""

from __future__ import annotations
import logging
from datetime import datetime, timezone

from app.core.database import get_supabase
from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Minimum cards to keep in the ready queue before triggering a refill
QUEUE_LOW_WATERMARK = 5
# Target number of cards to have ready
QUEUE_TARGET_SIZE = 15


class CardQueueService:
    """Manages the pre-computed card queue for instant reads."""

    def __init__(self):
        self.db = get_supabase()
        self.settings = get_settings()

    def get_next_cards(self, user_id: str, count: int = 10) -> list[dict]:
        """
        Get the next batch of cards from the pre-loaded queue.

        This is the FAST path — single indexed query, no joins, no AI.
        Target latency: <30ms.
        """
        result = (
            self.db.table("card_queue")
            .select(
                "id, flashcard_id, word, phonetic, part_of_speech, "
                "definition, example, examples, difficulty, category, "
                "band, synonyms, tip, reason, source, relevance_score, position"
            )
            .eq("user_id", user_id)
            .eq("status", "ready")
            .order("position", desc=False)
            .limit(count)
            .execute()
        )

        cards = result.data or []

        # Mark these cards as "served" so they won't be returned again
        if cards:
            served_ids = [c["id"] for c in cards]
            now = datetime.now(timezone.utc).isoformat()
            self.db.table("card_queue").update({
                "status": "served",
                "served_at": now,
            }).in_("id", served_ids).execute()

        return cards

    def get_queue_depth(self, user_id: str) -> int:
        """Count how many 'ready' cards are in the queue."""
        result = (
            self.db.table("card_queue")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .eq("status", "ready")
            .execute()
        )
        return result.count or 0

    def needs_refill(self, user_id: str) -> bool:
        """Check if the queue is running low and needs a background refill."""
        depth = self.get_queue_depth(user_id)
        return depth < QUEUE_LOW_WATERMARK

    def fill_queue(
        self,
        user_id: str,
        recommendations: list[dict],
    ) -> int:
        """
        Insert pre-computed recommendations into the queue.

        Called by the background worker after the AI engine produces results.
        Returns the number of cards inserted.
        """
        if not recommendations:
            return 0

        # Get the current max position to append after it
        max_pos_result = (
            self.db.table("card_queue")
            .select("position")
            .eq("user_id", user_id)
            .eq("status", "ready")
            .order("position", desc=True)
            .limit(1)
            .execute()
        )
        start_pos = (max_pos_result.data[0]["position"] + 1) if max_pos_result.data else 0

        # Build queue entries with denormalized card data
        entries = []
        for i, rec in enumerate(recommendations):
            entries.append({
                "user_id": user_id,
                "flashcard_id": rec["flashcard_id"],
                "word": rec.get("word", ""),
                "phonetic": rec.get("phonetic"),
                "part_of_speech": rec.get("part_of_speech"),
                "definition": rec.get("definition", ""),
                "example": rec.get("example", ""),
                "examples": rec.get("examples"),
                "difficulty": rec.get("difficulty", "medium"),
                "category": rec.get("category", "vocabulary"),
                "band": rec.get("band"),
                "synonyms": rec.get("synonyms"),
                "tip": rec.get("tip"),
                "reason": rec.get("recommendation_reason", "Recommended for you"),
                "source": rec.get("source", "level_match"),
                "relevance_score": rec.get("relevance_score", 0.5),
                "position": start_pos + i,
                "status": "ready",
            })

        if entries:
            try:
                self.db.table("card_queue").insert(entries).execute()
                logger.info(f"Filled queue with {len(entries)} cards for user {user_id}")
            except Exception as e:
                logger.error(f"Failed to fill card queue: {e}")
                return 0

        return len(entries)

    def mark_swiped(self, user_id: str, flashcard_id: str) -> None:
        """Mark a queued card as swiped (for analytics)."""
        try:
            self.db.table("card_queue").update({
                "status": "swiped",
            }).eq("user_id", user_id).eq(
                "flashcard_id", flashcard_id
            ).in_("status", ["ready", "served"]).execute()
        except Exception as e:
            logger.error(f"Failed to mark card as swiped: {e}")

    def expire_old_cards(self, user_id: str, max_age_hours: int = 24) -> int:
        """
        Expire cards that have been in the queue too long.
        Keeps the queue fresh with up-to-date recommendations.
        """
        from datetime import timedelta
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=max_age_hours)).isoformat()

        try:
            result = (
                self.db.table("card_queue")
                .update({"status": "expired"})
                .eq("user_id", user_id)
                .eq("status", "ready")
                .lt("created_at", cutoff)
                .execute()
            )
            expired = len(result.data) if result.data else 0
            if expired > 0:
                logger.info(f"Expired {expired} stale cards for user {user_id}")
            return expired
        except Exception as e:
            logger.error(f"Failed to expire old cards: {e}")
            return 0

    def get_already_queued_ids(self, user_id: str) -> set[str]:
        """Get flashcard IDs already in the queue (ready or served) to avoid duplicates."""
        result = (
            self.db.table("card_queue")
            .select("flashcard_id")
            .eq("user_id", user_id)
            .in_("status", ["ready", "served"])
            .execute()
        )
        return {r["flashcard_id"] for r in (result.data or [])}

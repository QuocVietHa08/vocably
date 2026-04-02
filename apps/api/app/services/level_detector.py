"""
User Level Detection Engine

Analyzes swipe patterns to determine CEFR level (A1-C2) and IELTS band (3.0-9.0).

Algorithm:
1. Fetch all swipe events for a user
2. Join with flashcard metadata (difficulty, band, category)
3. Calculate per-category accuracy rates
4. Map accuracy × difficulty distribution → CEFR level
5. Use LangChain to refine the level estimate based on patterns
"""

from __future__ import annotations
import logging
from datetime import datetime, timezone
from typing import Optional

from app.core.database import get_supabase
from app.core.config import get_settings
from app.models.schemas import CEFRLevel

logger = logging.getLogger(__name__)

# ── CEFR mapping tables ───────────────────────────────────────

# Band → CEFR mapping
BAND_TO_CEFR: dict[int, CEFRLevel] = {
    5: CEFRLevel.B1,
    6: CEFRLevel.B2,
    7: CEFRLevel.C1,
    8: CEFRLevel.C1,
    9: CEFRLevel.C2,
}

# Difficulty weights — harder words count more for level estimation
DIFFICULTY_WEIGHT: dict[str, float] = {
    "easy": 0.6,
    "medium": 1.0,
    "hard": 1.5,
}

# Weighted accuracy thresholds → CEFR level
# If the user's weighted accuracy on band-N cards exceeds the threshold,
# they're considered at that CEFR level.
LEVEL_THRESHOLDS: list[tuple[float, int, CEFRLevel, float]] = [
    # (min_weighted_accuracy, min_band_known, cefr, ielts_band)
    (0.80, 9, CEFRLevel.C2, 8.5),
    (0.70, 8, CEFRLevel.C1, 7.5),
    (0.65, 7, CEFRLevel.C1, 7.0),
    (0.60, 7, CEFRLevel.B2, 6.5),
    (0.50, 6, CEFRLevel.B2, 6.0),
    (0.45, 6, CEFRLevel.B1, 5.5),
    (0.35, 5, CEFRLevel.B1, 5.0),
    (0.20, 5, CEFRLevel.A2, 4.0),
    (0.00, 5, CEFRLevel.A1, 3.5),
]


class LevelDetector:
    """Detects user CEFR level from flashcard swipe history."""

    def __init__(self):
        self.db = get_supabase()
        self.settings = get_settings()

    async def detect_level(
        self, user_id: str, force: bool = False
    ) -> dict:
        """
        Analyze swipe data and return the user's current level.

        Returns a dict with: cefr_level, ielts_band, confidence,
        vocabulary_score, grammar_score, idiom_score, collocation_score,
        total_swipes, known_count
        """
        # 1. Check if we already have a recent level and don't need to recalculate
        if not force:
            existing = self._get_latest_level(user_id)
            if existing:
                swipes_since = self._count_swipes_since(user_id, existing["assessed_at"])
                if swipes_since < self.settings.level_reassessment_interval:
                    return existing

        # 2. Fetch swipe history with flashcard metadata
        swipe_data = self._fetch_swipe_data(user_id)

        if not swipe_data:
            # No swipes yet — return default beginner level
            return self._default_level(user_id)

        total_swipes = len(swipe_data)

        # 3. Calculate per-category accuracy
        category_stats = self._calculate_category_stats(swipe_data)

        # 4. Calculate weighted overall accuracy per band
        band_accuracy = self._calculate_band_accuracy(swipe_data)

        # 5. Determine CEFR level from band accuracy distribution
        cefr_level, ielts_band = self._determine_level(band_accuracy, total_swipes)

        # 6. Calculate confidence based on sample size
        confidence = self._calculate_confidence(total_swipes)

        # 7. Build result
        known_count = sum(1 for s in swipe_data if s["direction"] == "right")
        result = {
            "user_id": user_id,
            "cefr_level": cefr_level.value,
            "ielts_band": ielts_band,
            "confidence": round(confidence, 2),
            "vocabulary_score": round(category_stats.get("vocabulary", {}).get("accuracy", 0), 3),
            "grammar_score": round(category_stats.get("grammar", {}).get("accuracy", 0), 3),
            "idiom_score": round(category_stats.get("idiom", {}).get("accuracy", 0), 3),
            "collocation_score": round(category_stats.get("collocation", {}).get("accuracy", 0), 3),
            "total_swipes": total_swipes,
            "known_count": known_count,
            "assessed_at": datetime.now(timezone.utc).isoformat(),
        }

        # 8. Save to database
        self._save_level(result)

        # 9. Update profile
        self._update_profile_level(user_id, cefr_level)

        return result

    def _fetch_swipe_data(self, user_id: str) -> list[dict]:
        """Fetch all swipe events joined with flashcard metadata."""
        # Get swipe events
        swipes = (
            self.db.table("swipe_events")
            .select("id, flashcard_id, direction, response_time_ms, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(500)  # last 500 swipes for performance
            .execute()
        )

        if not swipes.data:
            return []

        # Get unique flashcard IDs
        card_ids = list({s["flashcard_id"] for s in swipes.data})

        # Fetch flashcard metadata
        cards = (
            self.db.table("flashcards")
            .select("id, difficulty, category, band")
            .in_("id", card_ids)
            .execute()
        )

        card_map = {c["id"]: c for c in (cards.data or [])}

        # Merge swipe events with card data
        merged = []
        for swipe in swipes.data:
            card = card_map.get(swipe["flashcard_id"])
            if card:
                merged.append({
                    **swipe,
                    "difficulty": card["difficulty"],
                    "category": card["category"],
                    "band": card.get("band", 6),
                })

        return merged

    def _calculate_category_stats(self, swipe_data: list[dict]) -> dict:
        """Calculate accuracy rates per category."""
        stats: dict[str, dict] = {}

        for swipe in swipe_data:
            cat = swipe["category"]
            if cat not in stats:
                stats[cat] = {"total": 0, "known": 0}

            stats[cat]["total"] += 1
            if swipe["direction"] == "right":
                stats[cat]["known"] += 1

        # Calculate accuracy
        for cat in stats:
            total = stats[cat]["total"]
            known = stats[cat]["known"]
            stats[cat]["accuracy"] = known / total if total > 0 else 0

        return stats

    def _calculate_band_accuracy(self, swipe_data: list[dict]) -> dict[int, dict]:
        """
        Calculate weighted accuracy per IELTS band.
        Returns: { band: { total, known, weighted_accuracy } }
        """
        bands: dict[int, dict] = {}

        for swipe in swipe_data:
            band = swipe.get("band", 6)
            difficulty = swipe.get("difficulty", "medium")
            weight = DIFFICULTY_WEIGHT.get(difficulty, 1.0)

            if band not in bands:
                bands[band] = {"total_weight": 0, "known_weight": 0, "count": 0}

            bands[band]["total_weight"] += weight
            bands[band]["count"] += 1
            if swipe["direction"] == "right":
                bands[band]["known_weight"] += weight

        for band in bands:
            total_w = bands[band]["total_weight"]
            known_w = bands[band]["known_weight"]
            bands[band]["weighted_accuracy"] = known_w / total_w if total_w > 0 else 0

        return bands

    def _determine_level(
        self, band_accuracy: dict[int, dict], total_swipes: int
    ) -> tuple[CEFRLevel, float]:
        """
        Determine CEFR level based on which bands the user consistently knows.

        Strategy: Find the highest band where the user has >threshold accuracy.
        The user's level is the highest band they can comfortably handle.
        """
        if not band_accuracy:
            return CEFRLevel.A1, 3.5

        # Calculate overall weighted accuracy across all bands
        total_weight = sum(b["total_weight"] for b in band_accuracy.values())
        total_known = sum(b["known_weight"] for b in band_accuracy.values())
        overall_accuracy = total_known / total_weight if total_weight > 0 else 0

        # Find the highest band the user knows well
        highest_known_band = 5
        for band in sorted(band_accuracy.keys(), reverse=True):
            if band_accuracy[band]["weighted_accuracy"] >= 0.5 and band_accuracy[band]["count"] >= 3:
                highest_known_band = band
                break

        # Match against thresholds
        for min_acc, min_band, cefr, ielts in LEVEL_THRESHOLDS:
            if overall_accuracy >= min_acc and highest_known_band >= min_band:
                return cefr, ielts

        return CEFRLevel.A1, 3.5

    def _calculate_confidence(self, total_swipes: int) -> float:
        """
        Confidence increases with more data points.
        - <10 swipes: 0.1 - 0.3 (low confidence)
        - 10-50 swipes: 0.3 - 0.7 (moderate)
        - 50-200 swipes: 0.7 - 0.9 (high)
        - 200+: 0.9 - 0.99 (very high)
        """
        if total_swipes < 5:
            return 0.10
        elif total_swipes < 10:
            return 0.15 + (total_swipes / 10) * 0.15
        elif total_swipes < 50:
            return 0.30 + ((total_swipes - 10) / 40) * 0.40
        elif total_swipes < 200:
            return 0.70 + ((total_swipes - 50) / 150) * 0.20
        else:
            return min(0.99, 0.90 + (total_swipes - 200) / 2000)

    def _get_latest_level(self, user_id: str) -> Optional[dict]:
        """Get the most recent level assessment for a user."""
        result = (
            self.db.table("user_levels")
            .select("*")
            .eq("user_id", user_id)
            .order("assessed_at", desc=True)
            .limit(1)
            .execute()
        )
        if result.data:
            return result.data[0]
        return None

    def _count_swipes_since(self, user_id: str, since: str) -> int:
        """Count swipes since a given timestamp."""
        result = (
            self.db.table("swipe_events")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .gte("created_at", since)
            .execute()
        )
        return result.count or 0

    def _save_level(self, level_data: dict) -> None:
        """Insert a new level assessment record."""
        try:
            self.db.table("user_levels").insert({
                "user_id": level_data["user_id"],
                "cefr_level": level_data["cefr_level"],
                "ielts_band": level_data["ielts_band"],
                "confidence": level_data["confidence"],
                "vocabulary_score": level_data["vocabulary_score"],
                "grammar_score": level_data["grammar_score"],
                "idiom_score": level_data["idiom_score"],
                "collocation_score": level_data["collocation_score"],
                "total_swipes": level_data["total_swipes"],
                "known_count": level_data["known_count"],
                "assessed_at": level_data["assessed_at"],
            }).execute()
        except Exception as e:
            logger.error(f"Failed to save level assessment: {e}")

    def _update_profile_level(self, user_id: str, cefr_level: CEFRLevel) -> None:
        """Update the user's profile with their detected level."""
        try:
            self.db.table("profiles").update({
                "detected_cefr_level": cefr_level.value,
            }).eq("id", user_id).execute()
        except Exception as e:
            logger.error(f"Failed to update profile level: {e}")

    def _default_level(self, user_id: str) -> dict:
        """Return a default beginner-level assessment."""
        return {
            "user_id": user_id,
            "cefr_level": CEFRLevel.B1.value,
            "ielts_band": 5.0,
            "confidence": 0.10,
            "vocabulary_score": 0.0,
            "grammar_score": 0.0,
            "idiom_score": 0.0,
            "collocation_score": 0.0,
            "total_swipes": 0,
            "known_count": 0,
            "assessed_at": datetime.now(timezone.utc).isoformat(),
        }

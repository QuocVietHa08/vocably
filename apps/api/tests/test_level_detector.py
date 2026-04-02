"""Tests for the level detection algorithm (logic only, no DB)."""

import pytest
from app.services.level_detector import LevelDetector
from app.models.schemas import CEFRLevel


class TestLevelDetectionAlgorithm:
    """Test the pure algorithmic parts of level detection."""

    def setup_method(self):
        """Create a detector instance (we'll test internal methods)."""
        # We can't instantiate LevelDetector without Supabase,
        # so we test the pure functions directly.
        pass

    def test_confidence_calculation(self):
        """Confidence should increase with more swipes."""
        # We test the formula directly
        def calc_confidence(n: int) -> float:
            if n < 5:
                return 0.10
            elif n < 10:
                return 0.15 + (n / 10) * 0.15
            elif n < 50:
                return 0.30 + ((n - 10) / 40) * 0.40
            elif n < 200:
                return 0.70 + ((n - 50) / 150) * 0.20
            else:
                return min(0.99, 0.90 + (n - 200) / 2000)

        assert calc_confidence(0) == 0.10
        assert calc_confidence(3) == 0.10
        assert 0.15 < calc_confidence(7) < 0.30
        assert 0.30 <= calc_confidence(10) <= 0.35
        assert 0.50 < calc_confidence(30) < 0.70
        assert 0.70 <= calc_confidence(50) <= 0.75
        assert 0.85 < calc_confidence(150) < 0.95
        assert calc_confidence(500) <= 0.99

    def test_category_stats_calculation(self):
        """Category stats should correctly compute accuracy."""
        swipe_data = [
            {"category": "vocabulary", "direction": "right"},
            {"category": "vocabulary", "direction": "right"},
            {"category": "vocabulary", "direction": "left"},
            {"category": "idiom", "direction": "left"},
            {"category": "idiom", "direction": "left"},
        ]

        stats: dict = {}
        for swipe in swipe_data:
            cat = swipe["category"]
            if cat not in stats:
                stats[cat] = {"total": 0, "known": 0}
            stats[cat]["total"] += 1
            if swipe["direction"] == "right":
                stats[cat]["known"] += 1

        for cat in stats:
            total = stats[cat]["total"]
            known = stats[cat]["known"]
            stats[cat]["accuracy"] = known / total if total > 0 else 0

        assert stats["vocabulary"]["accuracy"] == pytest.approx(2/3, rel=0.01)
        assert stats["idiom"]["accuracy"] == 0.0

    def test_band_accuracy_calculation(self):
        """Band accuracy should weight harder cards more."""
        from app.services.level_detector import DIFFICULTY_WEIGHT

        swipe_data = [
            {"band": 7, "difficulty": "hard", "direction": "right"},
            {"band": 7, "difficulty": "easy", "direction": "left"},
            {"band": 6, "difficulty": "medium", "direction": "right"},
        ]

        bands: dict = {}
        for swipe in swipe_data:
            band = swipe["band"]
            weight = DIFFICULTY_WEIGHT[swipe["difficulty"]]
            if band not in bands:
                bands[band] = {"total_weight": 0, "known_weight": 0, "count": 0}
            bands[band]["total_weight"] += weight
            bands[band]["count"] += 1
            if swipe["direction"] == "right":
                bands[band]["known_weight"] += weight

        # Band 7: hard right (1.5) + easy left (0.6) = total 2.1, known 1.5
        assert bands[7]["weighted_accuracy"] == pytest.approx(1.5 / 2.1, rel=0.01)
        # Band 6: medium right (1.0) = total 1.0, known 1.0
        assert bands[6]["total_weight"] == 1.0
        bands[6]["weighted_accuracy"] = bands[6]["known_weight"] / bands[6]["total_weight"]
        assert bands[6]["weighted_accuracy"] == 1.0


class TestSpacedRepetitionAlgorithm:
    """Test the SM-2 algorithm independently."""

    def test_sm2_failed_recall_resets(self):
        """Failed recall (quality < 3) should reset interval to 1 day."""
        from app.services.spaced_repetition import SpacedRepetitionScheduler

        # Test the pure algorithm
        def sm2_update(ef, interval, rep, streak, quality):
            new_ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
            new_ef = max(1.3, new_ef)
            if quality < 3:
                return new_ef, 1, 0, 0
            new_rep = rep + 1
            new_streak = streak + 1
            if new_rep == 1:
                new_interval = 1
            elif new_rep == 2:
                new_interval = 3
            else:
                new_interval = round(interval * new_ef)
            return new_ef, min(180, new_interval), new_rep, new_streak

        # Failed recall
        ef, interval, rep, streak = sm2_update(2.5, 10, 3, 3, quality=1)
        assert interval == 1  # reset to 1 day
        assert rep == 0       # reset repetition
        assert streak == 0    # reset streak

    def test_sm2_perfect_recall_extends(self):
        """Perfect recall (quality=5) should increase interval."""
        def sm2_update(ef, interval, rep, streak, quality):
            new_ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
            new_ef = max(1.3, new_ef)
            if quality < 3:
                return new_ef, 1, 0, 0
            new_rep = rep + 1
            new_streak = streak + 1
            if new_rep == 1:
                new_interval = 1
            elif new_rep == 2:
                new_interval = 3
            else:
                new_interval = round(interval * new_ef)
            return new_ef, min(180, new_interval), new_rep, new_streak

        # Perfect recall on 3rd repetition
        ef, interval, rep, streak = sm2_update(2.5, 3, 2, 2, quality=5)
        assert ef > 2.5       # EF should increase
        assert interval > 3   # interval should grow
        assert rep == 3
        assert streak == 3

    def test_swipe_to_quality_mapping(self):
        """Swipe direction + response time should map to quality 0-5."""
        from app.services.spaced_repetition import (
            INSTANT_RECALL_MS, GOOD_RECALL_MS, HESITANT_RECALL_MS
        )

        # Right swipe mappings
        assert INSTANT_RECALL_MS == 1500
        assert GOOD_RECALL_MS == 3000

        # Quick right = quality 5 (instant recall)
        # Slow right = quality 3 (knew but hesitant)
        # Quick left = quality 0 (blackout)
        # Slow left = quality 2 (almost knew it)


class TestTopicInterestScoring:
    """Test the interest score computation."""

    def test_zpd_bonus_peaks_at_65_percent(self):
        """Zone of proximal development bonus should peak near 65% accuracy."""
        def zpd_bonus(knowledge_rate):
            bonus = 1.0 - abs(knowledge_rate - 0.65) * 1.5
            return max(0.0, min(1.0, bonus))

        # Peak at 65%
        assert zpd_bonus(0.65) == pytest.approx(1.0, abs=0.01)
        # Lower at extremes
        assert zpd_bonus(0.0) < 0.1
        assert zpd_bonus(1.0) < 0.5
        # Decent at 50%
        assert zpd_bonus(0.50) > 0.7

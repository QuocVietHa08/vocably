"""
Tests for the pure algorithmic parts of the recommendation system.
No database or external dependencies required.
"""

import pytest


# ── Level Detection Algorithm Tests ────────────────────────────

class TestConfidenceCalculation:
    """Confidence should increase logarithmically with more swipes."""

    @staticmethod
    def calc_confidence(n: int) -> float:
        """Replicated from level_detector.py for isolated testing."""
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

    def test_no_data_low_confidence(self):
        assert self.calc_confidence(0) == 0.10

    def test_few_swipes_still_low(self):
        assert self.calc_confidence(3) == 0.10

    def test_10_swipes_moderate(self):
        c = self.calc_confidence(10)
        assert 0.30 <= c <= 0.35

    def test_50_swipes_high(self):
        c = self.calc_confidence(50)
        assert 0.70 <= c <= 0.75

    def test_200_swipes_very_high(self):
        c = self.calc_confidence(200)
        assert c >= 0.90

    def test_never_exceeds_99(self):
        assert self.calc_confidence(10000) <= 0.99

    def test_monotonically_increasing(self):
        prev = 0
        for n in [0, 3, 7, 15, 30, 50, 100, 200, 500, 1000]:
            c = self.calc_confidence(n)
            assert c >= prev, f"Confidence decreased at n={n}"
            prev = c


class TestCategoryStats:
    """Category stats should correctly compute per-category accuracy."""

    @staticmethod
    def compute_stats(swipe_data: list[dict]) -> dict:
        stats: dict = {}
        for swipe in swipe_data:
            cat = swipe["category"]
            if cat not in stats:
                stats[cat] = {"total": 0, "known": 0}
            stats[cat]["total"] += 1
            if swipe["direction"] == "right":
                stats[cat]["known"] += 1
        for cat in stats:
            t, k = stats[cat]["total"], stats[cat]["known"]
            stats[cat]["accuracy"] = k / t if t > 0 else 0
        return stats

    def test_mixed_accuracy(self):
        data = [
            {"category": "vocabulary", "direction": "right"},
            {"category": "vocabulary", "direction": "right"},
            {"category": "vocabulary", "direction": "left"},
            {"category": "idiom", "direction": "left"},
            {"category": "idiom", "direction": "left"},
        ]
        stats = self.compute_stats(data)
        assert stats["vocabulary"]["accuracy"] == pytest.approx(2/3, rel=0.01)
        assert stats["idiom"]["accuracy"] == 0.0

    def test_all_known(self):
        data = [{"category": "grammar", "direction": "right"} for _ in range(5)]
        stats = self.compute_stats(data)
        assert stats["grammar"]["accuracy"] == 1.0

    def test_empty(self):
        stats = self.compute_stats([])
        assert stats == {}


class TestBandAccuracy:
    """Band accuracy should weight harder cards more heavily."""

    DIFFICULTY_WEIGHT = {"easy": 0.6, "medium": 1.0, "hard": 1.5}

    @staticmethod
    def compute_band_accuracy(swipe_data, weights) -> dict:
        bands: dict = {}
        for swipe in swipe_data:
            band = swipe["band"]
            weight = weights[swipe["difficulty"]]
            if band not in bands:
                bands[band] = {"total_weight": 0, "known_weight": 0, "count": 0}
            bands[band]["total_weight"] += weight
            bands[band]["count"] += 1
            if swipe["direction"] == "right":
                bands[band]["known_weight"] += weight
        for b in bands:
            tw = bands[b]["total_weight"]
            bands[b]["weighted_accuracy"] = bands[b]["known_weight"] / tw if tw > 0 else 0
        return bands

    def test_hard_right_easy_left(self):
        data = [
            {"band": 7, "difficulty": "hard", "direction": "right"},
            {"band": 7, "difficulty": "easy", "direction": "left"},
        ]
        bands = self.compute_band_accuracy(data, self.DIFFICULTY_WEIGHT)
        # hard right = 1.5, easy left = 0 → 1.5 / (1.5+0.6) = 0.714
        assert bands[7]["weighted_accuracy"] == pytest.approx(1.5 / 2.1, rel=0.01)

    def test_all_medium_right(self):
        data = [{"band": 6, "difficulty": "medium", "direction": "right"} for _ in range(3)]
        bands = self.compute_band_accuracy(data, self.DIFFICULTY_WEIGHT)
        assert bands[6]["weighted_accuracy"] == 1.0

    def test_hard_cards_weight_more(self):
        # Knowing hard words should give higher accuracy than knowing easy words
        hard_data = [{"band": 7, "difficulty": "hard", "direction": "right"}]
        easy_data = [{"band": 7, "difficulty": "easy", "direction": "right"},
                     {"band": 7, "difficulty": "easy", "direction": "left"}]

        hard_bands = self.compute_band_accuracy(hard_data, self.DIFFICULTY_WEIGHT)
        easy_bands = self.compute_band_accuracy(easy_data, self.DIFFICULTY_WEIGHT)

        assert hard_bands[7]["weighted_accuracy"] > easy_bands[7]["weighted_accuracy"]


# ── SM-2 Spaced Repetition Algorithm Tests ─────────────────────

class TestSM2Algorithm:
    """Test the SM-2 spaced repetition algorithm."""

    @staticmethod
    def sm2_update(ef, interval, rep, streak, quality):
        """Replicated from spaced_repetition.py for isolated testing."""
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
        new_interval = min(180, new_interval)
        return new_ef, new_interval, new_rep, new_streak

    def test_failed_recall_resets(self):
        ef, interval, rep, streak = self.sm2_update(2.5, 10, 3, 3, quality=1)
        assert interval == 1
        assert rep == 0
        assert streak == 0

    def test_perfect_recall_extends(self):
        ef, interval, rep, streak = self.sm2_update(2.5, 3, 2, 2, quality=5)
        assert ef > 2.5
        assert interval > 3
        assert rep == 3
        assert streak == 3

    def test_first_correct_gets_1_day(self):
        ef, interval, rep, streak = self.sm2_update(2.5, 0, 0, 0, quality=4)
        assert interval == 1
        assert rep == 1

    def test_second_correct_gets_3_days(self):
        ef, interval, rep, streak = self.sm2_update(2.5, 1, 1, 1, quality=4)
        assert interval == 3
        assert rep == 2

    def test_ef_never_below_1_3(self):
        # Repeated failures should not push EF below 1.3
        ef = 2.5
        for _ in range(20):
            ef, _, _, _ = self.sm2_update(ef, 1, 0, 0, quality=0)
        assert ef >= 1.3

    def test_interval_capped_at_180(self):
        # Very long streak shouldn't produce intervals > 180 days
        ef, interval, rep, streak = 2.5, 100, 10, 10
        _, interval, _, _ = self.sm2_update(ef, interval, rep, streak, quality=5)
        assert interval <= 180

    def test_quality_3_still_passes(self):
        """Quality 3 (barely correct) should still extend interval."""
        ef, interval, rep, streak = self.sm2_update(2.5, 0, 0, 0, quality=3)
        assert rep == 1
        assert streak == 1

    def test_progression_over_time(self):
        """Simulate a user consistently getting a card right."""
        ef, interval, rep, streak = 2.5, 0, 0, 0
        intervals = []
        for _ in range(8):
            ef, interval, rep, streak = self.sm2_update(ef, interval, rep, streak, quality=4)
            intervals.append(interval)

        # Intervals should generally increase
        assert intervals[-1] > intervals[0]
        # First few are fixed: 1, 3, then growing
        assert intervals[0] == 1
        assert intervals[1] == 3


# ── Swipe-to-Quality Mapping Tests ─────────────────────────────

class TestSwipeToQuality:
    """Test mapping swipe direction + response time → SM-2 quality."""

    INSTANT_RECALL_MS = 1500
    GOOD_RECALL_MS = 3000
    HESITANT_RECALL_MS = 5000

    @staticmethod
    def swipe_to_quality(direction, response_time_ms=None):
        INSTANT = 1500
        GOOD = 3000
        HESITANT = 5000

        if direction == "right":
            if response_time_ms is None:
                return 4
            if response_time_ms < INSTANT:
                return 5
            elif response_time_ms < GOOD:
                return 4
            else:
                return 3
        else:
            if response_time_ms is None:
                return 1
            if response_time_ms < INSTANT:
                return 0
            elif response_time_ms < HESITANT:
                return 1
            else:
                return 2

    def test_right_instant(self):
        assert self.swipe_to_quality("right", 500) == 5

    def test_right_good(self):
        assert self.swipe_to_quality("right", 2000) == 4

    def test_right_hesitant(self):
        assert self.swipe_to_quality("right", 6000) == 3

    def test_right_no_time(self):
        assert self.swipe_to_quality("right", None) == 4

    def test_left_instant(self):
        assert self.swipe_to_quality("left", 500) == 0

    def test_left_thinking(self):
        assert self.swipe_to_quality("left", 3000) == 1

    def test_left_almost_knew(self):
        assert self.swipe_to_quality("left", 7000) == 2


# ── Zone of Proximal Development Tests ─────────────────────────

class TestZPDBonus:
    """The ZPD bonus should peak around 65% knowledge rate."""

    @staticmethod
    def zpd_bonus(knowledge_rate):
        bonus = 1.0 - abs(knowledge_rate - 0.65) * 1.5
        return max(0.0, min(1.0, bonus))

    def test_peak_at_65(self):
        assert self.zpd_bonus(0.65) == pytest.approx(1.0, abs=0.01)

    def test_low_at_zero(self):
        assert self.zpd_bonus(0.0) < 0.1

    def test_low_at_100(self):
        assert self.zpd_bonus(1.0) < 0.5

    def test_decent_at_50(self):
        assert self.zpd_bonus(0.50) > 0.7

    def test_decent_at_80(self):
        assert self.zpd_bonus(0.80) > 0.7

    def test_symmetric_around_65(self):
        """Roughly symmetric: 55% and 75% should be similar."""
        assert abs(self.zpd_bonus(0.55) - self.zpd_bonus(0.75)) < 0.1

    def test_never_negative(self):
        for rate in [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]:
            assert self.zpd_bonus(rate) >= 0

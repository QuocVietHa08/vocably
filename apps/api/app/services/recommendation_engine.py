"""
AI-Powered Recommendation Engine

Uses LangChain to combine multiple signals and generate personalized
word recommendations. The engine blends:

1. Level-matched cards (from the database, matching user's CEFR level)
2. Topic interest alignment (categories the user engages with)
3. Spaced repetition due cards (words that need review)
4. AI-generated suggestions (LangChain picks "interesting" words)

The AI layer adds a crucial human element: it considers context,
word relationships, thematic connections, and "interestingness" to
make recommendations feel curated rather than algorithmic.
"""

from __future__ import annotations
import logging
from datetime import datetime, timezone
from typing import Optional

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser

from app.core.database import get_supabase
from app.core.config import get_settings
from app.services.level_detector import LevelDetector
from app.services.topic_tracker import TopicTracker
from app.services.spaced_repetition import SpacedRepetitionScheduler
from app.models.schemas import CEFRLevel, RecommendationSource

logger = logging.getLogger(__name__)

# CEFR → IELTS band range mapping for card filtering
CEFR_TO_BAND_RANGE: dict[str, tuple[int, int]] = {
    "A1": (5, 5),
    "A2": (5, 5),
    "B1": (5, 6),
    "B2": (6, 7),
    "C1": (7, 8),
    "C2": (8, 9),
}

# The LangChain prompt for AI-powered word ranking and suggestion
RECOMMENDATION_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are an expert IELTS vocabulary coach and learning scientist.
Your job is to rank and select the best words for a student to learn next.

The student's profile:
- CEFR Level: {cefr_level}
- IELTS Band: {ielts_band}
- Confidence in level assessment: {confidence}%
- Category strengths: Vocabulary={vocab_score}, Grammar={grammar_score}, Idioms={idiom_score}, Collocations={collocation_score}
- Top interest categories: {top_interests}

Principles for great recommendations:
1. ZONE OF PROXIMAL DEVELOPMENT: Pick words slightly above the student's current level — challenging but achievable.
2. INTEREST ALIGNMENT: Favor categories the student engages with, but also gently introduce weaker areas.
3. THEMATIC COHERENCE: When possible, group words that relate to each other (e.g., words about academic writing).
4. NOVELTY: Avoid monotony — mix familiar-feeling words with surprising ones.
5. PRACTICAL VALUE: Prioritize words the student is likely to encounter in IELTS exams.
6. ENGAGEMENT: Choose words that are inherently interesting — words with vivid meanings, surprising etymologies, or useful in daily life.

You will receive a list of candidate flashcards. Rank them by recommendation quality and provide a reason for each pick."""),

    ("human", """Here are the candidate flashcards to rank:

{candidates}

Previously known words (DO NOT recommend these unless they're due for spaced repetition):
{known_words}

Spaced repetition cards due for review (PRIORITIZE these):
{due_cards}

Select the top {count} cards from the candidates. For each, provide:
- flashcard_id
- relevance_score (0.0 to 1.0)
- reason (one sentence explaining why this word is great for this student)
- source (one of: "level_match", "topic_interest", "spaced_repetition", "ai_generated")

Return a JSON array of objects. Example:
[
  {{"flashcard_id": "abc-123", "relevance_score": 0.92, "reason": "This band-7 collocation perfectly matches your level and strengthens a weak area", "source": "level_match"}},
  ...
]

Return ONLY the JSON array, no other text."""),
])


class RecommendationEngine:
    """Orchestrates all recommendation signals through LangChain."""

    def __init__(self):
        self.db = get_supabase()
        self.settings = get_settings()
        self.level_detector = LevelDetector()
        self.topic_tracker = TopicTracker()
        self.sr_scheduler = SpacedRepetitionScheduler()

        # LangChain LLM
        self.llm = ChatOpenAI(
            model=self.settings.llm_model,
            temperature=0.7,  # some creativity in picks
            api_key=self.settings.openai_api_key,
        )
        self.output_parser = JsonOutputParser()

    async def get_recommendations(
        self,
        user_id: str,
        count: int = 10,
        exclude_ids: list[str] | None = None,
    ) -> dict:
        """
        Generate personalized word recommendations for a user.

        This is the main entry point that combines all signals.
        """
        exclude_ids = exclude_ids or []

        # 1. Get user's current level
        level_data = await self.level_detector.detect_level(user_id)
        cefr_level = level_data["cefr_level"]
        ielts_band = level_data["ielts_band"]

        # 2. Get topic interests
        interests = await self.topic_tracker.get_user_interests(user_id)
        top_interests = [i["category"] for i in interests[:3]] if interests else ["vocabulary", "idiom"]

        # 3. Get spaced repetition due cards
        due_cards = await self.sr_scheduler.get_due_cards(user_id, limit=count)
        due_card_ids = [d["flashcard_id"] for d in due_cards]

        # 4. Fetch candidate flashcards from the database
        candidates = self._fetch_candidates(
            cefr_level=cefr_level,
            top_interests=top_interests,
            exclude_ids=exclude_ids,
            limit=count * 4,  # fetch more than needed for AI to pick from
        )

        # 5. Get user's known words to avoid recommending them
        known_words = self._get_known_words(user_id)

        # 6. If we have enough data, use LangChain AI to rank
        if candidates or due_cards:
            ranked = await self._ai_rank_candidates(
                candidates=candidates,
                due_cards=due_cards,
                level_data=level_data,
                top_interests=top_interests,
                known_words=known_words,
                count=count,
            )
        else:
            ranked = []

        # 7. If AI ranking fails or returns too few, fall back to rule-based
        if len(ranked) < count:
            fallback = self._rule_based_recommendations(
                candidates=candidates,
                due_card_ids=due_card_ids,
                known_word_ids={w["flashcard_id"] for w in known_words} if known_words else set(),
                existing_ids={r["flashcard_id"] for r in ranked},
                count=count - len(ranked),
            )
            ranked.extend(fallback)

        # 8. Enrich recommendations with full card data
        enriched = self._enrich_recommendations(ranked)

        # 9. Log recommendations for tracking
        self._log_recommendations(user_id, enriched)

        return {
            "user_id": user_id,
            "user_level": cefr_level,
            "recommendations": enriched,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    async def _ai_rank_candidates(
        self,
        candidates: list[dict],
        due_cards: list[dict],
        level_data: dict,
        top_interests: list[str],
        known_words: list[dict],
        count: int,
    ) -> list[dict]:
        """Use LangChain to intelligently rank and select candidates."""
        try:
            # Format candidates for the prompt
            candidates_text = self._format_candidates(candidates)
            known_text = self._format_known_words(known_words)
            due_text = self._format_due_cards(due_cards)

            # Build the chain
            chain = RECOMMENDATION_PROMPT | self.llm | self.output_parser

            # Invoke
            result = await chain.ainvoke({
                "cefr_level": level_data["cefr_level"],
                "ielts_band": level_data["ielts_band"],
                "confidence": round(level_data["confidence"] * 100),
                "vocab_score": round(level_data["vocabulary_score"] * 100),
                "grammar_score": round(level_data["grammar_score"] * 100),
                "idiom_score": round(level_data["idiom_score"] * 100),
                "collocation_score": round(level_data["collocation_score"] * 100),
                "top_interests": ", ".join(top_interests),
                "candidates": candidates_text,
                "known_words": known_text,
                "due_cards": due_text,
                "count": count,
            })

            # Validate result is a list
            if isinstance(result, list):
                return result[:count]
            else:
                logger.warning(f"AI returned non-list result: {type(result)}")
                return []

        except Exception as e:
            logger.error(f"AI ranking failed, falling back to rules: {e}")
            return []

    def _fetch_candidates(
        self,
        cefr_level: str,
        top_interests: list[str],
        exclude_ids: list[str],
        limit: int = 40,
    ) -> list[dict]:
        """
        Fetch candidate flashcards from the database.

        Strategy: Get cards in the user's band range, biased toward
        their preferred categories.
        """
        band_min, band_max = CEFR_TO_BAND_RANGE.get(cefr_level, (5, 7))

        # Also include one band above for stretch goals
        band_max_stretch = min(9, band_max + 1)

        query = (
            self.db.table("flashcards")
            .select("id, word, definition, example, difficulty, category, band, synonyms, tip")
            .gte("band", band_min)
            .lte("band", band_max_stretch)
        )

        # Exclude already-seen cards in this session
        if exclude_ids:
            query = query.not_.in_("id", exclude_ids)

        query = query.limit(limit)
        result = query.execute()

        candidates = result.data or []

        # Sort candidates: preferred categories first, then by band proximity
        target_band = (band_min + band_max) / 2
        candidates.sort(key=lambda c: (
            0 if c.get("category") in top_interests else 1,  # preferred category first
            abs((c.get("band") or 6) - target_band),          # closer to target band
        ))

        return candidates

    def _get_known_words(self, user_id: str) -> list[dict]:
        """Get flashcard IDs the user has consistently swiped right on."""
        # Get cards where user has swiped right more than left recently
        result = (
            self.db.table("swipe_events")
            .select("flashcard_id, direction")
            .eq("user_id", user_id)
            .eq("direction", "right")
            .order("created_at", desc=True)
            .limit(200)
            .execute()
        )
        return result.data or []

    def _rule_based_recommendations(
        self,
        candidates: list[dict],
        due_card_ids: list[str],
        known_word_ids: set[str],
        existing_ids: set[str],
        count: int,
    ) -> list[dict]:
        """
        Simple rule-based fallback when AI is unavailable.

        Priority:
        1. Due spaced repetition cards
        2. Unknown cards matching user's level
        3. Any remaining candidates
        """
        results = []

        # Priority 1: Due SR cards
        for card_id in due_card_ids:
            if card_id not in existing_ids and len(results) < count:
                results.append({
                    "flashcard_id": card_id,
                    "relevance_score": 0.85,
                    "reason": "Due for spaced repetition review",
                    "source": RecommendationSource.SPACED_REPETITION.value,
                })
                existing_ids.add(card_id)

        # Priority 2: Unknown cards
        for card in candidates:
            if (
                card["id"] not in existing_ids
                and card["id"] not in known_word_ids
                and len(results) < count
            ):
                results.append({
                    "flashcard_id": card["id"],
                    "relevance_score": 0.60,
                    "reason": f"Matches your level — {card['difficulty']} {card.get('category', 'vocabulary')} word",
                    "source": RecommendationSource.LEVEL_MATCH.value,
                })
                existing_ids.add(card["id"])

        return results

    def _enrich_recommendations(self, ranked: list[dict]) -> list[dict]:
        """Add full flashcard data to ranked recommendations."""
        card_ids = [r["flashcard_id"] for r in ranked]
        if not card_ids:
            return []

        result = (
            self.db.table("flashcards")
            .select("id, word, definition, example, difficulty, category, band, synonyms, tip")
            .in_("id", card_ids)
            .execute()
        )

        card_map = {c["id"]: c for c in (result.data or [])}

        enriched = []
        for rec in ranked:
            card = card_map.get(rec["flashcard_id"])
            if card:
                enriched.append({
                    "flashcard_id": card["id"],
                    "word": card["word"],
                    "definition": card["definition"],
                    "example": card["example"],
                    "difficulty": card["difficulty"],
                    "category": card["category"],
                    "band": card.get("band"),
                    "recommendation_reason": rec.get("reason", "Recommended for you"),
                    "source": rec.get("source", "level_match"),
                    "relevance_score": rec.get("relevance_score", 0.5),
                    "interest_tags": card.get("synonyms", []) or [],
                })

        return enriched

    def _log_recommendations(self, user_id: str, recommendations: list[dict]) -> None:
        """Log recommendations for analytics and feedback tracking."""
        try:
            records = [
                {
                    "user_id": user_id,
                    "flashcard_id": rec["flashcard_id"],
                    "reason": rec["recommendation_reason"],
                    "source": rec["source"],
                    "relevance_score": rec["relevance_score"],
                    "was_shown": True,
                }
                for rec in recommendations
            ]
            if records:
                self.db.table("recommendations").insert(records).execute()
        except Exception as e:
            logger.error(f"Failed to log recommendations: {e}")

    def _format_candidates(self, candidates: list[dict]) -> str:
        """Format candidate cards for the LLM prompt."""
        if not candidates:
            return "No candidates available."

        lines = []
        for c in candidates:
            lines.append(
                f"- ID: {c['id']} | Word: \"{c['word']}\" | "
                f"Band: {c.get('band', '?')} | Difficulty: {c['difficulty']} | "
                f"Category: {c['category']} | "
                f"Definition: {c['definition'][:80]}"
            )
        return "\n".join(lines)

    def _format_known_words(self, known_words: list[dict]) -> str:
        """Format known word IDs for the LLM prompt."""
        if not known_words:
            return "None yet — this is a new user."

        ids = list({w["flashcard_id"] for w in known_words})
        return f"{len(ids)} words already known (IDs: {', '.join(ids[:20])}{'...' if len(ids) > 20 else ''})"

    def _format_due_cards(self, due_cards: list[dict]) -> str:
        """Format due SR cards for the LLM prompt."""
        if not due_cards:
            return "No cards due for review."

        lines = []
        for d in due_cards:
            lines.append(
                f"- ID: {d['flashcard_id']} | "
                f"EF: {d.get('easiness_factor', '?')} | "
                f"Streak: {d.get('streak', 0)} | "
                f"Interval: {d.get('interval_days', 0)} days"
            )
        return "\n".join(lines)

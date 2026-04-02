"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Supabase
    supabase_url: str = ""
    supabase_service_key: str = ""

    # OpenAI
    openai_api_key: str = ""

    # Server
    host: str = "0.0.0.0"
    port: int = 5000
    log_level: str = "info"

    # Model config
    llm_model: str = "gpt-4o-mini"
    embedding_model: str = "text-embedding-3-small"

    # Level detection thresholds
    min_swipes_for_detection: int = 10
    level_reassessment_interval: int = 20  # re-evaluate every N new swipes

    # Recommendation config
    recommendations_batch_size: int = 10
    spaced_repetition_weight: float = 0.35
    level_match_weight: float = 0.35
    topic_interest_weight: float = 0.20
    ai_novelty_weight: float = 0.10

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()

"""
Vocally API — FastAPI Backend

AI-powered vocabulary recommendation engine that detects user level
from swipe patterns and suggests the most relevant, interesting words.

Run with: uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title="Vocally API",
    description=(
        "Vocally backend API — AI-powered vocabulary recommendation engine. "
        "Detects user CEFR level from flashcard swipe patterns, "
        "tracks topic interests, schedules spaced repetition, "
        "and uses LangChain to suggest personalized word recommendations."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow frontends to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # Next.js web
        "http://localhost:3001",   # Admin
        "*",                       # Mobile (Expo)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes
app.include_router(router)


@app.on_event("startup")
async def startup():
    """Validate configuration on startup."""
    if not settings.supabase_url or not settings.supabase_service_key:
        import logging
        logging.warning(
            "⚠️  SUPABASE_URL or SUPABASE_SERVICE_KEY not set. "
            "The service will fail on database operations."
        )
    if not settings.openai_api_key:
        import logging
        logging.warning(
            "⚠️  OPENAI_API_KEY not set. "
            "AI-powered recommendations will fall back to rule-based mode."
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        log_level=settings.log_level,
        reload=True,
    )

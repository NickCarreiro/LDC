from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_intake_forms import router as intake_forms_router
from app.api.routes_matches import router as matches_router
from app.api.routes_participants import router as participants_router
from app.api.routes_sessions import router as sessions_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title="LDC Operations API",
    version="0.1.0",
    description="Organizer-first Catholic matchmaking operations API.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(participants_router)
app.include_router(sessions_router)
app.include_router(matches_router)
app.include_router(intake_forms_router)


@app.get("/health", tags=["system"])
def health():
    return {"status": "ok", "environment": settings.app_env}

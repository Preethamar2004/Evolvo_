"""Evolvo FastAPI Application Entry Point."""
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import engine, Base
from app.routers import auth, profile, dashboard
from app.routers import onboarding as onboarding_router
from app.routers import missions as missions_router
from app.routers import chat as chat_router
from app.routers import social as social_router
from app.routers import guilds as guilds_router
from app.routers import entertainment, future_self, analytics
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
import time

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, rate_limit: int = 200, window_size: int = 60):
        super().__init__(app)
        self.rate_limit = rate_limit
        self.window_size = window_size
        self.clients = {}

    async def dispatch(self, request: Request, call_next):
        # Very basic in-memory rate limiting for production-readiness check
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        
        if client_ip not in self.clients:
            self.clients[client_ip] = []
        
        self.clients[client_ip] = [req_time for req_time in self.clients[client_ip] if now - req_time < self.window_size]
        
        if len(self.clients[client_ip]) >= self.rate_limit:
            return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded. Try again later."})
        
        self.clients[client_ip].append(now)
        response = await call_next(request)
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle: startup & shutdown."""
    # Create upload directories
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.UPLOAD_DIR, "avatars").mkdir(parents=True, exist_ok=True)

    # Auto-create tables in dev mode (use Alembic migrations in production)
    if settings.DEBUG:
        Base.metadata.create_all(bind=engine)

    yield
    # Shutdown: close connections (handled by engine pool)


# ─── App Instance ─────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Evolvo API — Level up your real life",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[url.strip() for url in settings.FRONTEND_URL.split(",")] + ["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RateLimitMiddleware, rate_limit=200, window_size=60)

# ─── Static Files ─────────────────────────────────────────────────
uploads_path = Path(settings.UPLOAD_DIR)
uploads_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")

# ─── Routers ──────────────────────────────────────────────────────
API_PREFIX = "/api/v1"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(profile.router, prefix=API_PREFIX)
app.include_router(dashboard.router, prefix=API_PREFIX)
app.include_router(onboarding_router.router, prefix=API_PREFIX)
app.include_router(missions_router.router, prefix=API_PREFIX)
app.include_router(chat_router.router, prefix=API_PREFIX)
app.include_router(social_router.router, prefix=API_PREFIX)
app.include_router(guilds_router.router, prefix=API_PREFIX)
app.include_router(entertainment.router, prefix=API_PREFIX)
app.include_router(future_self.router, prefix=API_PREFIX)
app.include_router(analytics.router, prefix=API_PREFIX)

# ─── Health Check ─────────────────────────────────────────────────
@app.get("/api/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@app.get("/", tags=["System"])
def root():
    return {"message": f"Welcome to {settings.APP_NAME} API v{settings.APP_VERSION}"}

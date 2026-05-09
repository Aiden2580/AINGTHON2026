from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import ORM models so SQLAlchemy registers them with Base before create_all
import models.orm  # noqa: F401

from database import Base, engine, SessionLocal
from routers import auth, debates, elections, news, policies, users

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Agora API",
    description="국내 유일 청년 정책 토론 플랫폼 백엔드",
    version="0.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(debates.router)
app.include_router(elections.router)
app.include_router(news.router)
app.include_router(policies.router)
app.include_router(users.router)


@app.on_event("startup")
async def seed_on_first_run():
    """Populate demo data only when the database is empty."""
    from seed import seed
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()


@app.get("/", tags=["헬스체크"])
async def root():
    return {"status": "ok", "message": "Agora API v0.3 실행 중 🇰🇷"}


@app.get("/health", tags=["헬스체크"])
async def health():
    return {"status": "healthy"}

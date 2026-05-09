from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from auth_utils import get_current_user
from database import get_db
from models.orm import Comment, Debate, User
from models.schemas import UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["사용자"])

# ── Level thresholds ──────────────────────────────────────────────────────────

_LEVELS = [
    {"level": 1, "name": "시민 입문자",  "emoji": "🌱", "xp_min": 0,    "xp_max": 499},
    {"level": 2, "name": "정책 탐구자",  "emoji": "🔍", "xp_min": 500,  "xp_max": 1499},
    {"level": 3, "name": "민주 참여자",  "emoji": "⚡", "xp_min": 1500, "xp_max": 3499},
    {"level": 4, "name": "정책 분석가",  "emoji": "📊", "xp_min": 3500, "xp_max": 6999},
    {"level": 5, "name": "정책 전문가",  "emoji": "🏆", "xp_min": 7000, "xp_max": None},
]


def _fmt_date(dt: datetime) -> str:
    return f"{dt.year}년 {dt.month}월 {dt.day}일"


def _get_stats(user_id: int, db: Session) -> dict:
    threads  = db.query(func.count(Debate.id)).filter(Debate.author_id == user_id).scalar() or 0
    comments = db.query(func.count(Comment.id)).filter(Comment.author_id == user_id).scalar() or 0
    upvotes  = (
        (db.query(func.coalesce(func.sum(Debate.upvotes),  0)).filter(Debate.author_id  == user_id).scalar() or 0)
        + (db.query(func.coalesce(func.sum(Comment.upvotes), 0)).filter(Comment.author_id == user_id).scalar() or 0)
    )

    debate_dates  = [r[0] for r in db.query(Debate.created_at).filter(Debate.author_id   == user_id).all()]
    comment_dates = [r[0] for r in db.query(Comment.created_at).filter(Comment.author_id == user_id).all()]
    all_dates     = [d for d in debate_dates + comment_dates if d is not None]
    weeks         = {(d.year, d.isocalendar()[1]) for d in all_dates}

    return {
        "threads_created":  threads,
        "upvotes_received": upvotes,
        "comments_written": comments,
        "active_weeks":     len(weeks),
    }


def _compute_level(stats: dict) -> dict:
    xp = stats["threads_created"] * 30 + stats["comments_written"] * 10 + stats["upvotes_received"] * 3
    lv_data = _LEVELS[0]
    for lv in _LEVELS:
        if xp >= lv["xp_min"]:
            lv_data = lv

    xp_min = lv_data["xp_min"]
    xp_max = lv_data["xp_max"]
    if xp_max is not None:
        xp_percent = round(min((xp - xp_min) / (xp_max - xp_min + 1) * 100, 100.0), 1)
        xp_to_next = xp_max + 1 - xp
    else:
        xp_percent = 100.0
        xp_to_next = 0

    return {
        "level": lv_data["level"], "name": lv_data["name"], "emoji": lv_data["emoji"],
        "xp": xp, "xp_min": xp_min, "xp_max": xp_max,
        "xp_percent": xp_percent, "xp_to_next": xp_to_next,
        "all_levels": _LEVELS,
    }


def _compute_badges(stats: dict, level: int) -> list[dict]:
    t, c, u = stats["threads_created"], stats["comments_written"], stats["upvotes_received"]
    return [
        {"id": "newcomer",       "icon": "🌱", "name": "새싹 시민",    "desc": "첫 번째 활동",    "unlocked": True,       "hint": "항상 달성"},
        {"id": "first_thread",   "icon": "🗳️", "name": "첫 토론",     "desc": "토론 1개 작성",   "unlocked": t  >= 1,    "hint": "토론을 1개 이상 작성하세요"},
        {"id": "fact_checker",   "icon": "🎯", "name": "팩트체커",    "desc": "댓글 10개 달성",  "unlocked": c  >= 10,   "hint": "댓글을 10개 이상 작성하세요"},
        {"id": "local_rep",      "icon": "🌍", "name": "지역 대표",   "desc": "토론 10개 달성",  "unlocked": t  >= 10,   "hint": "토론을 10개 이상 작성하세요"},
        {"id": "communicator",   "icon": "💬", "name": "소통의 달인", "desc": "댓글 50개 달성",  "unlocked": c  >= 50,   "hint": "댓글을 50개 이상 작성하세요"},
        {"id": "hot_debater",    "icon": "🔥", "name": "토론왕",      "desc": "추천 50개 달성",  "unlocked": u  >= 50,   "hint": "추천을 50개 이상 받으세요"},
        {"id": "opinion_leader", "icon": "⭐", "name": "여론 선도자", "desc": "추천 100개 달성", "unlocked": u  >= 100,  "hint": "추천을 100개 이상 받으세요"},
        {"id": "balanced",       "icon": "🏅", "name": "균형감각",    "desc": "레벨 3 달성",     "unlocked": level >= 3, "hint": "레벨 3 이상을 달성하세요"},
        {"id": "policy_analyst", "icon": "📚", "name": "정책 분석가", "desc": "레벨 4 달성",     "unlocked": level >= 4, "hint": "레벨 4 이상을 달성하세요"},
        {"id": "golden",         "icon": "🏆", "name": "골든 배지",   "desc": "레벨 5 달성",     "unlocked": level >= 5, "hint": "레벨 5를 달성하세요"},
    ]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_my_profile(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """프로필 편집 — 학교 / 전공 / 연령대만 수정 가능"""
    if data.university is not None:
        u = data.university.strip()
        if not u:
            raise HTTPException(status_code=400, detail="학교를 입력해주세요")
        current_user.university = u
    if data.major is not None:
        m = data.major.strip()
        if not m:
            raise HTTPException(status_code=400, detail="전공을 입력해주세요")
        current_user.major = m
    if data.age_group is not None:
        current_user.age_group = data.age_group

    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/me/level")
async def get_my_level(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stats = _get_stats(current_user.id, db)
    info  = _compute_level(stats)
    return {**info, "stats": stats}


@router.get("/me/badges")
async def get_my_badges(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stats  = _get_stats(current_user.id, db)
    info   = _compute_level(stats)
    badges = _compute_badges(stats, info["level"])
    return {
        "badges":         badges,
        "unlocked_count": sum(1 for b in badges if b["unlocked"]),
        "total":          len(badges),
    }


@router.get("/me/history")
async def get_my_history(
    type: Optional[str] = Query(None, pattern="^(thread|comment)$"),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """참여 기록. ?type=thread 또는 ?type=comment 로 필터링."""
    history: list[dict] = []

    if type != "comment":
        debates = (
            db.query(Debate)
            .filter(Debate.author_id == current_user.id)
            .order_by(Debate.created_at.desc())
            .limit(limit)
            .all()
        )
        for d in debates:
            history.append({
                "id":         d.id,
                "thread_id":  d.id,
                "type":       "thread",
                "title":      d.title,
                "category":   d.category,
                "region":     d.region,
                "upvotes":    d.upvotes,
                "date":       _fmt_date(d.created_at),
                "created_at": d.created_at.isoformat(),
            })

    if type != "thread":
        comments = (
            db.query(Comment)
            .options(joinedload(Comment.debate))
            .filter(Comment.author_id == current_user.id)
            .order_by(Comment.created_at.desc())
            .limit(limit)
            .all()
        )
        for c in comments:
            parent = c.debate
            history.append({
                "id":         c.id,
                "thread_id":  c.debate_id,
                "type":       "comment",
                "title":      parent.title    if parent else "삭제된 토론",
                "category":   parent.category if parent else "",
                "region":     parent.region   if parent else "",
                "upvotes":    c.upvotes,
                "date":       _fmt_date(c.created_at),
                "created_at": c.created_at.isoformat(),
            })

    history.sort(key=lambda x: x["created_at"], reverse=True)
    return {"history": history[:limit]}


@router.get("/me/stats")
async def get_my_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _get_stats(current_user.id, db)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user_profile(user_id: int, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    return user

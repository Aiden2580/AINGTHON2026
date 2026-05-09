"""뉴스·정책 브리핑 라우터 — DB-backed + korea.kr 보도자료 라이브 피드."""
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models.orm import NewsArticle
from models.schemas import ElectionInfo, NewsResponse
from services.korea_briefing import fetch_announcements

router = APIRouter(prefix="/news", tags=["정보·뉴스"])


@router.get("/announcements")
async def list_announcements(limit: int = Query(6, ge=1, le=30)):
    """
    최근 정부 발표 (korea.kr 정책브리핑 보도자료).
    서버 측에 30분 캐시되어 있어 외부 호출이 매 요청마다 발생하지 않습니다.
    """
    items = await fetch_announcements(limit=limit)
    return {"items": items}


@router.get("/", response_model=list[NewsResponse])
async def list_news(
    category: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """뉴스·정책 목록"""
    query = db.query(NewsArticle).order_by(NewsArticle.created_at.desc())
    if category:
        query = query.filter(NewsArticle.category == category)
    return query.offset((page - 1) * size).limit(size).all()


@router.get("/election", response_model=ElectionInfo)
async def get_election_info():
    """다음 선거 D-day 정보"""
    election_date = date(2026, 6, 20)
    days_left = (election_date - date.today()).days
    return ElectionInfo(
        name="제22대 국회의원선거",
        date="2026년 6월 20일",
        days_left=max(days_left, 0),
        description="대한민국 국회의원을 선출하는 선거입니다.",
    )

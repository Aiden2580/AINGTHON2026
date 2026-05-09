"""선거 일정 라우터 — DB-backed."""
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.orm import ElectionEvent
from models.schemas import ElectionScheduleResponse

router = APIRouter(prefix="/elections", tags=["선거 일정"])


def _days_left(date_str: str) -> int:
    delta = (date.fromisoformat(date_str) - date.today()).days
    return max(delta, 0)


@router.get("/", response_model=list[ElectionScheduleResponse])
async def list_elections(db: Session = Depends(get_db)):
    """선거 일정 목록 (오름차순, days_left 동적 계산)"""
    events = db.query(ElectionEvent).order_by(ElectionEvent.date.asc()).all()
    return [
        ElectionScheduleResponse(
            id=e.id, name=e.name, date=e.date, type=e.type,
            description=e.description, region=e.region, color=e.color,
            days_left=_days_left(e.date),
        )
        for e in events
    ]

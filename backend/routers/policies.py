"""
정책·법안 라우터 — DB-backed.
모든 데이터는 bills 테이블에서 조회됩니다 (시드는 seed.py 참고).
POST /refresh 엔드포인트로 국회 Open API 에서 실데이터를 가져올 수 있습니다.
"""
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models.orm import Bill
from models.schemas import BillResponse, BillSummaryResponse
from services.assembly import AssemblyAPIError, fetch_bills as fetch_remote_bills
from services.gemini import analyze_bill_detail, summarize_policy

router = APIRouter(prefix="/policies", tags=["정책·법안"])

CATEGORIES = ["청년", "교육", "경제", "복지", "환경", "주거", "고용", "보건", "기타"]


@router.get("/categories", response_model=list[str])
async def get_categories():
    """지원 카테고리 목록"""
    return CATEGORIES


@router.get("/", response_model=list[BillResponse])
async def list_bills(
    category: Optional[str] = Query(None, description="카테고리 필터"),
    db: Session = Depends(get_db),
):
    """법안 목록 조회"""
    query = db.query(Bill)
    if category:
        query = query.filter(Bill.category == category)
    return query.all()


@router.post("/refresh")
async def refresh_bills(
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    국회 Open API에서 최신 법안을 가져와 DB에 upsert.
    AI/큐레이션 필드 (description, key_points, pros, cons, expected_impact) 는 보존합니다.
    """
    try:
        remote = await fetch_remote_bills(limit=limit)
    except AssemblyAPIError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"국회 API 호출 실패: {e}")

    inserted = 0
    updated  = 0
    for b in remote:
        existing = db.get(Bill, b["id"])
        if existing:
            # 메타데이터만 갱신, 큐레이션 필드는 보존
            existing.bill_no       = b["bill_no"]
            existing.title         = b["title"]
            existing.category      = b["category"]
            existing.proposer      = b["proposer"]
            existing.propose_date  = b["propose_date"]
            existing.status        = b["status"]
            existing.raw_text      = b["raw_text"]
            existing.related_url   = b.get("related_url") or existing.related_url
            existing.sponsor_party = b.get("sponsor_party") or existing.sponsor_party
            updated += 1
        else:
            db.add(Bill(
                id=b["id"], bill_no=b["bill_no"],
                title=b["title"], category=b["category"],
                proposer=b["proposer"], propose_date=b["propose_date"],
                status=b["status"], raw_text=b["raw_text"],
                related_url=b.get("related_url"),
                sponsor_party=b.get("sponsor_party"),
                # JSON columns default to NULL otherwise, which breaks
                # BillResponse serialization. Seed them as empty lists.
                key_points=[], pros=[], cons=[],
            ))
            inserted += 1

    db.commit()
    return {
        "inserted": inserted,
        "updated":  updated,
        "total":    len(remote),
    }


@router.get("/{bill_id}", response_model=BillResponse)
async def get_bill(bill_id: str, db: Session = Depends(get_db)):
    """법안 상세 조회"""
    bill = db.get(Bill, bill_id)
    if not bill:
        raise HTTPException(status_code=404, detail="법안을 찾을 수 없습니다")
    return bill


@router.post("/{bill_id}/summarize", response_model=BillSummaryResponse)
async def summarize_bill(bill_id: str, db: Session = Depends(get_db)):
    """Gemini AI로 법안 핵심 3줄 요약"""
    bill = db.get(Bill, bill_id)
    if not bill:
        raise HTTPException(status_code=404, detail="법안을 찾을 수 없습니다")
    bullets = await summarize_policy(bill.id, bill.title, bill.raw_text)
    return BillSummaryResponse(bill_id=bill.id, title=bill.title, bullets=bullets)


@router.post("/{bill_id}/analyze", response_model=BillResponse)
async def analyze_bill(
    bill_id: str,
    force: bool = Query(False, description="이미 분석된 경우에도 재생성"),
    db: Session = Depends(get_db),
):
    """
    Gemini AI로 법안의 상세 분석 (배경, 핵심 조항, 찬성·반대 논거, 예상 영향) 을 생성.
    제안이유 본문이 Open API에 포함되지 않으므로, 제목 기반으로 추론 분석을 생성합니다.
    이미 description이 있으면 force=true 가 아닌 한 재생성하지 않습니다 (중복 호출 방지).
    """
    bill = db.get(Bill, bill_id)
    if not bill:
        raise HTTPException(status_code=404, detail="법안을 찾을 수 없습니다")

    if bill.description and not force:
        # 이미 분석 완료 — 그대로 반환
        return bill

    # raw_text 가 제목과 다르면 추가 정보로 활용
    extra = bill.raw_text if bill.raw_text and bill.raw_text != bill.title else ""
    result = await analyze_bill_detail(bill.title, extra)

    if not result:
        raise HTTPException(
            status_code=503,
            detail="AI 분석에 실패했습니다. GEMINI_API_KEY를 확인하거나 잠시 후 다시 시도해주세요.",
        )

    bill.description     = result["description"]     or bill.description
    bill.key_points      = result["key_points"]      or []
    bill.pros            = result["pros"]            or []
    bill.cons            = result["cons"]            or []
    bill.expected_impact = result["expected_impact"] or bill.expected_impact

    db.commit()
    db.refresh(bill)
    return bill

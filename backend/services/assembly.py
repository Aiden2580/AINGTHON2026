"""
국회 의안정보 통합 Open API 연동 (open.assembly.go.kr).
서비스: '의안정보 통합 (TVBPMBILL11)'

환경변수:
  - OPENAPI_KEY        : 발급받은 인증키 (필수)
  - OPENAPI_BILLS_URL  : 엔드포인트 URL 오버라이드 (선택)
  - OPENAPI_AGE        : 국회 대수 (기본 '22' = 제22대 국회)

ERROR-300 ('필수 값이 누락되어 있습니다') 가 나오는 가장 흔한 원인은
'AGE' (국회 대수) 파라미터 누락입니다. 본 모듈은 항상 AGE를 함께 보냅니다.
"""
import os
from typing import Any

import httpx
from dotenv import load_dotenv

from services.gemini import UNCATEGORIZED, classify_bills_batch

load_dotenv()

API_KEY = os.getenv("OPENAPI_KEY", "")
API_URL = os.getenv(
    "OPENAPI_BILLS_URL",
    "https://open.assembly.go.kr/portal/openapi/TVBPMBILL11",
)
API_AGE = os.getenv("OPENAPI_AGE", "22")

# 법안 제목에서 우리 앱 카테고리를 추론하기 위한 키워드 매핑
_CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "청년":  ["청년", "청소년"],
    "교육":  ["교육", "대학", "초중등", "고등교육", "학교", "학생"],
    "주거":  ["주거", "주택", "전세", "임대", "부동산"],
    "경제":  ["최저임금", "경제", "조세", "세법", "세금", "통화", "금융"],
    "환경":  ["환경", "탄소", "기후", "에너지", "녹색", "오염", "재활용"],
    "보건":  ["건강", "보건", "의료", "약사", "정신건강", "감염병"],
    "고용":  ["고용", "근로", "노동", "직업", "실업"],
    "복지":  ["복지", "사회보장", "급여", "기초생활", "장애인", "노인"],
}


class AssemblyAPIError(RuntimeError):
    pass


def _infer_category(title: str) -> str:
    """Keyword fallback used when Gemini is unavailable or returns '기타'."""
    for cat, keywords in _CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in title:
                return cat
    return UNCATEGORIZED


def _extract_rows(payload: Any) -> list[dict]:
    """
    Open API 응답에서 'row' 배열을 추출.
    응답은 두 가지 형태 중 하나로 옵니다:
      A) {"<endpoint>": [{"head": [...]}, {"row": [...]}]}
      B) {"<endpoint>": {"head": {...}, "row": [...]}}
      C) 에러: {"RESULT": {"CODE": "...", "MESSAGE": "..."}}
    """
    if not isinstance(payload, dict):
        return []

    # 에러 응답
    if "RESULT" in payload:
        result = payload["RESULT"]
        msg = result.get("MESSAGE") if isinstance(result, dict) else str(result)
        raise AssemblyAPIError(f"API 에러: {msg}")

    for value in payload.values():
        # 형식 A
        if isinstance(value, list):
            for item in value:
                if isinstance(item, dict) and "row" in item:
                    rows = item.get("row")
                    if isinstance(rows, list):
                        return rows
        # 형식 B
        elif isinstance(value, dict) and "row" in value:
            rows = value.get("row")
            if isinstance(rows, list):
                return rows
    return []


async def fetch_bills(limit: int = 30, age: str | None = None) -> list[dict]:
    """
    Open API (TVBPMBILL11) 에서 최근 발의 법안 메타데이터를 가져옵니다.
    Returns: [{id, bill_no, title, category, proposer, propose_date, status, raw_text, related_url, sponsor_party}, ...]
    """
    if not API_KEY:
        raise AssemblyAPIError("OPENAPI_KEY가 .env에 설정되어 있지 않습니다")

    params = {
        "KEY":    API_KEY,
        "Type":   "json",
        "pIndex": 1,
        "pSize":  min(limit, 100),
        "AGE":    str(age or API_AGE),   # 필수: 국회 대수
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.get(API_URL, params=params)
        res.raise_for_status()
        data = res.json()

    rows = _extract_rows(data)

    # 1차 패스: 메타데이터만 빌드, 카테고리는 일단 '기타'
    bills: list[dict] = []
    for r in rows:
        title = (r.get("BILL_NAME") or "").strip()
        if not title:
            continue
        bill_no = str(r.get("BILL_NO") or "").strip()
        bill_id = str(r.get("BILL_ID") or f"NA-{bill_no}").strip()

        # 처리 상태: 처리 완료 시 위원회 결과, 그 외는 현재 회부 위원회 표시
        status = (
            (r.get("PROC_RESULT_CD") or "").strip()
            or (r.get("CURR_COMMITTEE") or "").strip()
            or "심사 중"
        )

        bills.append({
            "id":            bill_id,
            "bill_no":       bill_no or bill_id,
            "title":         title,
            "category":      UNCATEGORIZED,   # 아래에서 Gemini로 분류
            "proposer":      (r.get("PROPOSER_KIND") or "미상").strip(),
            "propose_date":  (r.get("PROPOSE_DT") or "")[:10],
            "status":        status,
            "raw_text":      title,
            "related_url":   (r.get("LINK_URL") or "").strip() or None,
            "sponsor_party": (r.get("RST_PROPOSER") or r.get("PROPOSER") or "").strip() or None,
        })

    if not bills:
        return bills

    # 2차 패스: Gemini로 일괄 분류 → 실패하거나 '기타' 반환 시 키워드 매칭으로 보강
    titles = [b["title"] for b in bills]
    gemini_cats = await classify_bills_batch(titles)
    for b, cat in zip(bills, gemini_cats):
        if cat and cat != UNCATEGORIZED:
            b["category"] = cat
        else:
            # Gemini가 분류하지 못한 경우 키워드 fallback 시도
            b["category"] = _infer_category(b["title"])

    return bills

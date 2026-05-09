"""
대한민국 정책브리핑 (korea.kr) 보도자료 스크래핑.
list 페이지 (https://www.korea.kr/briefing/pressReleaseList.do) 에서
최근 보도자료의 제목, 링크, 발표일, 부처를 추출합니다.

페이지 구조 (관측):
  <a href="/briefing/pressReleaseView.do?newsId=...&..." class="lst-item">
    <strong>[보도자료] 제목</strong>
    본문 일부... 2026.05.09 국무조정실
  </a>

서버 측에 30분 in-memory 캐시를 두어 매 요청마다 외부 호출을 피합니다.
"""
import asyncio
import re
import time
from html import unescape

import httpx

LIST_URL = "https://www.korea.kr/briefing/pressReleaseList.do"
DETAIL_BASE = "https://www.korea.kr"

_CACHE_TTL_SEC = 60 * 30   # 30분
_cache: dict[str, tuple[float, list[dict]]] = {}
_cache_lock = asyncio.Lock()

# 한국 정부 부처/기관 패턴
_MINISTRY_RE = re.compile(r"([\w가-힣]{2,15}(?:부|청|처|원|실|위원회|국|관|단|회의))")
# YYYY.MM.DD 형식의 날짜
_DATE_RE = re.compile(r"(\d{4})\.(\d{2})\.(\d{2})")
# 보도자료 링크: <a href="...pressReleaseView.do?...newsId=숫자..."> ... </a>
_LINK_RE = re.compile(
    r'<a\b[^>]*?href=[\'"]([^\'"]*?pressReleaseView\.do[^\'"]*?newsId=(\d+)[^\'"]*?)[\'"][^>]*?>(.*?)</a>',
    re.DOTALL | re.IGNORECASE,
)
# 제목은 보통 <strong> 안에 들어 있음
_STRONG_RE = re.compile(r"<strong[^>]*>(.*?)</strong>", re.DOTALL | re.IGNORECASE)
# "[보도자료]" 등의 prefix 제거
_TITLE_PREFIX_RE = re.compile(r"^\s*\[?\s*보도자료\s*\]?\s*", re.IGNORECASE)


def _strip_tags(s: str) -> str:
    """HTML 태그·엔티티 제거 + 공백 정리."""
    text = unescape(re.sub(r"<[^>]+>", " ", s))
    return re.sub(r"\s+", " ", text).strip()


async def _fetch_html(client: httpx.AsyncClient) -> str:
    res = await client.get(
        LIST_URL,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
        },
        follow_redirects=True,
    )
    res.raise_for_status()
    return res.text


def _parse(html: str, limit: int) -> list[dict]:
    items: list[dict] = []
    seen: set[str] = set()

    for m in _LINK_RE.finditer(html):
        href = m.group(1)
        news_id = m.group(2)
        inner_html = m.group(3)

        if news_id in seen:
            continue

        # 제목: <strong> 우선, 없으면 inner의 첫 80자
        title_match = _STRONG_RE.search(inner_html)
        if title_match:
            title = _strip_tags(title_match.group(1))
        else:
            title = _strip_tags(inner_html)[:80]

        title = _TITLE_PREFIX_RE.sub("", title).strip()
        if len(title) < 2:
            continue

        # 본문 전체 텍스트 (제목 포함) — 날짜·부처는 보통 끝부분에 위치
        full_text = _strip_tags(inner_html)

        date_iso = ""
        date_match = _DATE_RE.search(full_text)
        if date_match:
            date_iso = f"{date_match.group(1)}-{date_match.group(2)}-{date_match.group(3)}"

        ministry = ""
        if date_match:
            tail = full_text[date_match.end() : date_match.end() + 80]
            mi_match = _MINISTRY_RE.search(tail)
            if mi_match:
                ministry = mi_match.group(1)
        if not ministry:
            # fallback: 전체 텍스트 끝부분에서 찾기
            mi_match = _MINISTRY_RE.search(full_text[-200:])
            if mi_match:
                ministry = mi_match.group(1)

        # 상대 경로 → 절대 URL, &amp; 디코드
        url = href if href.startswith("http") else f"{DETAIL_BASE}{href}"
        url = url.replace("&amp;", "&")

        items.append({
            "id":       news_id,
            "title":    title,
            "ministry": ministry or "정부",
            "date":     date_iso,
            "url":      url,
        })
        seen.add(news_id)
        if len(items) >= limit:
            break

    return items


async def fetch_announcements(limit: int = 6) -> list[dict]:
    """
    korea.kr 보도자료 최신 N건. 30분 캐시.
    Returns: [{id, title, ministry, date, url}, ...]
    """
    cache_key = f"announcements:{limit}"
    now = time.time()

    async with _cache_lock:
        cached = _cache.get(cache_key)
        if cached and (now - cached[0] < _CACHE_TTL_SEC):
            return cached[1]

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            html = await _fetch_html(client)
        items = _parse(html, limit)
    except (httpx.HTTPError, asyncio.TimeoutError) as exc:
        # 네트워크 오류 시 만료된 캐시라도 반환
        async with _cache_lock:
            cached = _cache.get(cache_key)
        if cached:
            return cached[1]
        # 디버그용으로 stderr 로그
        import sys
        print(f"[korea_briefing] fetch failed: {exc!r}", file=sys.stderr)
        return []

    # 결과가 0건이라면 디버그 로그 (regex가 새 페이지 구조에 맞지 않을 가능성)
    if not items:
        import sys
        snippet = html[:400].replace("\n", " ")
        print(
            f"[korea_briefing] parsed 0 items from {len(html)} bytes. "
            f"head snippet: {snippet}",
            file=sys.stderr,
        )

    async with _cache_lock:
        _cache[cache_key] = (now, items)
    return items

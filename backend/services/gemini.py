"""
Gemini AI service: 법안 3줄 요약 + 카테고리 자동 분류.
Set GEMINI_API_KEY environment variable (or create a .env file from .env.example).
Falls back to a descriptive placeholder when the key is absent.
"""
import asyncio
import os
import re

from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# 앱이 지원하는 카테고리 + 미분류
APP_CATEGORIES = ["청년", "교육", "경제", "복지", "환경", "주거", "고용", "보건"]
UNCATEGORIZED  = "기타"

# In-memory cache: bill_id -> [bullet1, bullet2, bullet3]
_cache: dict[str, list[str]] = {}

_PROMPT_TEMPLATE = """\
다음 한국 법안/정책의 내용을 대학생이 쉽게 이해할 수 있도록 핵심 내용을 3가지로 요약해주세요.
각 요점은 "•" 기호로 시작하고, 전문 용어는 쉬운 말로 풀어서 한 줄로 간결하게 작성해주세요.

법안 제목: {title}
법안 내용: {text}

아래 형식으로만 답변하세요 (다른 텍스트 없이):
• [첫 번째 핵심 요점]
• [두 번째 핵심 요점]
• [세 번째 핵심 요점]"""


def _no_key_bullets() -> list[str]:
    return [
        "GEMINI_API_KEY가 설정되지 않아 AI 요약을 사용할 수 없습니다.",
        "백엔드 디렉터리의 .env 파일에 GEMINI_API_KEY를 입력해주세요.",
        "키 설정 후 서버를 재시작하면 AI 요약 기능이 자동으로 활성화됩니다.",
    ]


def _call_gemini(title: str, text: str) -> list[str]:
    """Synchronous Gemini call — executed via asyncio.to_thread."""
    if not GEMINI_API_KEY:
        return _no_key_bullets()

    try:
        import google.generativeai as genai  # noqa: PLC0415

        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-3.1-flash-lite")
        response = model.generate_content(
            _PROMPT_TEMPLATE.format(title=title, text=text)
        )
        bullets = [
            line.strip().lstrip("•").strip()
            for line in response.text.strip().splitlines()
            if line.strip().startswith("•")
        ]
        while len(bullets) < 3:
            bullets.append("추가 정보를 불러오지 못했습니다.")
        return bullets[:3]
    except ImportError:
        return [
            "google-generativeai 패키지가 설치되지 않았습니다.",
            "'pip install google-generativeai'를 실행한 뒤 서버를 재시작해주세요.",
            "이후 자동으로 AI 요약이 활성화됩니다.",
        ]
    except Exception as exc:  # noqa: BLE001
        return [
            f"Gemini API 오류: {exc}",
            "API 키가 올바른지 확인해주세요.",
            "문제가 지속되면 Google AI Studio에서 키를 재발급 받으세요.",
        ]


async def summarize_policy(bill_id: str, title: str, raw_text: str) -> list[str]:
    """Return 3-bullet Korean summary (cached per bill_id)."""
    if bill_id in _cache:
        return _cache[bill_id]
    result = await asyncio.to_thread(_call_gemini, title, raw_text)
    _cache[bill_id] = result
    return result


# ── Category classification ──────────────────────────────────────────────────

_CLASSIFY_PROMPT = """\
다음은 한국 국회에 발의된 법안 제목 목록입니다.
각 법안을 아래 8개 카테고리 중 하나로 분류해주세요. 명확히 해당하지 않으면 "기타" 라고 답하세요.

[카테고리]
청년 / 교육 / 경제 / 복지 / 환경 / 주거 / 고용 / 보건 / 기타

[법안 목록]
{items}

[출력 형식]
번호. 카테고리   (예: 1. 교육)
다른 텍스트 없이, 각 법안마다 한 줄씩, 입력된 순서대로 출력하세요.
"""


def _classify_sync(titles: list[str]) -> list[str]:
    """Synchronous batch classification — executed via asyncio.to_thread."""
    if not GEMINI_API_KEY or not titles:
        return [UNCATEGORIZED] * len(titles)

    valid = set(APP_CATEGORIES + [UNCATEGORIZED])

    try:
        import google.generativeai as genai  # noqa: PLC0415

        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-3.1-flash-lite")

        items = "\n".join(f"{i + 1}. {t}" for i, t in enumerate(titles))
        response = model.generate_content(_CLASSIFY_PROMPT.format(items=items))
        raw = (response.text or "").strip()

        results = [UNCATEGORIZED] * len(titles)
        # 각 줄에서 "1. 카테고리" 패턴 매칭
        for line in raw.splitlines():
            m = re.match(r"\s*(\d+)\s*[\.\)\:\-]\s*(.+?)\s*$", line)
            if not m:
                continue
            idx = int(m.group(1)) - 1
            cat = m.group(2).strip()
            # 카테고리 이름이 응답에 부분 포함된 경우도 허용 (예: "교육 분야")
            chosen = next((c for c in valid if c == cat), None)
            if chosen is None:
                chosen = next((c for c in valid if c in cat), None)
            if chosen and 0 <= idx < len(titles):
                results[idx] = chosen
        return results
    except Exception:  # noqa: BLE001
        # 모든 예외에서 fail-open: 모두 '기타'로 처리
        return [UNCATEGORIZED] * len(titles)


async def classify_bills_batch(titles: list[str]) -> list[str]:
    """
    여러 법안 제목을 한 번의 Gemini 호출로 분류.
    Returns 동일 길이의 카테고리 리스트. 실패 시 모두 '기타'.
    """
    if not titles:
        return []
    return await asyncio.to_thread(_classify_sync, titles)


# ── Detailed bill analysis (description / pros / cons / etc.) ────────────────

import json  # noqa: E402


_ANALYZE_PROMPT = """\
다음 한국 국회 법안에 대해 대학생이 이해할 수 있도록 상세 분석을 작성해주세요.

법안 제목: {title}
추가 정보: {extra}

아래 JSON 형식으로만 답변하세요. 다른 텍스트(설명, 마크다운 코드블럭 등) 없이 순수 JSON만 출력하세요.

{{
  "description": "정책의 배경과 취지를 3-4문장으로 객관적으로 서술",
  "key_points": ["핵심 조항 1", "핵심 조항 2", "핵심 조항 3", "핵심 조항 4"],
  "pros": ["찬성 논거 1", "찬성 논거 2", "찬성 논거 3"],
  "cons": ["반대 논거 1", "반대 논거 2", "반대 논거 3"],
  "expected_impact": "예상되는 사회적·경제적 영향을 2-3문장으로 서술"
}}

작성 가이드:
- 각 항목은 구체적이고 객관적으로 작성 (감정적 표현, 특정 정당 비방 금지)
- 찬성·반대 논거는 균형있게 반영
- 법안 제목으로부터 합리적으로 추론 가능한 내용 위주로 작성
- 추정이 어려운 부분은 해당 분야의 일반적 정책 분석 관점에서 작성
- 모든 문장은 한국어로 작성
"""


def _extract_json(text: str) -> dict | None:
    """Gemini 응답에서 JSON 객체를 강건하게 추출."""
    # 1) Markdown 코드 펜스 제거
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.MULTILINE)
    # 2) 전체가 JSON인 경우
    try:
        return json.loads(cleaned)
    except (json.JSONDecodeError, ValueError):
        pass
    # 3) 첫 '{'부터 마지막 '}'까지 잘라서 파싱
    start = cleaned.find("{")
    end   = cleaned.rfind("}")
    if start != -1 and end > start:
        try:
            return json.loads(cleaned[start : end + 1])
        except (json.JSONDecodeError, ValueError):
            pass
    return None


def _generate_with_grounding(model, prompt: str):
    """
    Gemini 2.5 의 Google Search 그라운딩 사용. SDK 버전에 따라 도구 이름이
    'google_search' (2.0+) 또는 'google_search_retrieval' (1.5) 일 수 있어
    순차 시도하고, 모두 거부되면 그라운딩 없이 호출합니다.
    """
    last_err: Exception | None = None
    for tools_arg in ("google_search", "google_search_retrieval"):
        try:
            return model.generate_content(prompt, tools=tools_arg)
        except Exception as e:  # noqa: BLE001 — SDK 버전별 시그니처 다양함
            last_err = e
            continue
    # 그라운딩 미지원 시 일반 호출
    try:
        return model.generate_content(prompt)
    except Exception:  # noqa: BLE001
        if last_err:
            raise last_err
        raise


def _analyze_sync(title: str, extra: str) -> dict | None:
    if not GEMINI_API_KEY:
        return None
    try:
        import google.generativeai as genai  # noqa: PLC0415

        genai.configure(api_key=GEMINI_API_KEY)
        # 법안 분석은 사실 기반 응답이 중요하므로 Gemini 2.5 + Google Search 그라운딩 사용.
        # 다른 함수(요약/분류/독성)는 빠른 gemini-3.1-flash-lite 유지.
        model = genai.GenerativeModel("gemini-2.5-flash")
        prompt = _ANALYZE_PROMPT.format(title=title, extra=extra or "(추가 정보 없음)")

        response = _generate_with_grounding(model, prompt)
        parsed = _extract_json(response.text or "")
        if not isinstance(parsed, dict):
            return None

        # 필드 정규화
        def _ensure_str(v: object, fallback: str = "") -> str:
            return v.strip() if isinstance(v, str) else fallback

        def _ensure_list(v: object) -> list[str]:
            if not isinstance(v, list):
                return []
            return [str(x).strip() for x in v if isinstance(x, (str, int, float)) and str(x).strip()]

        return {
            "description":     _ensure_str(parsed.get("description")),
            "key_points":      _ensure_list(parsed.get("key_points")),
            "pros":            _ensure_list(parsed.get("pros")),
            "cons":            _ensure_list(parsed.get("cons")),
            "expected_impact": _ensure_str(parsed.get("expected_impact")),
        }
    except Exception:  # noqa: BLE001
        return None


async def analyze_bill_detail(title: str, extra: str = "") -> dict | None:
    """
    법안 제목(+추가 정보)을 Gemini로 분석하여 상세 정보를 생성.
    Returns: {description, key_points, pros, cons, expected_impact} 또는 None (실패).
    """
    return await asyncio.to_thread(_analyze_sync, title, extra)

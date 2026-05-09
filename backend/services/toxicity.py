"""
Gemini-powered toxicity filter.
Fail-open: returns is_toxic=False when the API key is absent or on any error,
so posts are never blocked due to infrastructure issues.
"""
import asyncio
import json
import os
import re

from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# The braces inside the prompt are doubled so .format() works correctly.
_PROMPT = """\
아래 텍스트가 청년 정책 토론 게시판에 적합한지 분석하세요.

다음 중 하나라도 해당되면 {{"is_toxic": true}}를 반환하세요:
- 특정인·집단에 대한 인신공격이나 무분별한 비하 표현
- 논리 없이 감정적으로만 공격하는 내용 (예: "XX들은 다 쓸모없어")
- 성별·지역·세대 혐오 표현
- 욕설 또는 저속한 표현
- 건설적 토론이 불가능한 극단적 비방

건설적인 비판, 논리적 반론, 사실 기반 의견은 {{"is_toxic": false}}입니다.

텍스트: "{text}"

반드시 JSON만 반환하세요: {{"is_toxic": true}} 또는 {{"is_toxic": false}}"""


def _run_sync(text: str) -> bool:
    """Synchronous toxicity check — executed in a thread pool."""
    if not GEMINI_API_KEY:
        return False  # fail-open: no key → allow

    try:
        import google.generativeai as genai  # noqa: PLC0415

        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-3.1-flash-lite")
        response = model.generate_content(_PROMPT.format(text=text[:1500]))
        raw = response.text.strip()

        # Robust JSON extraction — handles extra prose around the JSON
        match = re.search(
            r'\{[^}]*"is_toxic"\s*:\s*(true|false)[^}]*\}',
            raw,
            re.IGNORECASE,
        )
        if match:
            return bool(json.loads(match.group())["is_toxic"])
        return False
    except Exception:  # noqa: BLE001
        return False  # fail-open: API errors never block users


async def is_toxic(text: str) -> bool:
    """Async wrapper. Returns True if text is toxic/non-constructive."""
    return await asyncio.to_thread(_run_sync, text)

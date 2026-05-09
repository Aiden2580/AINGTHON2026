# Agora 🇰🇷

**국내 유일 대학생 정책 토론 플랫폼.**
한국 대학생들이 신원이 검증된 환경에서 시민 의식을 갖고 정책에 대해 토론할 수 있도록 설계된 웹앱입니다.

> **Stack:** Expo (React Native) + FastAPI + SQLite + Google Gemini

---

## ✨ 주요 기능

| 탭 | 기능 |
|---|---|
| 🏠 **홈** | 다가오는 선거 일정 가로 스크롤, 관심 분야 핀, 인기 토론 TOP 3 |
| 💬 **토론** | 지역·연령·카테고리 필터, Reddit 스타일 중첩 댓글, 추천/비추천, **Gemini 독성 필터** |
| 📰 **정보** | 8개 카테고리 정책 피드, **Gemini AI 3줄 요약** |
| 👤 **마이페이지** | 프로필 카드, Lv1–5 게이미피케이션, 10개 뱃지, 활동 기록, 다크모드 |

### 핵심 차별점

- **반(半)실명제** — `김민준` → `김G**` (검증 배지로 신뢰도 확보, 사생활은 보호)
- **AI 독성 필터** — Gemini가 게시 전에 인신공격·감정적 표현·혐오를 차단
- **JWT 인증** — 학교 이메일 기반 회원가입, bcrypt 비밀번호 해싱
- **로컬 우선** — SQLite + 시드 데이터로 인터넷 없이도 풀 기능 동작 (Gemini 호출만 외부 통신)

---

## 🛠 기술 스택

### Backend
- **FastAPI** 0.115 + **SQLAlchemy** 2.0 (sync ORM)
- **SQLite** (개발/데모) — `DATABASE_URL` 변경만으로 PostgreSQL 전환
- **JWT** (python-jose) + **bcrypt** (passlib)
- **GCP API** — 정책 요약 + 독성 분류기

### Frontend
- **Expo SDK 54** + **expo-router** (파일 기반 라우팅)
- **NativeWind v4** (Tailwind CSS for React Native)
- **AsyncStorage** — JWT 토큰, 관심 분야, 다크모드 플래그 영속화

---

## 📁 프로젝트 구조

```
Agora/
├── backend/
│   ├── main.py                  # FastAPI 진입점 + 시작 시 시드
│   ├── database.py              # SQLAlchemy 엔진 / 세션
│   ├── auth_utils.py            # JWT, bcrypt, 마스킹
│   ├── seed.py                  # 첫 실행 시 데모 데이터 (사용자/토론/법안/선거/뉴스)
│   ├── models/
│   │   ├── orm.py               # User · Debate · Comment · Vote · Bill · ElectionEvent · NewsArticle
│   │   └── schemas.py           # Pydantic 응답/요청 스키마
│   ├── routers/
│   │   ├── auth.py              # POST /auth/register · /auth/login
│   │   ├── debates.py           # 토론 CRUD + 중첩 댓글 + 투표
│   │   ├── users.py             # /users/me · /me/level · /me/badges · /me/history
│   │   ├── policies.py          # 법안 목록 + Gemini 요약
│   │   ├── elections.py         # 선거 일정
│   │   └── news.py              # 뉴스 브리핑
│   ├── services/
│   │   ├── gemini.py            # 정책 요약 (3-bullet)
│   │   └── toxicity.py          # 독성 분류 (fail-open)
│   ├── requirements.txt
│   ├── Procfile                 # 배포용
│   └── .env.example
│
└── frontend/
    ├── app/
    │   ├── _layout.tsx          # AuthProvider + UserPreferencesProvider
    │   ├── (auth)/
    │   │   ├── login.tsx
    │   │   └── register.tsx
    │   ├── (tabs)/
    │   │   ├── _layout.tsx      # 4탭 + 인증 가드
    │   │   ├── index.tsx        # 홈
    │   │   ├── debate.tsx       # 토론
    │   │   ├── information.tsx  # 정보
    │   │   └── mypage.tsx       # 마이페이지
    │   └── thread/[id].tsx      # 스레드 상세
    ├── contexts/
    │   ├── AuthContext.tsx
    │   └── UserPreferencesContext.tsx
    ├── constants/api.ts         # apiFetch — 자동 Bearer 토큰 첨부
    ├── package.json
    └── .env.example
```

---

## 🚀 로컬 실행

### 사전 준비

- **Python** 3.10+
- **Node.js** 18+
- **Google Gemini API 키** (선택 — 없으면 AI 기능만 비활성)
  - 무료 발급: https://aistudio.google.com/app/apikey

---

### 1️⃣ Backend 실행

```bash
cd backend
python -m venv venv

# Windows PowerShell
venv\Scripts\Activate.ps1
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

**환경변수 설정:**

```bash
cp .env.example .env          # macOS / Linux
copy .env.example .env        # Windows
```

`.env` 편집:

```env
GEMINI_API_KEY=AIzaSy...your_key_here
JWT_SECRET_KEY=change-me-to-a-long-random-string
```

JWT 비밀키 생성:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

**서버 시작:**

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

첫 실행 시 자동으로:
- `aingthon.db` SQLite 파일 생성
- 모든 테이블 생성
- 시드 데이터 입력 (사용자 7명, 토론 7건, 댓글 5건, 법안 8건, 선거 5건, 뉴스 2건)

확인: http://localhost:8000/docs (Swagger UI)

---

### 2️⃣ Frontend 실행

```bash
cd frontend
npm install
```

**(선택) `.env` 설정** — 실기기에서 백엔드에 접근하려면:

```bash
cp .env.example .env
```

`.env` 편집 — 자신의 LAN IP로 변경:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.42:8000
```

> Android 에뮬레이터는 `10.0.2.2`, iOS 시뮬레이터는 `localhost`가 자동 사용되므로 `.env` 불필요.

**Expo 시작:**

```bash
npx expo start
```

터미널 단축키:
- `a` — Android 에뮬레이터
- `i` — iOS 시뮬레이터 (macOS)
- `w` — 웹 브라우저
- 실기기: **Expo Go** 앱에서 QR 스캔 (다른 네트워크면 `npx expo start --tunnel`)

---

## 🔐 데모 계정

`seed.py`가 7명의 데모 사용자를 자동 생성합니다 (모두 비밀번호 `demo1234`):

| 이메일 | 학교 | 표시 이름 |
|---|---|---|
| `kim@yonsei.ac.kr` | 연세대 | 김G** |
| `lee@korea.ac.kr` | 고려대 | 이S** |
| `park@snu.ac.kr` | 서울대 | 박J** |
| `choi@pusan.ac.kr` | 부산대 | 최H** |
| `jung@jnu.ac.kr` | 전남대 | 정M** |
| `hong@inha.ac.kr` | 인하대 | 홍W** |
| `kang@ajou.ac.kr` | 아주대 | 강D** |

또는 회원가입 화면에서 새 계정을 만들 수도 있습니다.

---

## 📡 API 개요

| 메서드 | 경로 | 설명 | 인증 |
|---|---|---|---|
| POST | `/auth/register` | 회원가입 | – |
| POST | `/auth/login` | 로그인 | – |
| GET | `/users/me` | 내 프로필 | ✅ |
| GET | `/users/me/level` | 레벨·XP·로드맵 | ✅ |
| GET | `/users/me/badges` | 뱃지 목록 | ✅ |
| GET | `/users/me/history` | 참여 기록 | ✅ |
| GET | `/debates` | 토론 목록 (필터) | – |
| GET | `/debates/trending` | 인기 TOP N | – |
| POST | `/debates` | 토론 작성 (독성 검사) | ✅ |
| GET | `/debates/{id}` | 토론 상세 + 중첩 댓글 | – |
| POST | `/debates/{id}/vote?direction=up\|down` | 토론 투표 | ✅ |
| POST | `/debates/{id}/comments` | 댓글 작성 (독성 검사) | ✅ |
| POST | `/debates/{id}/comments/{cid}/vote` | 댓글 추천 | ✅ |
| GET | `/policies` | 법안 목록 | – |
| POST | `/policies/{id}/summarize` | Gemini 3줄 요약 | – |
| GET | `/elections` | 선거 일정 | – |
| GET | `/news` | 뉴스 목록 | – |

**상세 스키마:** 백엔드 실행 후 http://localhost:8000/docs

---

## 🌗 환경변수 정리

### Backend (`backend/.env`)
| 변수 | 필수 | 설명 |
|---|---|---|
| `GEMINI_API_KEY` | 권장 | Gemini API 키. 미설정 시 AI 요약/독성 검사가 fail-open으로 비활성 |
| `JWT_SECRET_KEY` | ⚠️ 필수 (운영) | JWT 서명 비밀키. 32자 이상 권장 |
| `DATABASE_URL` | – | 기본 `sqlite:///./aingthon.db`. PostgreSQL 사용 시 `postgresql://...` |

### Frontend (`frontend/.env`)
| 변수 | 필수 | 설명 |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | – | 미설정 시 자동: 안드로이드=`10.0.2.2:8000`, 그 외=`localhost:8000` |

---

## 🐞 트러블슈팅

**❓ 로그인 직후 다시 로그인 화면으로 돌아갑니다**
JWT 토큰이 저장되지 않은 상태입니다. AsyncStorage 권한 또는 백엔드 응답을 확인하세요.

**❓ 실기기에서 "연결에 실패했습니다"가 나옵니다**
같은 WiFi인지 확인 후 `frontend/.env`의 `EXPO_PUBLIC_API_URL`에 PC LAN IP를 입력하세요.
또는 `npx expo start --tunnel`로 시작하면 다른 네트워크에서도 접속 가능합니다.

**❓ Gemini 요약이 "GEMINI_API_KEY가 설정되지 않아…"라고 나옵니다**
`backend/.env`의 `GEMINI_API_KEY`를 입력하고 백엔드를 재시작하세요.

**❓ DB를 초기화하고 싶습니다**
백엔드 종료 후 `backend/aingthon.db`를 삭제하고 다시 시작하면 시드가 재실행됩니다.

---

## 📜 라이선스

MIT

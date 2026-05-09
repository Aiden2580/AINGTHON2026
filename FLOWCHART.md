# Agora — 서비스 플로우차트

> 청년 정책 토론 플랫폼 **Agora** 의 주요 기능 흐름과 데이터 통합을 시각화한 문서입니다.
> 모든 다이어그램은 [Mermaid](https://mermaid.js.org/) 문법으로 작성되어 GitHub에서 자동 렌더링됩니다.

---

## 1. 전체 시스템 아키텍처

```mermaid
flowchart LR
    subgraph Client["📱 Frontend (Expo · React Native)"]
        UI[Tabs: Home / Debate / Info / MyPage]
        AuthCtx[(AuthContext<br/>JWT in AsyncStorage)]
        PrefsCtx[(UserPreferencesContext<br/>홈 위젯·관심분야·다크모드)]
    end

    subgraph Server["🐍 Backend (FastAPI · SQLAlchemy)"]
        Routes[Routers<br/>/auth · /debates · /policies<br/>/users · /elections · /news]
        Services[Services<br/>Gemini · Toxicity · Assembly · Korea-Briefing]
        DB[(SQLite<br/>aingthon.db)]
    end

    subgraph External["🌐 External APIs"]
        Gemini[Google Gemini AI<br/>2.5-flash + 3.1-flash-lite]
        Assembly[국회 의안정보 통합 API<br/>open.assembly.go.kr]
        KoreaKr[정책브리핑<br/>korea.kr]
    end

    UI -->|"apiFetch + Bearer JWT"| Routes
    Routes <--> Services
    Routes <--> DB
    Services -->|"분류·요약·분석·독성"| Gemini
    Services -->|"법안 메타데이터 + 카테고리"| Assembly
    Services -->|"보도자료 스크래핑 + 30분 캐시"| KoreaKr
    AuthCtx -.인증 토큰.-> UI
    PrefsCtx -.사용자 설정.-> UI
```

---

## 2. 인증 & 라우팅 게이트

```mermaid
flowchart TD
    Start([앱 시작]) --> LoadCtx[AuthContext 로드<br/>AsyncStorage 에서 JWT 조회]
    LoadCtx --> HasToken{"토큰 존재?"}

    HasToken -->|No| Login["/(auth)/login<br/>이메일·비밀번호 입력"]
    HasToken -->|Yes| Tabs["/(tabs)<br/>4탭 메인"]

    Login -->|"가입하기"| Register["/(auth)/register<br/>실명 · 학교 · 전공 · 연령대"]
    Login -->|"로그인 성공"| StoreToken[AsyncStorage 에 JWT 저장]
    Register -->|"회원가입 성공"| StoreToken
    StoreToken --> Tabs

    Tabs --> Home["🏠 홈"]
    Tabs --> Debate["💬 토론"]
    Tabs --> Info["📰 정보"]
    Tabs --> MyPage["👤 마이페이지"]

    MyPage -->|"로그아웃"| ClearToken[AsyncStorage 에서 토큰 제거]
    ClearToken --> Login

    style Login fill:#dbeafe,stroke:#2563eb
    style Register fill:#dbeafe,stroke:#2563eb
    style Tabs fill:#dcfce7,stroke:#16a34a
```

---

## 3. 홈 탭 — 위젯 커스터마이즈

```mermaid
flowchart TD
    Open([홈 탭 진입]) --> Parallel[4개 API 병렬 fetch]
    Parallel --> E["/elections<br/>선거 일정"]
    Parallel --> T["/debates/trending<br/>인기 토론 TOP 3"]
    Parallel --> B["/policies?<br/>주요 법안 (최신 4)"]
    Parallel --> A["/news/announcements<br/>정부 발표 (15초 timeout)"]

    A --> KoreaKr{30분 캐시 hit?}
    KoreaKr -->|Yes| ReturnCache[캐시 반환]
    KoreaKr -->|No| Scrape[korea.kr 라이브 스크래핑]
    Scrape --> Parse[정규식으로<br/>title · ministry · date 추출]
    Parse --> Save[캐시 저장 + 반환]

    E --> Render[홈 화면 렌더]
    T --> Render
    B --> Render
    ReturnCache --> Render
    Save --> Render

    Render --> Pinned[📌 관심 분야 칩]
    Render --> Widgets{homeWidgets 토글 확인}

    Widgets -->|announcements ✓| AnnStrip[📢 정부 발표<br/>vertical auto-scroll<br/>220px 고정 높이]
    Widgets -->|elections ✓| ElStrip[🗓 선거 일정<br/>horizontal auto-scroll<br/>~2 카드 노출]
    Widgets -->|trending ✓| TList[🔥 인기 토론 TOP 3]
    Widgets -->|bills ✓| BList[📑 주요 법안 4건]

    Open -->|"⚙️ Customize"| Modal[맞춤 설정 모달]
    Modal -->|"Switch 토글"| Persist[(AsyncStorage<br/>@aingthon_home_widgets)]
    Persist -.리렌더.-> Widgets
```

---

## 4. 토론 작성 — Gemini 독성 필터 게이트

```mermaid
flowchart TD
    User([사용자: 글쓰기 클릭]) --> Modal[새 토론 작성 모달]
    Modal --> Fill[제목 · 본문 · 카테고리 · 지역 입력]
    Fill --> Submit{유효성 검사}
    Submit -->|"빈 입력"| BlockEmpty[작성 버튼 비활성]
    Submit -->|"OK"| POST["POST /debates<br/>+ 선택적 bill_id"]

    POST --> Tox{"Gemini 독성 분류기<br/>gemini-3.1-flash-lite"}
    Tox -->|"is_toxic = true"| Block422["422 에러<br/>+ 거부 사유 메시지"]
    Tox -->|"is_toxic = false"| Insert[(DB: debates 테이블<br/>insert)]

    Block422 --> Banner[모달 상단에<br/>빨간 안내 배너 표시]
    Banner -.사용자가 수정.-> Fill

    Insert --> Return[새 토론 객체 반환]
    Return --> CloseModal[모달 닫기]
    CloseModal --> Prepend[목록 맨 위에 추가]

    style Tox fill:#fef3c7,stroke:#d97706
    style Block422 fill:#fee2e2,stroke:#dc2626
    style Insert fill:#dcfce7,stroke:#16a34a
```

---

## 5. 정보 탭 — 정부 데이터 동기화 + 자동 카테고리 분류

```mermaid
flowchart TD
    User([사용자: '🔄 정부 데이터' 클릭]) --> Refresh["POST /policies/refresh"]

    Refresh --> Fetch[국회 의안정보 통합 API 호출<br/>TVBPMBILL11<br/>+ KEY · Type=json · AGE=22]
    Fetch --> ParseRows["응답 파싱 → row 배열<br/>(BILL_ID, BILL_NAME, PROPOSE_DT,<br/>PROPOSER_KIND, LINK_URL ...)"]

    ParseRows --> Build[1차 패스: 메타데이터만 빌드<br/>category = '기타']

    Build --> Classify{"Gemini 일괄 분류<br/>gemini-3.1-flash-lite"}
    Classify -->|"성공"| Apply[각 법안에 카테고리 적용<br/>청년/교육/경제/복지/환경/주거/고용/보건]
    Classify -->|"기타 반환"| Keyword[키워드 매칭 fallback]
    Keyword -->|매치| ApplyKw[키워드 카테고리 적용]
    Keyword -->|매치 실패| Stay기타[category = '기타' 유지]

    Apply --> Upsert
    ApplyKw --> Upsert
    Stay기타 --> Upsert

    Upsert{"DB upsert"}
    Upsert -->|"존재 ID"| Update[메타만 업데이트<br/>AI 큐레이션 필드는 보존]
    Upsert -->|"신규 ID"| Insert[추가 + key_points/pros/cons = []]

    Update --> Result[결과 반환<br/>{ inserted, updated, total }]
    Insert --> Result
    Result --> Toast[프론트에 토스트<br/>총 N건 동기화 완료]

    style Classify fill:#fef3c7,stroke:#d97706
    style Upsert fill:#dbeafe,stroke:#2563eb
```

---

## 6. 법안 상세 — 그라운딩 기반 AI 분석

```mermaid
sequenceDiagram
    participant User as 👤 사용자
    participant App as 📱 BillDetail Screen
    participant API as 🐍 /policies/{id}/analyze
    participant Gemini as 🤖 Gemini 2.5-flash
    participant Search as 🔍 Google Search
    participant DB as 🗄️ Bill row

    User->>App: 정보 탭 → 법안 카드 탭
    App->>API: GET /policies/{id}
    API->>DB: 조회
    DB-->>App: 법안 (description = null)
    App->>User: "AI 상세 분석이 아직 없습니다"<br/>+ '생성' 버튼

    User->>App: AI 상세 분석 생성 클릭
    App->>API: POST /policies/{id}/analyze<br/>(timeout 60s)
    API->>Gemini: prompt + tools=google_search
    Gemini->>Search: 법안 관련 사실 검색
    Search-->>Gemini: 검색 결과
    Gemini->>Gemini: 구조화된 JSON 생성<br/>(description, key_points,<br/>pros, cons, expected_impact)
    Gemini-->>API: 응답 (5-30초 소요)
    API->>API: JSON 파싱 + 정규화
    API->>DB: UPDATE description / key_points<br/>/ pros / cons / expected_impact
    API-->>App: 업데이트된 Bill 반환
    App->>User: 풍부한 분석 페이지 렌더<br/>📋 배경 · 📌 핵심조항<br/>⚖️ 찬·반 · 📊 영향
```

---

## 7. 법안 ↔ 토론 크로스 링킹

```mermaid
flowchart LR
    subgraph InfoTab["📰 정보 탭"]
        BillCard[법안 카드]
        BillDetail[법안 상세 화면]
    end

    subgraph DebateTab["💬 토론 탭"]
        DebateList[토론 목록]
        ThreadCard[ThreadCard<br/>+ 관련 법안 칩]
        CreateModal[새 토론 모달<br/>+ 법안 태깅 표시]
    end

    BillCard -->|"💬 토론하기"| CreateModal
    BillDetail -->|"💬 토론하기"| CreateModal
    BillCard -->|"🔍 토론 찾기"| FilteredList[목록 + bill_id 필터<br/>+ '관련 법안' 배너]
    BillDetail -->|"🔍 토론 찾기"| FilteredList

    CreateModal -->|"제출 (bill_id 포함)"| Insert[(debates.bill_id<br/>FK to bills.id)]
    Insert --> ThreadCard

    ThreadCard -->|"📄 관련 법안 칩 클릭"| BillDetail
    FilteredList --> ThreadCard

    style CreateModal fill:#e0e7ff,stroke:#4f46e5
    style FilteredList fill:#e0e7ff,stroke:#4f46e5
```

---

## 8. 마이페이지 — 활동 통계 & 게이미피케이션

```mermaid
flowchart TD
    Enter([마이페이지 진입]) --> Fetch[병렬 fetch]
    Fetch --> Me["/users/me"]
    Fetch --> Lvl["/users/me/level"]
    Fetch --> Bdg["/users/me/badges"]
    Fetch --> Hist["/users/me/history?limit=50"]

    Lvl --> Calc["XP = threads×30 + comments×10 + upvotes×3<br/>레벨 = thresholds 매핑"]
    Calc --> Render[프로필 카드 + 레벨 + XP 바<br/>+ 5단계 로드맵]

    Bdg --> BadgeGrid[10개 뱃지 그리드<br/>잠김/해금]
    Hist --> HistList[참여 기록 (최대 50건)<br/>+ 토론/댓글 필터 칩]

    Render --> StatGrid[4-stat 그리드<br/>토론/공감/댓글/주간]

    StatGrid -->|"📝 작성 토론 탭"| ListThreads["/profile/activities?type=thread<br/>토론만 필터링된 전체 목록"]
    StatGrid -->|"💬 댓글 탭"| ListComments["/profile/activities?type=comment<br/>댓글만 필터링된 전체 목록"]
    HistList -->|"항목 클릭"| Thread["/thread/{id}"]
    ListThreads -->|"항목 클릭"| Thread
    ListComments -->|"항목 클릭"| Thread

    Render -->|"편집 버튼"| EditModal[프로필 편집 모달]
    EditModal -->|"저장"| Patch["PATCH /users/me<br/>학교·전공·연령대 수정"]
    Patch --> Render
```

---

## 9. 토론 스레드 상세 — 중첩 댓글

```mermaid
flowchart TD
    Open([스레드 카드 클릭]) --> Detail["GET /debates/{id}<br/>→ ThreadDetailResponse"]
    Detail --> Render[스레드 본문 렌더<br/>+ 댓글 트리]

    Render --> Vote[추천/비추천 버튼]
    Vote -->|"클릭"| OptUpdate[로컬 optimistic 업데이트]
    OptUpdate --> POST["POST /debates/{id}/vote?direction=up|down"]
    POST --> VoteTbl[(votes 테이블<br/>UNIQUE user_id, target)]
    VoteTbl -->|"같은 방향 재투표"| Toggle[토글 off]
    VoteTbl -->|"반대 방향"| Flip[방향 변경]
    VoteTbl -->|"신규"| Insert[insert]

    Render --> Compose[댓글 입력창<br/>+ 답글 컨텍스트]
    Compose --> Submit["POST /debates/{id}/comments<br/>+ parent_id"]
    Submit --> ToxC{독성 검사}
    ToxC -->|"toxic"| Reject[빨간 배너로 거부]
    ToxC -->|"clean"| InsertC[(comments insert<br/>+ comment_count 증가)]
    InsertC --> ReRender[댓글 트리 갱신]
    Reject -.수정.-> Compose

    style ToxC fill:#fef3c7,stroke:#d97706
    style Reject fill:#fee2e2,stroke:#dc2626
```

---

## 10. 외부 API 호출 요약

| 외부 서비스 | 용도 | 호출 위치 | 캐싱 전략 |
|---|---|---|---|
| **Google Gemini 3.1-flash-lite** | 법안 3-bullet 요약, 카테고리 분류, 댓글/글 독성 검사 | `services/gemini.py`, `services/toxicity.py` | bill_id 별 in-memory cache (요약) |
| **Google Gemini 2.5-flash + Search Grounding** | 법안 상세 분석 (description / key_points / pros / cons / expected_impact) | `_analyze_sync` | DB 영구 저장 (description 존재 시 skip) |
| **국회 의안정보 통합 API (TVBPMBILL11)** | 법안 메타데이터 동기화 | `services/assembly.py` | DB upsert (큐레이션 필드 보존) |
| **정책브리핑 (korea.kr)** | 최신 정부 발표 (보도자료) | `services/korea_briefing.py` | 30분 in-memory cache |

---

## 11. 영속성 (AsyncStorage 키)

```mermaid
flowchart LR
    A["@aingthon_token"] -.JWT 인증 토큰.-> AuthGate
    B["@aingthon_user_id"] -.현재 사용자 ID.-> AuthGate
    C["@aingthon_pinned_categories"] -.정보 탭 관심 분야.-> InfoTab
    D["@aingthon_theme"] -.다크모드 플래그.-> MyPage
    E["@aingthon_home_widgets"] -.위젯 표시 토글.-> Home

    AuthGate[(AuthContext)]
    InfoTab[(UserPreferencesContext)]
    MyPage[(UserPreferencesContext)]
    Home[(UserPreferencesContext)]
```

---

## 12. DB 엔티티 관계

```mermaid
erDiagram
    User ||--o{ Debate : "writes"
    User ||--o{ Comment : "writes"
    User ||--o{ Vote : "casts"
    Debate ||--o{ Comment : "has"
    Comment ||--o| Comment : "replies to"
    Debate }o--o| Bill : "tagged to"

    User {
        int id PK
        string email UK
        string name
        string display_name "김G** style"
        string university
        string major
        string age_group
        string password_hash "bcrypt"
        datetime created_at
    }

    Debate {
        int id PK
        string title
        text body
        string category
        string region
        int author_id FK
        string bill_id FK "nullable"
        int upvotes
        int downvotes
        int comment_count
        datetime created_at
    }

    Comment {
        int id PK
        int debate_id FK
        int author_id FK
        int parent_id FK "nullable, self-ref"
        text body
        int upvotes
        datetime created_at
    }

    Vote {
        int id PK
        int user_id FK
        string target_type "debate|comment"
        int target_id
        string direction "up|down"
    }

    Bill {
        string id PK
        string bill_no
        string title
        string category "AI 분류"
        string proposer
        string status
        text raw_text
        text description "AI 분석"
        json key_points "AI 분석"
        json pros "AI 분석"
        json cons "AI 분석"
        text expected_impact "AI 분석"
    }

    ElectionEvent {
        string id PK
        string name
        string date
        string type
    }

    NewsArticle {
        int id PK
        string title
        text summary
        string category
    }
```

---

## 13. 핵심 사용자 여정 — 처음 사용 시나리오

```mermaid
journey
    title 신규 청년 사용자의 첫 30분
    section 가입
      회원가입 (학교·전공·연령): 5: 사용자
      자동 마스킹된 표시 이름 부여: 5: 시스템
    section 정보 탐색
      관심 분야 핀(청년·교육): 5: 사용자
      주요 법안 카드 진입: 4: 사용자
      AI 상세 분석 생성 (Gemini 2.5 + 검색): 5: 시스템
      찬성·반대 논거 읽기: 5: 사용자
    section 토론 참여
      "토론하기" 버튼 클릭: 5: 사용자
      법안 태깅된 채로 의견 작성: 5: 사용자
      Gemini 독성 검사 통과: 4: 시스템
      게시 → 댓글 받기: 5: 사용자
    section 보상
      마이페이지에서 +XP 확인: 5: 사용자
      "첫 토론" 뱃지 해금: 5: 시스템
      참여 기록에서 내 글 클릭 → 다시 보기: 4: 사용자
```

---

## 14. 로컬 실행 흐름

```mermaid
flowchart LR
    Start([git clone]) --> Backend[backend/]
    Start --> Frontend[frontend/]

    Backend --> Venv["python -m venv venv<br/>+ pip install"]
    Venv --> EnvB[".env 작성<br/>GEMINI_API_KEY · OPENAPI_KEY · JWT_SECRET_KEY"]
    EnvB --> Run["uvicorn main:app --reload --host 0.0.0.0 --port 8000"]
    Run --> Seed[자동 시드<br/>users · debates · bills · elections · news]

    Frontend --> NPM["npm install"]
    NPM --> EnvF["(선택) .env<br/>EXPO_PUBLIC_API_URL"]
    EnvF --> Expo["npx expo start"]
    Expo --> Device[Expo Go 앱<br/>또는 시뮬레이터]

    Seed -.JSON over HTTP.-> Device

    style Run fill:#dcfce7,stroke:#16a34a
    style Expo fill:#dcfce7,stroke:#16a34a
```

---

> **작성일**: 2026-05-10
> **앱 버전**: Agora v0.3 (백엔드) · 1.0.0 (Expo)
> 모든 다이어그램은 GitHub README 미리보기에서 자동 렌더링됩니다.

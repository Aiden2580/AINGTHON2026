"""
Initial demo data — runs on every startup, but only seeds tables that are empty.
Seeded users can log in with password: demo1234
"""
from datetime import datetime
from sqlalchemy.orm import Session

from auth_utils import hash_password, mask_name
from models.orm import (
    Bill,
    Comment,
    Debate,
    ElectionEvent,
    NewsArticle,
    User,
)

_PW = hash_password("demo1234")

# ── Users + Debates + Comments ────────────────────────────────────────────────

_USERS = [
    {"name": "김민준", "email": "kim@yonsei.ac.kr",  "university": "연세대", "major": "정치외교학과",  "age_group": "20대"},
    {"name": "이수아", "email": "lee@korea.ac.kr",   "university": "고려대", "major": "경제학과",      "age_group": "20대"},
    {"name": "박준호", "email": "park@snu.ac.kr",    "university": "서울대", "major": "공학부",        "age_group": "20대"},
    {"name": "최하은", "email": "choi@pusan.ac.kr",  "university": "부산대", "major": "경영학부",      "age_group": "30대"},
    {"name": "정민아", "email": "jung@jnu.ac.kr",    "university": "전남대", "major": "사범대",        "age_group": "20대"},
    {"name": "홍우진", "email": "hong@inha.ac.kr",   "university": "인하대", "major": "건축학과",      "age_group": "20대"},
    {"name": "강다인", "email": "kang@ajou.ac.kr",   "university": "아주대", "major": "소프트웨어학과", "age_group": "20대"},
]

_DEBATES = [
    {
        "ui": 0, "category": "교육", "region": "서울", "bill_id": "2",
        "upvotes": 312, "downvotes": 45, "comment_count": 3,
        "created_at": datetime(2026, 5, 9, 9, 0),
        "title": "수능 절대평가 전환, 대학 입시 공정성에 영향을 줄까요?",
        "body": (
            "교육부가 수능 절대평가 전환을 검토 중입니다. "
            "현행 상대평가는 점수 인플레를 막지만 극심한 경쟁을 유발하고, "
            "절대평가는 학업 부담을 줄이지만 대학 변별력 문제가 생깁니다. "
            "대학생으로서 직접 수능을 경험한 여러분의 생각을 나눠주세요."
        ),
    },
    {
        "ui": 1, "category": "청년", "region": "경기", "bill_id": "1",
        "upvotes": 287, "downvotes": 92, "comment_count": 2,
        "created_at": datetime(2026, 5, 9, 6, 0),
        "title": "청년 기본소득 월 50만원, 현실적으로 가능한가?",
        "body": (
            "일부 정당에서 청년 기본소득 정책을 공약으로 내세우고 있습니다. "
            "재원 마련 방법과 실효성, 부작용에 대한 여러분의 생각을 나눠주세요. "
            "핀란드·캐나다 실험 사례도 참고해보면 좋을 것 같습니다."
        ),
    },
    {
        "ui": 2, "category": "보건", "region": "서울", "bill_id": "6",
        "upvotes": 198, "downvotes": 67, "comment_count": 0,
        "created_at": datetime(2026, 5, 8, 18, 0),
        "title": "대학병원 전공의 파업 사태, 의대 증원 정책의 문제점은?",
        "body": (
            "의대 증원을 둘러싼 정부와 의료계의 갈등이 지속되고 있습니다. "
            "의료 접근성 개선과 의사 수급 문제에 대한 균형 잡힌 시각을 공유해요."
        ),
    },
    {
        "ui": 3, "category": "경제", "region": "부산", "bill_id": "4",
        "upvotes": 156, "downvotes": 38, "comment_count": 0,
        "created_at": datetime(2026, 5, 8, 12, 0),
        "title": "최저임금 1만5천원 시대, 자영업자와 알바생 모두를 위한 해결책은?",
        "body": (
            "최저임금 인상이 계속되는 가운데 자영업자와 알바생 모두 어렵다고 합니다. "
            "이 딜레마를 어떻게 풀어야 할까요?"
        ),
    },
    {
        "ui": 4, "category": "교육", "region": "광주", "bill_id": "2",
        "upvotes": 143, "downvotes": 29, "comment_count": 0,
        "created_at": datetime(2026, 5, 7, 20, 0),
        "title": "지방대 소멸 위기, 지역 균형 발전 정책의 해법은?",
        "body": (
            "수도권 집중화로 인한 지방대 위기가 심화되고 있습니다. "
            "정부 정책만으로 해결이 가능할까요? 지방 출신 학생들의 생각도 듣고 싶습니다."
        ),
    },
    {
        "ui": 5, "category": "주거", "region": "인천", "bill_id": "3",
        "upvotes": 98, "downvotes": 12, "comment_count": 0,
        "created_at": datetime(2026, 5, 7, 10, 0),
        "title": "인천 청년 주거 지원 정책, 실제 수혜자 경험을 들어봅시다",
        "body": (
            "인천시에서 시행 중인 청년 전세자금 대출 지원을 실제로 신청해본 분 계신가요? "
            "신청 과정의 어려움과 실효성에 대해 이야기해봐요."
        ),
    },
    {
        "ui": 6, "category": "교통", "region": "경기", "bill_id": None,
        "upvotes": 87, "downvotes": 8, "comment_count": 0,
        "created_at": datetime(2026, 5, 6, 15, 0),
        "title": "수원 대중교통 노선 개편, 대학생 통학길은 더 불편해졌나?",
        "body": (
            "경기도 수원시 버스 노선 대규모 개편 이후 아주대·성균관대 쪽 통학 불편 호소가 많습니다. "
            "개편안의 문제점과 개선 방향을 이야기해봐요."
        ),
    },
]

_COMMENTS = [
    {"di": 0, "ai": 1, "parent_idx": None, "upvotes": 87, "created_at": datetime(2026, 5, 9, 10, 30),
     "body": "절대평가로 전환하면 학생들의 학업 부담이 줄어드는 장점이 있지만, 대학 입장에서 변별력 확보가 어려워집니다. 결국 별도의 대학별 논술·면접 비중이 커져 또 다른 사교육 시장이 형성될 수 있어요."},
    {"di": 0, "ai": 2, "parent_idx": 0,    "upvotes": 34, "created_at": datetime(2026, 5, 9, 11, 0),
     "body": "동의합니다. 프랑스 바칼로레아처럼 논술형 절대평가는 고교 수업 자체를 바꿔야 가능한데, 그 전환 비용이 너무 크죠."},
    {"di": 0, "ai": 0, "parent_idx": None, "upvotes": 56, "created_at": datetime(2026, 5, 9, 12, 0),
     "body": "절대평가의 핵심 문제는 기준점 설정입니다. 어느 기준으로 합격/불합격을 나눌지, 그 기준이 매년 달라질 수 있다는 점에서 오히려 예측 불가능성이 커질 수 있습니다."},
    {"di": 1, "ai": 3, "parent_idx": None, "upvotes": 62, "created_at": datetime(2026, 5, 9, 7, 0),
     "body": "청년 기본소득은 복지 사각지대를 없앨 수 있다는 장점이 있지만, 재원 마련 문제가 가장 큰 허들입니다. GDP의 몇 %가 필요한지 구체적 수치가 공약에 빠져 있어요."},
    {"di": 1, "ai": 0, "parent_idx": 3,    "upvotes": 28, "created_at": datetime(2026, 5, 9, 7, 45),
     "body": "핀란드 실험에서 심리적 안정감 향상 효과는 있었지만 취업률 상승에는 제한적이었죠. 한국 상황에 맞게 조건부 지급 설계가 필요해 보입니다."},
]


# ── Bills (정책·법안) ─────────────────────────────────────────────────────────

_BILLS = [
    {
        "id": "1", "bill_no": "2200234",
        "title": "청년기본법 일부개정법률안", "category": "청년",
        "proposer": "정부", "propose_date": "2026-04-10", "status": "소관위 심사",
        "sponsor_party": "정부 (고용노동부)",
        "related_url": "https://likms.assembly.go.kr/bill/billDetail.do?billId=2200234",
        "raw_text": (
            "청년기본법 일부를 다음과 같이 개정한다. 제14조(청년고용 촉진) "
            "국가와 지방자치단체는 청년고용을 촉진하기 위하여 청년 취업지원 프로그램을 확대하고, "
            "청년 창업 지원을 강화하며, 중소기업 청년 채용 장려금을 현행 월 50만원에서 100만원으로 "
            "상향 조정한다. 공공기관의 청년 채용 의무 비율을 전체 채용의 5%에서 10%로 확대하고, "
            "청년 정책 예산을 국가 예산의 3% 이상으로 의무화한다."
        ),
        "description": (
            "코로나19 이후 청년 실업률이 OECD 평균을 웃도는 9.2%까지 상승하면서, "
            "정부는 청년 고용·창업 지원을 대폭 확대하는 청년기본법 개정안을 발의했습니다. "
            "기존 청년기본법은 청년 정책의 추상적 방향만 제시했으나, "
            "이번 개정안은 구체적 수치 목표와 의무 조항을 신설해 실효성을 강화하는 데 초점을 둡니다. "
            "특히 공공기관 청년 채용 의무 비율을 두 배(5%→10%)로 늘리고, "
            "국가 예산의 3% 이상을 청년 정책에 의무 배정하도록 규정해 정책의 지속성을 확보하려는 것이 핵심입니다."
        ),
        "key_points": [
            "중소기업 청년 채용 장려금 월 50만원 → 100만원으로 상향",
            "공공기관 청년 채용 의무 비율 5% → 10% 확대",
            "국가 예산의 3% 이상을 청년 정책 예산으로 의무화",
            "청년 창업 지원금 한도 확대 및 절차 간소화",
        ],
        "pros": [
            "청년 일자리 창출 효과가 즉각적으로 나타날 수 있음",
            "공공 부문이 마중물 역할을 해 민간 채용 확대 유도",
            "예산 의무 배정으로 정권 변화에 관계없이 정책 지속성 확보",
        ],
        "cons": [
            "중소기업 인건비 부담 증가로 비청년 고용이 감소할 수 있음",
            "공공기관 채용 비율 강제는 직무 적합성보다 연령이 우선시될 우려",
            "예산 3% 의무화는 다른 복지 분야 예산을 압박할 가능성",
        ],
        "expected_impact": (
            "연간 약 8만 명의 청년 신규 일자리 창출 효과가 추정되며, "
            "공공기관·중소기업 채용 시장에 직접적 변화가 예상됩니다. "
            "다만 사업주 부담 완화 보조금이 함께 설계되지 않으면 비청년 근로자 일자리 위축이 우려됩니다."
        ),
    },
    {
        "id": "2", "bill_no": "2200312",
        "title": "고등교육법 일부개정법률안 (등록금 동결)", "category": "교육",
        "proposer": "의원입법 (10인)", "propose_date": "2026-03-22", "status": "국회 계류",
        "sponsor_party": "더불어민주당 외 9인",
        "related_url": "https://likms.assembly.go.kr/bill/billDetail.do?billId=2200312",
        "raw_text": (
            "고등교육법 제11조를 개정하여 대학 등록금 인상률을 소비자물가 상승률의 1.5배를 "
            "초과할 수 없도록 규정한다. 국가장학금 지원 대상을 소득 9분위까지 확대하고, "
            "기초·차상위 계층 대학생에 대한 전액 장학금 지원을 의무화한다. "
            "국·공립대학의 경우 등록금 인상을 5년간 동결하는 방안도 포함된다."
        ),
        "description": (
            "최근 10년간 대학 등록금이 누적 31% 인상되며 가계 부담이 가중되었습니다. "
            "이번 개정안은 등록금 인상률을 소비자물가 상승률의 1.5배 이내로 제한하고, "
            "국가장학금 수혜 대상을 소득 8분위에서 9분위까지 확대해 중산층의 부담도 덜어주는 것을 목표로 합니다. "
            "또한 국공립대학에 한해 5년간 등록금을 동결하도록 의무화하여 "
            "교육 접근성을 보장하려는 강력한 조치를 담고 있습니다."
        ),
        "key_points": [
            "등록금 인상률 상한을 CPI 상승률의 1.5배로 법제화",
            "국가장학금 지원 대상을 소득 8분위 → 9분위까지 확대",
            "기초·차상위 계층 대학생 전액 장학금 지원 의무화",
            "국공립대학 등록금 5년간 동결",
        ],
        "pros": [
            "가계 교육비 부담이 직접적으로 경감됨",
            "저소득층 대학 진학률 상승 기대",
            "등록금 인상에 대한 사회적 갈등 완화",
        ],
        "cons": [
            "사립대학 재정 악화로 교육의 질 저하 우려",
            "강의 시설·연구 지원 축소로 경쟁력 하락 가능성",
            "국가 재정 부담이 연 1조원 이상 증가",
        ],
        "expected_impact": (
            "연간 약 220만 명의 대학생이 직접 혜택을 받으며, "
            "1인당 평균 75만원의 학비 절감 효과가 예상됩니다. "
            "다만 사립대 재정 보전을 위한 국고 지원 방안이 함께 마련되어야 정책 지속성이 확보됩니다."
        ),
    },
    {
        "id": "3", "bill_no": "2200445",
        "title": "주거기본법 일부개정법률안 (청년 주거 지원)", "category": "주거",
        "proposer": "정부", "propose_date": "2026-04-28", "status": "정부 입법예고",
        "sponsor_party": "정부 (국토교통부)",
        "related_url": "https://likms.assembly.go.kr/bill/billDetail.do?billId=2200445",
        "raw_text": (
            "청년(19~34세) 무주택 가구에 대한 전세자금 대출 한도를 현행 1억원에서 "
            "1억5천만원으로 상향하고, 금리 우대를 연 1.5%에서 1.2%로 인하한다. "
            "공공임대주택 청년 우선 공급 비율을 30%로 확대하고, "
            "역세권 청년 주택 공급 목표를 2028년까지 20만 호로 설정한다. "
            "월세 세액공제율도 현행 15%에서 20%로 상향한다."
        ),
        "description": (
            "수도권 청년의 평균 월세는 2026년 기준 65만원으로, 청년 평균 소득의 28%를 차지합니다. "
            "이번 개정안은 청년 무주택 가구의 주거 부담을 완화하기 위해 "
            "전세자금 대출 한도와 금리, 공공임대 공급, 월세 세액공제까지 4중 지원 패키지를 담고 있습니다. "
            "특히 역세권 중심 청년 주택 20만 호 공급 목표는 통근 시간 단축과 직주근접 실현을 목표로 합니다."
        ),
        "key_points": [
            "청년 전세자금 대출 한도 1억 → 1.5억원 상향",
            "전세 대출 금리 우대 1.5% → 1.2%로 인하",
            "공공임대주택 청년 우선 공급 비율 30%로 확대",
            "역세권 청년 주택 2028년까지 20만 호 공급",
            "월세 세액공제율 15% → 20%",
        ],
        "pros": [
            "청년 주거비 부담을 직접적으로 경감",
            "역세권 공급으로 통근 시간 단축 및 삶의 질 향상",
            "주거 안정으로 청년 결혼·출산 의향 상승 기대",
        ],
        "cons": [
            "공공임대 청년 우선 비율 확대는 다른 취약계층 배제 우려",
            "전세자금 대출 한도 상향이 전세가 인상을 부추길 가능성",
            "역세권 토지 매입 비용 등 막대한 재정 부담",
        ],
        "expected_impact": (
            "약 180만 가구의 청년 무주택자가 직접 혜택을 받으며, "
            "월평균 12만원의 주거비 경감 효과가 예상됩니다. "
            "역세권 공급 목표 달성 시 청년 통근 시간이 평균 18분 단축될 것으로 추산됩니다."
        ),
    },
    {
        "id": "4", "bill_no": "2200501",
        "title": "최저임금법 일부개정법률안", "category": "경제",
        "proposer": "의원입법 (15인)", "propose_date": "2026-02-15", "status": "소관위 심사",
        "sponsor_party": "국민의힘 외 14인",
        "related_url": "https://likms.assembly.go.kr/bill/billDetail.do?billId=2200501",
        "raw_text": (
            "최저임금 결정 기준에 생계비 및 유사 근로자 임금 외에 경제성장률과 "
            "고용 상황을 추가로 반영하도록 한다. 최저임금위원회 구성 시 청년·대학생 대표를 "
            "1인 이상 포함하도록 의무화하고, 최저임금 위반 사업주에 대한 과태료를 "
            "현행 2천만원에서 3천만원으로 상향한다."
        ),
        "description": (
            "최저임금이 매년 가파르게 인상되며 자영업자의 부담이 가중되는 한편, "
            "단기 알바를 주요 수입원으로 삼는 청년·대학생의 입장은 충분히 반영되지 못해 왔습니다. "
            "이번 개정안은 결정 기준에 경제성장률·고용 상황을 추가하여 임금 인상의 균형을 맞추고, "
            "최저임금위원회에 청년 대표를 의무 포함시켜 당사자 목소리를 직접 반영합니다. "
            "또한 사업주의 위반에 대한 처벌도 강화해 제도의 실효성을 높이려 합니다."
        ),
        "key_points": [
            "결정 기준에 '경제성장률'과 '고용 상황' 추가",
            "최저임금위원회에 청년·대학생 대표 1인 이상 의무 포함",
            "최저임금 위반 과태료 2천만원 → 3천만원 상향",
            "업종별·지역별 차등 적용 검토 조항 신설",
        ],
        "pros": [
            "경제 상황을 반영한 합리적 인상률 결정 가능",
            "청년 당사자 목소리가 정책에 직접 반영",
            "처벌 강화로 임금 체불·미지급 문제 감소 기대",
        ],
        "cons": [
            "경제성장률 반영 시 인상률 둔화로 저임금 노동자 실질소득 감소",
            "업종별·지역별 차등은 노동 시장 분절을 초래할 우려",
            "최저임금위원회 구성 변경에 대한 노동계 반발",
        ],
        "expected_impact": (
            "약 360만 명의 최저임금 영향 근로자에게 직접 영향을 미치며, "
            "자영업자 약 95만 명의 인건비 부담 변동이 예상됩니다. "
            "특히 알바 청년은 임금 결정 과정에 참여 기회를 얻게 됩니다."
        ),
    },
    {
        "id": "5", "bill_no": "2200678",
        "title": "탄소중립·녹색성장 기본법 개정안", "category": "환경",
        "proposer": "정부", "propose_date": "2026-03-05", "status": "국회 심의",
        "sponsor_party": "정부 (환경부)",
        "related_url": "https://likms.assembly.go.kr/bill/billDetail.do?billId=2200678",
        "raw_text": (
            "2030년 국가 온실가스 감축 목표를 2018년 대비 40%에서 45%로 상향하고, "
            "2035년까지 석탄발전을 단계적으로 폐쇄하는 로드맵을 수립한다. "
            "청년 기후 기금을 조성하고, 전기차 보조금을 국민 1인당 최대 700만원까지 지원한다."
        ),
        "description": (
            "한국은 2021년 NDC(국가 온실가스 감축 목표)를 40%로 상향했으나, "
            "EU·미국이 50% 이상으로 상향하면서 국제 압력이 가중되고 있습니다. "
            "이번 개정안은 NDC를 45%로 상향하고, 2035년 석탄발전 완전 폐쇄 로드맵을 법제화합니다. "
            "또한 기후 위기에 가장 취약한 청년 세대를 위해 별도 기후 기금을 조성하고, "
            "전기차 전환을 가속화하기 위해 보조금을 대폭 확대하는 내용을 담고 있습니다."
        ),
        "key_points": [
            "2030 NDC를 2018년 대비 40% → 45%로 상향",
            "2035년까지 석탄발전 단계적 폐쇄 로드맵 법제화",
            "청년 기후 기금 5조원 규모로 신설",
            "전기차 보조금 최대 700만원으로 확대",
        ],
        "pros": [
            "국제 기후 리더십 회복 및 통상 압력 대응",
            "친환경 산업 육성으로 미래 일자리 창출",
            "청년 세대의 기후 정책 참여 보장",
        ],
        "cons": [
            "급속한 석탄 폐쇄로 전력 수급 불안 우려",
            "산업계 비용 부담 증가로 수출 경쟁력 하락 가능성",
            "전기차 보조금 확대가 재정 부담을 가중",
        ],
        "expected_impact": (
            "2030년까지 추가로 1억8천만 톤의 온실가스 감축 효과가 예상됩니다. "
            "다만 산업계는 연 GDP 0.4%의 비용 부담을 떠안아야 하며, "
            "전력 가격은 단기적으로 8~12% 인상될 가능성이 있습니다."
        ),
    },
    {
        "id": "6", "bill_no": "2200789",
        "title": "국민건강보험법 일부개정법률안 (청년 정신건강)", "category": "보건",
        "proposer": "의원입법 (20인)", "propose_date": "2026-04-01", "status": "공청회 예정",
        "sponsor_party": "초당적 공동 발의",
        "related_url": "https://likms.assembly.go.kr/bill/billDetail.do?billId=2200789",
        "raw_text": (
            "만 19세~34세 청년의 정신건강 증진을 위해 심리상담 서비스를 "
            "건강보험 급여 항목으로 추가한다. 연간 최대 10회 상담을 보험으로 처리하고, "
            "본인부담금은 회당 1만원으로 제한한다. "
            "대학 내 상담센터 확충을 위한 국고 지원을 대학당 연 5천만원으로 확대한다."
        ),
        "description": (
            "20대 사망 원인 1위가 자살인 한국 사회에서 청년 정신건강은 더 이상 미룰 수 없는 의제입니다. "
            "이번 개정안은 청년 심리상담을 건강보험 급여 항목에 새로 편입시켜 "
            "비용 부담 없이 상담을 받을 수 있도록 보장합니다. "
            "또한 대학 상담센터 확충을 위한 국고 지원을 통해 학내 인프라도 함께 강화하려 합니다."
        ),
        "key_points": [
            "청년(19~34세) 심리상담을 건강보험 급여 항목에 추가",
            "연간 최대 10회 상담 보험 적용, 본인부담금 회당 1만원",
            "대학 상담센터 국고 지원 대학당 연 5천만원으로 확대",
            "디지털 비대면 상담 플랫폼 인증제 도입",
        ],
        "pros": [
            "청년 자살률 및 정신건강 위기 직접적 개선",
            "경제적 부담 없이 전문 상담 접근 가능",
            "정신건강에 대한 사회적 낙인 완화",
        ],
        "cons": [
            "건강보험 재정 부담 증가로 보험료 인상 가능성",
            "심리상담의 표준화·질 관리 체계가 미흡",
            "비청년층 대비 형평성 논란",
        ],
        "expected_impact": (
            "약 1,200만 명의 청년이 잠재적 수혜 대상이며, "
            "전문 상담 접근 비율이 현재 12%에서 35% 이상으로 상승할 것으로 추정됩니다. "
            "건강보험 재정 부담은 연 약 4,500억원이 추가됩니다."
        ),
    },
    {
        "id": "7", "bill_no": "2200891",
        "title": "고용보험법 일부개정법률안 (청년 고용 안전망)", "category": "고용",
        "proposer": "정부", "propose_date": "2026-04-20", "status": "입법예고",
        "sponsor_party": "정부 (고용노동부)",
        "related_url": "https://likms.assembly.go.kr/bill/billDetail.do?billId=2200891",
        "raw_text": (
            "졸업 후 1년 이내 미취업 청년에 대한 구직급여 특례를 신설하여, "
            "6개월간 월 50만원의 구직촉진수당을 지급한다. "
            "단기·플랫폼 노동에 종사하는 청년에 대한 고용보험 적용을 확대하고, "
            "청년 인턴십 참여자의 정규직 전환 시 사업주에게 지원금을 추가 지급한다."
        ),
        "description": (
            "기존 고용보험은 정규직 위주로 설계되어 있어 청년이 주로 종사하는 "
            "단기·플랫폼·프리랜서 노동에 대한 사회 안전망이 사실상 부재했습니다. "
            "이번 개정안은 졸업 후 1년 이내 미취업 청년에게 6개월간 월 50만원의 구직촉진수당을 지급하고, "
            "단기·플랫폼 노동자에게도 고용보험을 적용해 사회 안전망의 사각지대를 메우려는 것을 목표로 합니다."
        ),
        "key_points": [
            "졸업 후 1년 이내 미취업 청년에 6개월간 월 50만원 구직촉진수당",
            "단기·플랫폼 노동자에 대한 고용보험 적용 확대",
            "인턴 정규직 전환 시 사업주에 추가 지원금 지급",
            "구직활동 인정 기준 완화 및 디지털 신청 절차 도입",
        ],
        "pros": [
            "청년 구직 기간 동안 최소 생계 보장",
            "플랫폼 노동자 등 신규 노동 형태에 대한 사회 안전망 확장",
            "인턴 → 정규직 전환 인센티브로 양질의 일자리 증가",
        ],
        "cons": [
            "수당 의존도가 높아져 도덕적 해이 우려",
            "고용보험 재정 부담 가중",
            "사업주 지원금이 형식적 인턴 채용을 부추길 가능성",
        ],
        "expected_impact": (
            "연간 약 28만 명의 미취업 청년에게 직접 지급되며, "
            "총 재정 소요는 연 1조 6,800억원 수준입니다. "
            "플랫폼 노동자 약 80만 명이 새로 고용보험 적용을 받게 됩니다."
        ),
    },
    {
        "id": "8", "bill_no": "2200934",
        "title": "사회보장기본법 일부개정법률안 (복지 사각지대 해소)", "category": "복지",
        "proposer": "의원입법 (8인)", "propose_date": "2026-03-18", "status": "소관위 심사",
        "sponsor_party": "정의당 외 7인",
        "related_url": "https://likms.assembly.go.kr/bill/billDetail.do?billId=2200934",
        "raw_text": (
            "복지 사각지대 해소를 위해 차상위계층 기준을 기준중위소득 50%에서 60%로 상향한다. "
            "1인 가구 청년에 대한 맞춤형 급여를 신설하고, "
            "긴급복지지원 대상자 선정 시 청년 가산점 제도를 도입한다. "
            "복지급여 신청 절차를 디지털화하여 모바일 앱을 통한 신청을 전면 허용한다."
        ),
        "description": (
            "한국의 복지 사각지대는 약 60만 가구로 추정되며, 특히 1인 가구 청년이 큰 비중을 차지합니다. "
            "이번 개정안은 차상위계층 기준을 중위소득 50%에서 60%로 상향해 수혜 대상을 확대하고, "
            "1인 가구 청년에 대한 맞춤형 급여 항목을 별도로 신설합니다. "
            "또한 디지털 신청을 전면 허용해 행정 접근성을 높이고, 신청 누락으로 인한 사각지대를 줄이려 합니다."
        ),
        "key_points": [
            "차상위계층 기준 중위소득 50% → 60%로 상향",
            "1인 가구 청년 맞춤형 급여 신설",
            "긴급복지지원 청년 가산점 도입",
            "복지급여 모바일 앱 신청 전면 허용",
        ],
        "pros": [
            "복지 사각지대 해소로 사회 안전망 강화",
            "1인 가구 청년의 경제적 자립 지원",
            "디지털 신청으로 행정 효율성·접근성 향상",
        ],
        "cons": [
            "복지 예산 급증으로 재정 건전성 악화 우려",
            "디지털 취약 계층의 신청 누락 가능성",
            "청년 가산점이 다른 취약계층 형평성 침해 우려",
        ],
        "expected_impact": (
            "약 250만 가구가 신규로 차상위계층에 편입되어 복지 혜택을 받게 됩니다. "
            "1인 가구 청년 약 80만 명이 맞춤형 급여 대상이며, "
            "재정 소요는 연 2조 3천억원 추가됩니다."
        ),
    },
]

# ── Election events ───────────────────────────────────────────────────────────

# 제9회 전국동시지방선거 (2026-06-03 본투표) — 공직선거법 일정 기준
_ELECTIONS = [
    {"id": "1", "name": "후보자 등록 신청",  "date": "2026-05-14", "type": "후보등록",
     "description": "5월 14일~15일 (오전 9시 ~ 오후 6시)",
     "region": "전국", "color": "amber"},
    {"id": "2", "name": "공식 선거운동 개시일", "date": "2026-05-21", "type": "선거운동",
     "description": "5월 21일 — 13일간의 공식 선거운동 시작",
     "region": "전국", "color": "blue"},
    {"id": "3", "name": "선거인명부 확정",   "date": "2026-05-22", "type": "명부확정",
     "description": "5월 22일~23일 선거인명부 작성·확정",
     "region": "전국", "color": "slate"},
    {"id": "4", "name": "사전투표 실시",     "date": "2026-05-29", "type": "사전투표",
     "description": "5월 29일~30일 (매일 오전 6시 ~ 오후 6시)",
     "region": "전국", "color": "green"},
    {"id": "5", "name": "본 투표 및 개표",   "date": "2026-06-03", "type": "본투표",
     "description": "6월 3일 (오전 6시 ~ 오후 6시) — 광역단체장·교육감·시·도의원 선출",
     "region": "전국", "color": "red"},
]

# ── News articles ─────────────────────────────────────────────────────────────

_NEWS = [
    {
        "title": "정부, 2026년 청년 주거 지원 예산 2조원으로 확대",
        "summary": "국토부는 청년 전세자금 대출 한도를 기존 1억원에서 1억5천만원으로 상향하고 지원 대상을 연소득 5천만원 이하 무주택 청년으로 확대한다고 밝혔습니다.",
        "source": "정책브리핑", "category": "정책",
        "url": "https://policy.go.kr",
        "created_at": datetime(2026, 5, 9, 8, 0),
    },
    {
        "title": "제22대 국회의원 선거 공식 선거운동 시작 D-42",
        "summary": "6월 20일로 예정된 선거를 앞두고 각 정당의 공약 발표가 이어지고 있습니다.",
        "source": "중앙선거관리위원회", "category": "선거",
        "url": "https://nec.go.kr",
        "created_at": datetime(2026, 5, 9, 6, 0),
    },
]


# ── Seed entrypoints ──────────────────────────────────────────────────────────

def _seed_users_debates_comments(db: Session) -> None:
    users: list[User] = []
    for u in _USERS:
        user = User(
            email=u["email"], name=u["name"],
            display_name=mask_name(u["name"]),
            university=u["university"], major=u["major"],
            age_group=u["age_group"], password_hash=_PW,
        )
        db.add(user)
        users.append(user)
    db.flush()

    debates: list[Debate] = []
    for d in _DEBATES:
        debate = Debate(
            title=d["title"], body=d["body"],
            category=d["category"], region=d["region"],
            author_id=users[d["ui"]].id,
            bill_id=d.get("bill_id"),
            upvotes=d["upvotes"], downvotes=d["downvotes"],
            comment_count=d["comment_count"], created_at=d["created_at"],
        )
        db.add(debate)
        debates.append(debate)
    db.flush()

    comment_objs: list[Comment] = []
    for c in _COMMENTS:
        parent_id = comment_objs[c["parent_idx"]].id if c["parent_idx"] is not None else None
        comment = Comment(
            debate_id=debates[c["di"]].id,
            author_id=users[c["ai"]].id,
            parent_id=parent_id,
            body=c["body"], upvotes=c["upvotes"],
            created_at=c["created_at"],
        )
        db.add(comment)
        comment_objs.append(comment)
        db.flush()


def _seed_bills(db: Session) -> None:
    for b in _BILLS:
        db.add(Bill(**b))


def _seed_elections(db: Session) -> None:
    for e in _ELECTIONS:
        db.add(ElectionEvent(**e))


def _seed_news(db: Session) -> None:
    for n in _NEWS:
        db.add(NewsArticle(**n))


def seed(db: Session) -> None:
    """Seed each table independently — only inserts when the table is empty.
    Bills are seeded BEFORE debates so the bill_id foreign key resolves.
    Elections are reference calendar data — always refreshed on startup."""
    if db.query(Bill).count() == 0:
        _seed_bills(db)
        db.flush()
    if db.query(User).count() == 0:
        _seed_users_debates_comments(db)

    # Elections: always wipe & re-seed so corrected dates land without DB reset
    db.query(ElectionEvent).delete()
    _seed_elections(db)

    if db.query(NewsArticle).count() == 0:
        _seed_news(db)
    db.commit()

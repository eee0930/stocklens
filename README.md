# StockLens

> AI 기반 미국·한국 주식 분석 플랫폼

종목 하나만 검색하면 차트, 기술적 지표, 펀더멘털, Gemini AI 투자 의견을 한 화면에서 확인할 수 있습니다.

---

## 주요 기능

- **미국 + 한국 주식 / ETF 검색** — 티커(AAPL), 영문 회사명, 한글명(삼성전자, 카카오 등) 모두 지원
- **인터랙티브 캔들스틱 차트** — TradingView Lightweight Charts, 거래량 히스토그램, SMA 20 오버레이, 범위 선택(1W · 1M · 3M · 1Y · 5Y · ALL)
- **기술적 지표 카드** — RSI(14), MACD, SMA 20 대비, 52주 고저, 거래량 증가율 (각 지표 설명 툴팁 포함)
- **펀더멘털 데이터** — P/E, PEG, EPS, 베타, 시가총액, 영업이익률, 순이익률, 매출/실적 성장률
- **ETF 상위 보유 종목** — 미국 상장 ETF의 상위 10개 보유 종목 표시, 클릭 시 해당 종목 분석으로 이동
- **Gemini AI 투자 분석** — 0~100 점수 + 강력매수/매수/중립/매도/강력매도 의견 + 단기·장기 전망 + 근거 · 리스크
- **규칙 기반 폴백** — Gemini 할당량 초과·장애 시 RSI·MACD·이동평균 기반 자체 분석으로 자동 대체
- **URL 기반 네비게이션** — 각 종목마다 고유 URL(`/stock/AAPL`), 브라우저 뒤로가기로 ETF 드릴다운 히스토리 복원
- **반응형 UI** — 모바일 / 태블릿 / 데스크톱 대응, 한국 주식 색상 관행(상승 빨강, 하락 파랑) 적용

---

## 기술 스택

### Frontend
| 항목 | 버전 | 설명 |
|------|------|------|
| React | 18.3 | UI 컴포넌트 |
| TypeScript | 6.0 | 타입 안전성 |
| Vite | 5.4 | 번들러 및 개발 서버 |
| React Router | 6 | URL 기반 네비게이션 |
| TanStack Query | 5 | 서버 상태 관리 및 캐싱 |
| TradingView Lightweight Charts | 4.2 | 캔들스틱 차트 |
| technicalindicators | 3.1 | RSI · MACD · SMA 계산 |

### Backend (Vercel Serverless Functions)
| 항목 | 버전 | 설명 |
|------|------|------|
| yahoo-finance2 | 3.14 | 주가 · 펀더멘털 · ETF 보유 종목 데이터 |
| Gemini API | - | AI 투자 분석 (gemini-2.0-flash-lite → flash 순 폴백) |

### 스타일
- 순수 CSS (프레임워크 없음), 다크 테마 기반 디자인
- Inter + JetBrains Mono 폰트

---

## 요구 환경

- **Node.js** v18 이상
- **Gemini API 키** — [Google AI Studio](https://aistudio.google.com/app/apikey) 에서 무료 발급

---

## 시작하기

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
echo "GEMINI_API_KEY=your_api_key_here" > .env

# 3. 개발 서버 실행
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

---

## 환경 변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `GEMINI_API_KEY` | 권장 | Gemini AI 분석 사용. 없으면 규칙 기반 분석으로 자동 대체 |

---

## 프로젝트 구조

```
stocklens/
├── src/
│   ├── components/
│   │   ├── SearchPage.tsx      # 메인 검색 화면
│   │   ├── ResultsPage.tsx     # 분석 결과 화면
│   │   ├── StockChart.tsx      # 캔들스틱 차트
│   │   ├── MetricsGrid.tsx     # 기술적 지표 카드 (툴팁 포함)
│   │   ├── ETFHoldings.tsx     # ETF 상위 보유 종목
│   │   ├── AIAnalysis.tsx      # AI 투자 분석 패널
│   │   └── LoadingState.tsx    # 로딩 스텝 UI
│   ├── services/
│   │   └── stockApi.ts         # Yahoo Finance API 호출
│   ├── utils/
│   │   ├── calculations.ts     # 기술적 지표 계산 로직
│   │   └── koreanStocks.ts     # 한국 종목 한글명 → 티커 매핑
│   ├── types.ts                # 공통 TypeScript 타입
│   ├── App.tsx                 # 라우터 및 쿼리 훅
│   ├── main.tsx                # QueryClient · BrowserRouter 설정
│   └── index.css
├── api/
│   ├── stock/
│   │   ├── search.ts           # 종목 검색 서버리스 함수
│   │   ├── chart.ts            # 주가 히스토리 서버리스 함수
│   │   └── summary.ts          # 펀더멘털 서버리스 함수
│   └── analyze.ts              # Gemini AI 서버리스 함수
├── vite.config.ts              # 로컬 개발용 API 미들웨어
├── vercel.json                 # Vercel 배포 설정
└── package.json
```

---

## 아키텍처

```
브라우저 (React + React Router + TanStack Query)
    │
    │  /api/stock/*   (주가 데이터 요청)
    │  /api/analyze   (AI 분석 요청)
    ▼
[로컬] Vite 개발 서버 미들웨어
[배포] Vercel Serverless Functions
    │
    ├──▶ yahoo-finance2   ──▶  Yahoo Finance (주가 · 펀더멘털 · ETF 보유 종목)
    └──▶ Gemini API       ──▶  Google AI (투자 분석)
```

**캐싱 전략:**
- 주가 데이터 — 장 중: 항상 최신 / 장 후: 12시간 (TanStack Query)
- AI 분석 — localStorage에 당일 결과 저장 → 페이지 새로고침 후에도 재호출 없음
- 브라우저가 외부 API를 직접 호출하지 않아 CORS 문제 없음, API 키 노출 없음

---

## Vercel 배포

1. [vercel.com](https://vercel.com) 로그인 → **Add New Project** → GitHub 레포 선택
2. Framework Preset: **Vite** (자동 감지)
3. **Environment Variables** 에 `GEMINI_API_KEY` 추가
4. **Deploy** 클릭

---

## Gemini API 사용량

무료 티어 기준 (`gemini-2.0-flash-lite`):

| 제한 | 수치 |
|------|------|
| 일일 요청 수 | 1,500회 |
| 분당 요청 수 | 30회 |

같은 종목은 당일 내 localStorage 캐시를 사용해 Gemini를 재호출하지 않으므로, 일반적인 개인 사용 환경에서는 한도에 도달하기 어렵습니다.

---

## 지원 종목

- **미국 주식 / ETF** — NYSE, NASDAQ 전 종목 (Yahoo Finance 검색)
- **한국 주식** — KOSPI(`.KS`) / KOSDAQ(`.KQ`) 주요 종목 한글명 지원  
  삼성전자, SK하이닉스, NAVER, 카카오, 현대차, 기아, LG에너지솔루션 등

---

## 라이선스

MIT

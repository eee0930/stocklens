# StockLens

> AI 기반 미국·한국 주식 분석 플랫폼

종목 하나만 검색하면 차트, 기술적 지표, 펀더멘털, Gemini AI 투자 의견을 한 화면에서 확인할 수 있습니다.

---

## 화면

| 검색 | 분석 결과 |
|------|-----------|
| ![search](https://placehold.co/480x280/0f1117/4f8ef7?text=Search+Page) | ![result](https://placehold.co/480x280/0f1117/34d399?text=Result+Page) |

---

## 주요 기능

- **미국 + 한국 주식 검색** — 티커(AAPL), 영문 회사명, 한글명(삼성전자, 카카오 등) 모두 지원
- **인터랙티브 캔들스틱 차트** — TradingView Lightweight Charts, 거래량 히스토그램, SMA 20 오버레이
- **기술적 지표 계산** — RSI(14), MACD(12/26/9), SMA 20/50, 52주 고저, 거래량 증가율
- **펀더멘털 데이터** — P/E, PEG, EPS, 베타, 시가총액, 영업이익률, 순이익률, 매출/실적 성장률
- **Gemini AI 투자 분석** — 0~100 점수 + 강력매수/매수/중립/매도/강력매도 의견 + 근거 · 리스크
- **규칙 기반 폴백** — AI 응답 실패 시 RSI·MACD·이동평균 기반 자체 분석으로 자동 대체
- **반응형 UI** — 모바일 / 태블릿 / 데스크톱 대응

---

## 기술 스택

### Frontend
| 항목 | 버전 | 설명 |
|------|------|------|
| React | 18.3 | UI 컴포넌트 |
| Vite | 5.4 | 번들러 및 개발 서버 |
| TradingView Lightweight Charts | 4.2 | 캔들스틱 차트 |
| technicalindicators | 3.1 | RSI · MACD · SMA 계산 |

### Backend (Vite 서버 미들웨어)
| 항목 | 버전 | 설명 |
|------|------|------|
| yahoo-finance2 | 3.14 | 주가 · 펀더멘털 데이터 (API 키 불필요) |
| @google/generative-ai | 0.21 | Gemini AI 분석 |

### 스타일
- 순수 CSS (프레임워크 없음)
- 다크 테마 기반 디자인 시스템
- Inter + JetBrains Mono 폰트

---

## 요구 환경

- **Node.js** v18 이상 (개발 환경: v24)
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
├── public/
│   ├── favicon.svg
│   └── og-image.svg
├── src/
│   ├── components/
│   │   ├── SearchPage.jsx      # 메인 검색 화면
│   │   ├── ResultsPage.jsx     # 분석 결과 화면
│   │   ├── StockChart.jsx      # 캔들스틱 차트
│   │   ├── MetricsGrid.jsx     # 기술적 지표 카드
│   │   ├── AIAnalysis.jsx      # AI 투자 분석 패널
│   │   └── LoadingState.jsx    # 로딩 스텝 UI
│   ├── services/
│   │   └── stockApi.js         # Yahoo Finance API 호출
│   ├── utils/
│   │   ├── calculations.js     # 기술적 지표 계산 로직
│   │   └── koreanStocks.js     # 한국 종목 한글명 → 티커 매핑
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── api/
│   ├── stock/
│   │   └── [...path].js        # 주가 데이터 서버리스 함수 (Vercel)
│   └── analyze.js              # Gemini AI 서버리스 함수 (Vercel)
├── vite.config.js              # 로컬 개발용 서버 미들웨어 (동일 로직)
├── vercel.json                 # Vercel 배포 설정
├── index.html
└── package.json
```

---

## 아키텍처

```
브라우저 (React)
    │
    │  /api/stock/*   (주가 데이터 요청)
    │  /api/analyze   (AI 분석 요청)
    ▼
[로컬] Vite 개발 서버 미들웨어
[배포] Vercel Serverless Functions
    │
    ├──▶ yahoo-finance2 (Node.js)  ──▶  Yahoo Finance
    └──▶ @google/generative-ai     ──▶  Gemini API
```

브라우저가 외부 API를 직접 호출하지 않아 CORS 문제 없음, API 키 노출 없음.

---

## Vercel 배포

### 1. GitHub에 푸시

```bash
git init
git add .
git commit -m "init"
gh repo create stocklens --public --push
```

### 2. Vercel에 연결

1. [vercel.com](https://vercel.com) 로그인 → **Add New Project**
2. GitHub 레포 선택 → **Import**
3. Framework Preset: **Vite** (자동 감지됨)
4. **Environment Variables** 에 추가:
   | Key | Value |
   |-----|-------|
   | `GEMINI_API_KEY` | `AIzaSy...` |
5. **Deploy** 클릭

### 3. 배포 완료

`https://stocklens-xxx.vercel.app` 형태의 URL이 생성됩니다.

> `og:url` 과 `og:image` 경로를 실제 배포 URL로 업데이트하면 링크 공유 시 미리보기가 정상 표시됩니다.

---

## 지원 종목

- **미국 주식 / ETF** — NYSE, NASDAQ 전 종목 (Yahoo Finance 검색)
- **한국 주식** — KOSPI(`.KS`) / KOSDAQ(`.KQ`) 주요 종목 65개 한글명 지원  
  삼성전자, SK하이닉스, NAVER, 카카오, 현대차, 기아, LG에너지솔루션 등

---

## 빌드

```bash
npm run build    # dist/ 폴더에 정적 파일 생성
npm run preview  # 빌드 결과물 로컬 미리보기
```

> **참고** 프로덕션 배포 시 Vite 서버 미들웨어(yahoo-finance2, Gemini)가 동작하지 않습니다.  
> Node.js 서버(Express 등)로 `/api/*` 엔드포인트를 별도 구성하거나, Vercel/Netlify Functions를 활용하세요.

---

## 라이선스

MIT

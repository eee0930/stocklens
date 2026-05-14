import { useMemo } from 'react'
import { Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import SearchPage from './components/SearchPage'
import ResultsPage from './components/ResultsPage'
import LoadingState from './components/LoadingState'
import { searchSymbol, getChart, getQuoteSummary, isMarketOpen } from './services/stockApi'
import { processStockData } from './utils/calculations'
import type { Analysis } from './types'

const STEPS = [
  { id: 'price',  label: '주가 데이터 불러오는 중...' },
  { id: 'calc',   label: '기술적 지표 계산 중...' },
  { id: 'ai',     label: 'Gemini AI 분석 중...' },
]

// ── localStorage 분석 캐시 (당일 유효, rule-based 제외) ─────────
const LS_PREFIX = 'sl_analysis:'
const todayKey = () => new Date().toISOString().slice(0, 10)

function getLocalAnalysis(symbol: string): Analysis | null {
  try {
    const raw = localStorage.getItem(LS_PREFIX + symbol.toUpperCase())
    if (!raw) return null
    const { analysis, dateKey } = JSON.parse(raw) as { analysis: Analysis; dateKey: string }
    if (dateKey !== todayKey() || analysis?.isRuleBased) return null
    return analysis
  } catch { return null }
}

function setLocalAnalysis(symbol: string, analysis: Analysis): void {
  if (analysis?.isRuleBased) return
  try {
    localStorage.setItem(LS_PREFIX + symbol.toUpperCase(), JSON.stringify({ analysis, dateKey: todayKey() }))
  } catch {}
}

async function fetchAnalysis(payload: Record<string, unknown>): Promise<Analysis> {
  const callAnalyze = () => fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  let res = await callAnalyze()

  for (let retry = 0; res.status === 429 && retry < 3; retry++) {
    const { retryAfterMs } = await res.json() as { retryAfterMs: number }
    const wait = Math.min(retryAfterMs ?? 65000, 120000)
    console.log(`[Gemini] rate-limited, retrying in ${Math.ceil(wait / 1000)}s... (${retry + 1}/3)`)
    await new Promise(r => setTimeout(r, wait))
    res = await callAnalyze()
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(err.error || 'AI 분석에 실패했습니다.')
  }
  return res.json() as Promise<Analysis>
}

// 검색어 → 종목 symbol 해석 후 /stock/:symbol 로 이동하는 공통 훅
function useSearchNavigator() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return async (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) return
    const results = await queryClient.fetchQuery({
      queryKey: ['search', trimmed],
      queryFn: async () => {
        const r = await searchSymbol(trimmed)
        if (!r?.length)
          throw new Error(
            `"${trimmed}"에 해당하는 종목을 찾을 수 없습니다.\n미국 주식: 티커(AAPL) 또는 영문 회사명\n한국 주식: 삼성전자, 카카오, SK하이닉스 등`
          )
        return r
      },
      staleTime: 10 * 60 * 1000,
    })
    navigate(`/stock/${results[0].symbol}`)
  }
}

// ── 검색 페이지 (/） ────────────────────────────────────────────
function SearchRoute() {
  const handleSearch = useSearchNavigator()
  return <SearchPage onSearch={handleSearch} />
}

// ── 결과 페이지 (/stock/:symbol) ────────────────────────────────
function StockRoute() {
  const { symbol = '' } = useParams<{ symbol: string }>()
  const navigate     = useNavigate()
  const handleSearch = useSearchNavigator()
  const handleBack   = () => navigate('/')

  const isOpen     = isMarketOpen(symbol)
  const stockStale = isOpen ? 0 : 12 * 60 * 60 * 1000

  // 1. 차트 + 펀더멘탈 (병렬)
  const chartQuery = useQuery({
    queryKey:  ['chart', symbol],
    queryFn:   () => getChart(symbol),
    enabled:   !!symbol,
    staleTime: stockStale,
    retry: 1,
  })

  const summaryQuery = useQuery({
    queryKey:  ['summary', symbol],
    queryFn:   () => getQuoteSummary(symbol),
    enabled:   !!symbol,
    staleTime: stockStale,
    retry: 1,
  })

  // 2. 기술적 지표 계산 (동기)
  const stockData = useMemo(() => {
    if (!chartQuery.data || !summaryQuery.data || !symbol) return null
    try {
      const p = processStockData(chartQuery.data, summaryQuery.data)
      p.symbol      = symbol
      p.companyName = p.companyName || symbol
      return p
    } catch { return null }
  }, [chartQuery.data, summaryQuery.data, symbol])

  // 3. AI 분석
  const analysisQuery = useQuery({
    queryKey: ['analysis', symbol],
    queryFn:  async () => {
      const cached = getLocalAnalysis(symbol)
      if (cached) return cached
      const { chartData: _c, volumeData: _v, sma20Data: _s, ...payload } = stockData!
      const result = await fetchAnalysis(payload as Record<string, unknown>)
      setLocalAnalysis(symbol, result)
      return result
    },
    enabled:  !!stockData,
    staleTime: Infinity,
    gcTime:    24 * 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  })

  const step = chartQuery.isLoading || summaryQuery.isLoading ? 0
             : !stockData                                      ? 1
             : 3

  const anyError = chartQuery.isError || summaryQuery.isError || analysisQuery.isError
  const errorMsg = (chartQuery.error || summaryQuery.error || analysisQuery.error) as Error | null

  if (anyError) return (
    <div className="error-page">
      <svg width="250" height="165" viewBox="-20 0 250 165" fill="none" xmlns="http://www.w3.org/2000/svg" className="fade-in">
        <ellipse cx="108" cy="152" rx="72" ry="8" fill="rgba(79,142,247,0.06)"/>
        <rect x="60" y="88" width="98" height="58" rx="12" fill="rgba(79,142,247,0.09)" stroke="rgba(79,142,247,0.30)" strokeWidth="1.8"/>
        <rect x="76" y="102" width="36" height="26" rx="5" fill="rgba(79,142,247,0.06)" stroke="rgba(79,142,247,0.16)" strokeWidth="1.2"/>
        <circle cx="84"  cy="110" r="3" fill="rgba(79,142,247,0.28)"/>
        <circle cx="94"  cy="110" r="3" fill="rgba(96,165,250,0.22)"/>
        <circle cx="104" cy="110" r="3" fill="rgba(251,191,36,0.24)"/>
        <rect x="78" y="118" width="32" height="5" rx="2.5" fill="rgba(79,142,247,0.13)"/>
        <rect x="50" y="104" width="14" height="18" rx="3" fill="rgba(79,142,247,0.12)" stroke="rgba(79,142,247,0.20)" strokeWidth="1.2"/>
        <g transform="rotate(10, 22, 116)">
          <rect x="-12" y="82" width="64" height="58" rx="14" fill="rgba(79,142,247,0.11)" stroke="rgba(79,142,247,0.34)" strokeWidth="1.8"/>
          <line x1="0"  y1="96" x2="14" y2="110" stroke="rgba(248,113,113,0.62)" strokeWidth="2.4" strokeLinecap="round"/>
          <line x1="14" y1="96" x2="0"  y2="110" stroke="rgba(248,113,113,0.62)" strokeWidth="2.4" strokeLinecap="round"/>
          <line x1="22" y1="96" x2="36" y2="110" stroke="rgba(248,113,113,0.62)" strokeWidth="2.4" strokeLinecap="round"/>
          <line x1="36" y1="96" x2="22" y2="110" stroke="rgba(248,113,113,0.62)" strokeWidth="2.4" strokeLinecap="round"/>
          <path d="M 2 126 Q 18 120 34 126" stroke="rgba(79,142,247,0.48)" strokeWidth="2" fill="none" strokeLinecap="round"/>
          <path d="M 18 82 C 16 66, 8 56, 2 48" stroke="rgba(79,142,247,0.36)" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
          <circle cx="2" cy="46" r="5.5" fill="rgba(79,142,247,0.16)" stroke="rgba(79,142,247,0.38)" strokeWidth="1.5"/>
        </g>
        <rect x="88" y="32" width="15" height="58" rx="7.5" fill="rgba(79,142,247,0.09)" stroke="rgba(79,142,247,0.25)" strokeWidth="1.7"/>
        <rect x="83" y="19" width="25" height="16" rx="7"   fill="rgba(79,142,247,0.10)" stroke="rgba(79,142,247,0.26)" strokeWidth="1.6"/>
        <rect x="112" y="26" width="15" height="62" rx="7.5" fill="rgba(79,142,247,0.09)" stroke="rgba(79,142,247,0.25)" strokeWidth="1.7"/>
        <rect x="107" y="12" width="25" height="16" rx="7"   fill="rgba(79,142,247,0.10)" stroke="rgba(79,142,247,0.26)" strokeWidth="1.6"/>
        <rect x="155" y="110" width="44" height="13" rx="6.5" fill="rgba(79,142,247,0.09)" stroke="rgba(79,142,247,0.22)" strokeWidth="1.6"/>
        <circle cx="201" cy="116" r="9" fill="rgba(79,142,247,0.09)" stroke="rgba(79,142,247,0.24)" strokeWidth="1.6"/>
        <text x="152" y="88" fontSize="13" fontWeight="700" fill="rgba(79,142,247,0.52)" fontFamily="monospace">z</text>
        <text x="168" y="67" fontSize="17" fontWeight="700" fill="rgba(79,142,247,0.34)" fontFamily="monospace">z</text>
        <text x="188" y="44" fontSize="21" fontWeight="700" fill="rgba(79,142,247,0.18)" fontFamily="monospace">z</text>
      </svg>
      <div className="error-box fade-in-delay">
        <div className="error-title">오류가 발생했습니다</div>
        <div className="error-message">{errorMsg?.message ?? '알 수 없는 오류'}</div>
      </div>
      <button className="btn-outline" onClick={handleBack}>← 뒤로</button>
    </div>
  )

  if (stockData && analysisQuery.data) return (
    <ResultsPage
      stockData={stockData}
      analysis={analysisQuery.data}
      onBack={handleBack}
      onSearch={handleSearch}
    />
  )

  return <LoadingState steps={STEPS} currentStep={step} />
}

// ── 앱 라우터 ────────────────────────────────────────────────────
export default function App() {
  return (
    <Routes>
      <Route path="/"              element={<SearchRoute />} />
      <Route path="/stock/:symbol" element={<StockRoute />} />
    </Routes>
  )
}

// 모든 주가 데이터는 Vite 서버 미들웨어(yahoo-finance2)를 통해 제공
// API 키 불필요, 횟수 제한 없음

import { isKorean, searchKoreanStocks } from '../utils/koreanStocks'

// ── 캐시 ────────────────────────────────────────────────────────────
const stockCache    = new Map() // symbol → { data, dateKey }
const analysisCache = new Map() // symbol → { analysis, dateKey }

function getTodayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getTimeInZone(timeZone) {
  const str = new Date().toLocaleString('en-US', { timeZone, hour12: false })
  const [datePart, timePart] = str.split(', ')
  const [month, day, year] = datePart.split('/').map(Number)
  const [hours, minutes] = timePart.split(':').map(Number)
  const dow = new Date(year, month - 1, day).getDay() // 0=일, 6=토
  return { dow, total: hours * 60 + minutes }
}

function isUSMarketOpen() {
  const { dow, total } = getTimeInZone('America/New_York')
  if (dow === 0 || dow === 6) return false
  return total >= 9 * 60 + 30 && total < 16 * 60
}

function isKRMarketOpen() {
  const { dow, total } = getTimeInZone('Asia/Seoul')
  if (dow === 0 || dow === 6) return false
  return total >= 9 * 60 && total < 15 * 60 + 30
}

function isMarketOpen(symbol) {
  const upper = symbol.toUpperCase()
  return (upper.endsWith('.KS') || upper.endsWith('.KQ'))
    ? isKRMarketOpen()
    : isUSMarketOpen()
}

function getCached(symbol) {
  const entry = stockCache.get(symbol.toUpperCase())
  if (!entry) return null
  if (isMarketOpen(symbol)) return null          // 장 중: 항상 새로 요청
  if (entry.dateKey !== getTodayKey()) return null // 날짜 바뀜: 무효
  return entry.data
}

function setCached(symbol, data) {
  stockCache.set(symbol.toUpperCase(), { data, dateKey: getTodayKey() })
}

// 규칙기반이거나 날짜가 다르면 null → 재분석 트리거
export function getCachedAnalysis(symbol) {
  const entry = analysisCache.get(symbol.toUpperCase())
  if (!entry) return null
  if (isMarketOpen(symbol)) return null           // 장 중: 항상 재분석
  if (entry.dateKey !== getTodayKey()) return null // 날짜 바뀜: 무효
  if (entry.analysis?.isRuleBased) return null    // 규칙기반: 재시도
  return entry.analysis
}

export function setCachedAnalysis(symbol, analysis) {
  analysisCache.set(symbol.toUpperCase(), { analysis, dateKey: getTodayKey() })
}
// ────────────────────────────────────────────────────────────────────

async function apiFetch(path) {
  const res = await fetch(`/api/stock${path}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `데이터 요청 실패 (${res.status})`)
  }
  return res.json()
}

// 종목 검색 → [{ symbol, shortname, longname, quoteType, exchange }]
export async function searchSymbol(query) {
  // 한글 입력이면 매핑 테이블 우선 검색
  if (isKorean(query)) {
    const krResults = searchKoreanStocks(query)
    if (krResults.length > 0) return krResults
    throw new Error(`"${query}"에 해당하는 종목을 찾을 수 없습니다.\n한국 주식은 삼성전자, 카카오, SK하이닉스 등으로 검색하거나\n005930.KS처럼 티커 형식으로 입력해보세요.`)
  }

  // 영문 / 티커 검색 → Yahoo Finance
  const quotes = await apiFetch(`/search?q=${encodeURIComponent(query)}`)
  return (Array.isArray(quotes) ? quotes : []).filter(q =>
    (q.quoteType === 'EQUITY' || q.quoteType === 'ETF') &&
    q.exchange !== 'PNK'
  )
}

// 최근 6개월 OHLCV 히스토리
export async function getChart(symbol) {
  const history = await apiFetch(`/chart?symbol=${encodeURIComponent(symbol)}`)
  if (!Array.isArray(history) || history.length === 0) {
    throw new Error(`${symbol}의 주가 데이터를 찾을 수 없습니다.`)
  }
  return history
}

// 펀더멘털 (실패해도 빈 객체 반환)
export async function getQuoteSummary(symbol) {
  try {
    return await apiFetch(`/summary?symbol=${encodeURIComponent(symbol)}`)
  } catch {
    return {}
  }
}

// 차트 + 펀더멘털 병렬 요청 (캐시 적용)
export async function fetchAllStockData(symbol) {
  const cached = getCached(symbol)
  if (cached) return cached

  const [chart, summary] = await Promise.all([
    getChart(symbol),
    getQuoteSummary(symbol),
  ])
  const result = { chart, summary }
  setCached(symbol, result)
  return result
}

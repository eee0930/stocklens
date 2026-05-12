// 모든 주가 데이터는 Vite 서버 미들웨어(yahoo-finance2)를 통해 제공
// API 키 불필요, 횟수 제한 없음

import { isKorean, searchKoreanStocks } from '../utils/koreanStocks'

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

// 차트 + 펀더멘털 병렬 요청
export async function fetchAllStockData(symbol) {
  const [chart, summary] = await Promise.all([
    getChart(symbol),
    getQuoteSummary(symbol),
  ])
  return { chart, summary }
}

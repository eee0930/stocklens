import { isKorean, searchKoreanStocks } from '../utils/koreanStocks'
import type { SearchResult, HistoryItem } from '../types'

function getTimeInZone(timeZone: string): { dow: number; total: number } {
  const str = new Date().toLocaleString('en-US', { timeZone, hour12: false })
  const [datePart, timePart] = str.split(', ')
  const [month, day, year] = datePart.split('/').map(Number)
  const [hours, minutes] = timePart.split(':').map(Number)
  const dow = new Date(year, month - 1, day).getDay()
  return { dow, total: hours * 60 + minutes }
}

function isUSMarketOpen(): boolean {
  const { dow, total } = getTimeInZone('America/New_York')
  if (dow === 0 || dow === 6) return false
  return total >= 9 * 60 + 30 && total < 16 * 60
}

function isKRMarketOpen(): boolean {
  const { dow, total } = getTimeInZone('Asia/Seoul')
  if (dow === 0 || dow === 6) return false
  return total >= 9 * 60 && total < 15 * 60 + 30
}

export function isMarketOpen(symbol: string): boolean {
  const upper = symbol.toUpperCase()
  return upper.endsWith('.KS') || upper.endsWith('.KQ')
    ? isKRMarketOpen()
    : isUSMarketOpen()
}

async function apiFetch(path: string): Promise<unknown> {
  const res = await fetch(`/api/stock${path}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(err.error || `데이터 요청 실패 (${res.status})`)
  }
  return res.json()
}

export async function searchSymbol(query: string): Promise<SearchResult[]> {
  if (isKorean(query)) {
    const krResults = searchKoreanStocks(query)
    if (krResults.length > 0) return krResults
    throw new Error(`"${query}"에 해당하는 종목을 찾을 수 없습니다.\n한국 주식은 삼성전자, 카카오, SK하이닉스 등으로 검색하거나\n005930.KS처럼 티커 형식으로 입력해보세요.`)
  }
  const quotes = await apiFetch(`/search?q=${encodeURIComponent(query)}`)
  return (Array.isArray(quotes) ? quotes as SearchResult[] : []).filter(q =>
    (q.quoteType === 'EQUITY' || q.quoteType === 'ETF') && q.exchange !== 'PNK'
  )
}

export async function getChart(symbol: string): Promise<HistoryItem[]> {
  const history = await apiFetch(`/chart?symbol=${encodeURIComponent(symbol)}`)
  if (!Array.isArray(history) || history.length === 0) {
    throw new Error(`${symbol}의 주가 데이터를 찾을 수 없습니다.`)
  }
  return history as HistoryItem[]
}

export async function getQuoteSummary(symbol: string): Promise<Record<string, unknown>> {
  try {
    return await apiFetch(`/summary?symbol=${encodeURIComponent(symbol)}`) as Record<string, unknown>
  } catch {
    return {}
  }
}

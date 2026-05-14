import { RSI, MACD, SMA } from 'technicalindicators'
import type { HistoryItem, StockData, ChartPoint, VolumePoint, SMA20Point, EtfHolding } from '../types'

// yahoo-finance2 historical() 반환값:
//   [{ date: Date, open, high, low, close, volume, adjClose }, ...]  시간순

type SummaryRaw = Record<string, unknown>

function raw2(obj: SummaryRaw, key: string): number | null {
  const val = obj[key]
  if (val == null) return null
  if (typeof val === 'object' && val !== null && 'raw' in val) {
    const r = (val as Record<string, unknown>).raw
    return r != null ? Number(r) : null
  }
  return val != null ? Number(val) : null
}

export function processStockData(
  history: HistoryItem[],
  summary: Record<string, unknown>
): StockData {
  if (!history || history.length === 0) throw new Error('주가 데이터가 없습니다.')

  // 날짜 문자열 변환 (TradingView: 'YYYY-MM-DD')
  const toDateStr = (d: Date | string): string => {
    const dt = d instanceof Date ? d : new Date(d)
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
  }

  // 시간순 정렬 보장
  const asc = [...history].sort((a, b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime())

  const closesC  = asc.map(r => r.close)
  const volumesC = asc.map(r => r.volume ?? 0)

  // 최신순
  const desc    = [...asc].reverse()
  const closes  = desc.map(r => r.close)
  const volumes = desc.map(r => r.volume ?? 0)

  const currentPrice = closes[0]
  const prevClose    = closes[1] ?? closes[0]
  const dailyChange  = ((currentPrice - prevClose) / prevClose) * 100

  const sevenDayReturn = closes.length > 7
    ? ((closes[0] - closes[7]) / closes[7]) * 100
    : null

  const avg20Vol = volumes.slice(1, 21).reduce((s, v) => s + v, 0) / Math.min(20, volumes.slice(1).length)
  const volumeGrowthRate = avg20Vol > 0 ? ((volumes[0] - avg20Vol) / avg20Vol) * 100 : null

  // 기술 지표 (시간순 배열 입력)
  const rsiArr = RSI.calculate({ values: closesC, period: 14 })
  const rsi    = rsiArr.length ? rsiArr[rsiArr.length - 1] : null

  const macdArr    = MACD.calculate({ values: closesC, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false })
  const latestMACD = macdArr.length ? macdArr[macdArr.length - 1] : null

  const sma20Arr = SMA.calculate({ values: closesC, period: 20 })
  const sma50Arr = SMA.calculate({ values: closesC, period: 50 })
  const sma20    = sma20Arr.length ? sma20Arr[sma20Arr.length - 1] : null
  const sma50    = sma50Arr.length ? sma50Arr[sma50Arr.length - 1] : null
  const priceVsSMA20 = sma20 ? ((currentPrice - sma20) / sma20) * 100 : null

  // 52주 고저 (summary 우선, 없으면 history에서 계산)
  const sd   = (summary?.summaryDetail as SummaryRaw)       || {}
  const high52 = raw2(sd, 'fiftyTwoWeekHigh')  ?? Math.max(...asc.map(r => r.high))
  const low52  = raw2(sd, 'fiftyTwoWeekLow')   ?? Math.min(...asc.map(r => r.low))
  const priceVs52High = high52 ? ((currentPrice - high52) / high52) * 100 : null
  const priceVs52Low  = low52  ? ((currentPrice - low52)  / low52)  * 100 : null

  // 차트 데이터 (전체, 시간순)
  const chartDays = asc
  const chartData: ChartPoint[] = chartDays.map(r => ({
    time:  toDateStr(r.date),
    open:  r.open,
    high:  r.high,
    low:   r.low,
    close: r.close,
  }))
  const volumeData: VolumePoint[] = chartDays.map(r => ({
    time:  toDateStr(r.date),
    value: r.volume ?? 0,
    color: r.close >= r.open ? 'rgba(248,113,113,0.5)' : 'rgba(96,165,250,0.5)',
  }))

  // SMA20 오버레이
  const sma20Data: SMA20Point[] = (() => {
    const s   = SMA.calculate({ values: closesC, period: 20 })
    const pad = closesC.length - s.length
    return asc.map((r, i) => {
      const si = i - pad
      return si >= 0 ? { time: toDateStr(r.date), value: +s[si].toFixed(4) } : null
    }).filter((x): x is SMA20Point => x !== null)
  })()

  // 펀더멘털
  const fd = (summary?.financialData        as SummaryRaw) || {}
  const ks = (summary?.defaultKeyStatistics as SummaryRaw) || {}
  const ap = (summary?.assetProfile         as SummaryRaw) || {}

  const pct = (v: number | null): string | null => v != null ? (v * 100).toFixed(1) : null
  const mktCap = raw2(sd, 'marketCap') || null

  return {
    companyName:  (ap.longName as string) || '',
    symbol:       '',          // 검색 결과에서 채워짐
    sector:       (ap.sector   as string) || '',
    industry:     (ap.industry as string) || '',
    description:  (ap.longBusinessSummary as string) || '',

    currentPrice,
    prevClose,
    dailyChange,

    sevenDayReturn,
    volumeGrowthRate,
    currentVolume: volumes[0],
    avgVolume20:   avg20Vol,

    rsi,
    macd:          (latestMACD?.MACD      as number) ?? null,
    macdSignal:    (latestMACD?.signal    as number) ?? null,
    macdHistogram: (latestMACD?.histogram as number) ?? null,
    sma20,
    sma50,
    priceVsSMA20,
    priceVs52High,
    priceVs52Low,
    high52,
    low52,

    chartData,
    volumeData,
    sma20Data,

    peRatio:         raw2(sd, 'trailingPE') ?? raw2(ks, 'trailingPE'),
    pegRatio:        raw2(ks, 'pegRatio'),
    eps:             raw2(ks, 'trailingEps'),
    beta:            raw2(ks, 'beta'),
    dividendYield:   raw2(sd, 'dividendYield'),
    analystTarget:   raw2(fd, 'targetMeanPrice'),
    marketCap:       mktCap,
    marketCapFormatted: formatMarketCap(mktCap),
    earningsGrowth:  pct(raw2(fd, 'earningsGrowth')),
    revenueGrowth:   pct(raw2(fd, 'revenueGrowth')),
    operatingMargin: pct(raw2(fd, 'operatingMargins')),
    profitMargin:    pct(raw2(fd, 'profitMargins')),
    roe:             raw2(fd, 'returnOnEquity'),
    roa:             raw2(fd, 'returnOnAssets'),

    etfHoldings: (() => {
      const th = (summary?.topHoldings as Record<string, unknown>) || {}
      const raw = (th.holdings as Array<Record<string, unknown>>) || []
      return raw.slice(0, 10).map((h): EtfHolding => ({
        symbol: String(h.symbol || ''),
        name:   String(h.holdingName || h.symbol || ''),
        weight: typeof h.holdingPercent === 'number' ? h.holdingPercent : 0,
      })).filter(h => h.name)
    })(),
  }
}

export function formatMarketCap(cap: number | null): string {
  if (cap == null) return 'N/A'
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`
  if (cap >= 1e9)  return `$${(cap / 1e9).toFixed(2)}B`
  if (cap >= 1e6)  return `$${(cap / 1e6).toFixed(2)}M`
  return `$${cap.toLocaleString()}`
}

export function getRsiStatus(rsi: number | null): { label: string; color: string } {
  if (rsi == null) return { label: 'N/A', color: 'var(--text-muted)' }
  if (rsi >= 70)   return { label: '과매수', color: 'var(--red)' }
  if (rsi <= 30)   return { label: '과매도', color: 'var(--green)' }
  if (rsi >= 60)   return { label: '강세',   color: 'var(--yellow)' }
  if (rsi <= 40)   return { label: '약세',   color: 'var(--accent)' }
  return { label: '중립', color: 'var(--text-secondary)' }
}

export function getScoreColor(score: number): string {
  if (score >= 75) return '#34d399'
  if (score >= 60) return '#86efac'
  if (score >= 45) return '#fbbf24'
  if (score >= 30) return '#fca5a5'
  return '#f87171'
}

export function getRecommendationClass(rec: string): string {
  const map: Record<string, string> = { '강력매수': 'strong-buy', '매수': 'buy', '중립': 'neutral', '매도': 'sell', '강력매도': 'strong-sell' }
  return map[rec] || 'neutral'
}

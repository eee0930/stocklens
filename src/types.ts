export interface HistoryItem {
  date: Date | string
  open: number
  high: number
  low: number
  close: number
  volume?: number
  adjClose?: number
}

export interface ChartPoint { time: string; open: number; high: number; low: number; close: number }
export interface VolumePoint { time: string; value: number; color: string }
export interface SMA20Point  { time: string; value: number }

export interface StockData {
  companyName: string
  symbol: string
  sector: string
  industry: string
  description: string
  currentPrice: number
  prevClose: number
  dailyChange: number
  sevenDayReturn: number | null
  volumeGrowthRate: number | null
  currentVolume: number
  avgVolume20: number
  rsi: number | null
  macd: number | null
  macdSignal: number | null
  macdHistogram: number | null
  sma20: number | null
  sma50: number | null
  priceVsSMA20: number | null
  priceVs52High: number | null
  priceVs52Low: number | null
  high52: number | null
  low52: number | null
  chartData: ChartPoint[]
  volumeData: VolumePoint[]
  sma20Data: SMA20Point[]
  peRatio: number | null
  pegRatio: number | null
  eps: number | null
  beta: number | null
  dividendYield: number | null
  analystTarget: number | null
  marketCap: number | null
  marketCapFormatted: string
  earningsGrowth: string | null
  revenueGrowth: string | null
  operatingMargin: string | null
  profitMargin: string | null
  roe: number | null
  roa: number | null
}

export interface Analysis {
  score: number
  recommendation: string
  outlook?: string
  longTermOutlook?: string
  reasons: string[]
  risks: string[]
  isRuleBased?: boolean
  geminiError?: string
}

export interface SearchResult {
  symbol: string
  shortname?: string
  longname?: string
  quoteType: string
  exchange: string
}

import { useState } from 'react'
import StockChart from './StockChart'
import MetricsGrid from './MetricsGrid'
import AIAnalysis from './AIAnalysis'
import ETFHoldings from './ETFHoldings'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatMarketCap } from '../utils/calculations'
import type { StockData, Analysis } from '../types'

interface FundRowProps {
  label: string
  value?: string | number | null
  valueClass?: string
}

function FundRow({ label, value, valueClass }: FundRowProps) {
  return (
    <div className="flex justify-between items-center py-[9px] border-b border-border last:border-b-0 gap-2">
      <span className="text-xs text-fg-muted">{label}</span>
      <span className={['text-[13px] font-semibold font-mono text-right', valueClass ?? 'text-fg'].join(' ')}>
        {value ?? 'N/A'}
      </span>
    </div>
  )
}

interface ResultsPageProps {
  stockData: StockData
  analysis: Analysis
  onBack: () => void
  onSearch: (query: string) => Promise<void>
}

export default function ResultsPage({ stockData, analysis, onBack, onSearch }: ResultsPageProps) {
  const [searchVal, setSearchVal] = useState('')

  const {
    companyName, symbol, sector, industry, description,
    currentPrice, dailyChange,
    high52, low52,
    peRatio, pegRatio, eps, dividendYield, analystTarget,
    marketCapFormatted, beta,
    earningsGrowth, revenueGrowth, operatingMargin, profitMargin,
    chartData, volumeData, sma20Data, etfHoldings
  } = stockData

  const isUp = dailyChange >= 0
  const priceSign = isUp ? '+' : ''

  const handleTopSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchVal.trim()) {
      onSearch(searchVal.trim())
      setSearchVal('')
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border sticky top-0 bg-bg/90 backdrop-blur-xl z-[100] gap-3">
        <div
          className="flex items-center gap-2 text-base font-bold text-fg cursor-pointer shrink-0"
          onClick={onBack}
        >
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="rgba(79,142,247,0.15)"/>
            <path d="M8 16 L14 10 L18 14 L24 8" stroke="#4f8ef7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="24" cy="8" r="2" fill="#34d399"/>
          </svg>
          <span>StockLens</span>
        </div>

        {/* Desktop search */}
        <div className="hidden md:flex items-center bg-surface-1 border border-border rounded-lg px-3 py-1.5 gap-2 flex-1 max-w-[360px] focus-within:border-accent transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-fg-muted shrink-0">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="flex-1 bg-transparent border-none outline-none text-[13px] text-fg"
            placeholder="새 종목 검색..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            onKeyDown={handleTopSearch}
          />
        </div>

        <button
          className="bg-transparent border border-border-light rounded-xl px-3.5 py-1.5 text-xs font-medium text-fg-secondary cursor-pointer hover:border-accent hover:text-accent transition-all"
          onClick={onBack}
        >
          ← 홈
        </button>
      </div>

      {/* Mobile search bar */}
      <div className="md:hidden px-4 py-2.5 border-b border-border bg-bg">
        <div className="flex items-center bg-surface-1 border border-border-light rounded-xl py-2.5 px-4 gap-2.5 focus-within:border-accent transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-fg-muted shrink-0">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="flex-1 bg-transparent border-none outline-none text-fg"
            placeholder="새 종목 검색..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            onKeyDown={handleTopSearch}
          />
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 pt-7 pb-16 max-md:px-4 max-md:pt-5 max-md:pb-16">
        {/* Company header */}
        <div className="mb-7 fade-in">
          <div className="inline-flex items-center gap-1.5 bg-surface-2 border border-border rounded px-2.5 py-1 text-[11px] text-fg-muted uppercase tracking-wide mb-2.5">
            <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="#34d399"/></svg>
            US Stock
          </div>
          <div className="text-3xl font-bold text-fg tracking-tight leading-tight mb-1 max-md:text-[22px]">{companyName}</div>
          <div>
            <span className="inline-block text-[13px] font-medium font-mono text-accent bg-accent/12 border border-accent/20 rounded px-2 py-0.5 mr-2.5 max-md:text-xs">
              {symbol}
            </span>
            {sector && (
              <span className="text-[13px] text-fg-muted max-[480px]:hidden">
                {sector}{industry ? ` · ${industry}` : ''}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-3 mt-3.5 flex-wrap">
            <span className="text-[40px] font-bold font-mono text-fg tracking-tight max-md:text-[32px] max-[480px]:text-[28px]">
              ${currentPrice?.toFixed(2)}
            </span>
            <span className={['text-lg font-semibold font-mono max-md:text-[15px]', isUp ? 'text-red' : 'text-blue'].join(' ')}>
              {priceSign}{dailyChange?.toFixed(2)}%
            </span>
            <span className="text-[13px] text-fg-muted">당일 변동</span>
          </div>
        </div>

        {/* Metrics */}
        <MetricsGrid stockData={stockData} />

        {/* Main layout */}
        <div className="grid grid-cols-[1fr_380px] gap-6 items-start max-[900px]:grid-cols-1">
          {/* Left column */}
          <div className="flex flex-col gap-6">
            {/* Chart */}
            <Card className="fade-in-delay">
              <StockChart
                chartData={chartData}
                volumeData={volumeData}
                sma20Data={sma20Data}
                symbol={symbol}
              />
            </Card>

            {/* ETF Holdings */}
            {etfHoldings.length > 0 && <ETFHoldings holdings={etfHoldings} onSearch={onSearch} />}

            {/* Fundamentals */}
            <Card className="fade-in-delay-2">
              <CardHeader>
                <CardTitle>펀더멘털</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-6 max-md:grid-cols-1">
                  <div>
                    <FundRow label="시가총액"  value={marketCapFormatted} />
                    <FundRow label="P/E 비율"  value={peRatio != null ? parseFloat(String(peRatio)).toFixed(1) : null} />
                    <FundRow label="PEG 비율"  value={pegRatio != null ? parseFloat(String(pegRatio)).toFixed(2) : null} />
                    <FundRow label="EPS"       value={eps != null ? `$${parseFloat(String(eps)).toFixed(2)}` : null} />
                    <FundRow label="베타"       value={beta != null ? parseFloat(String(beta)).toFixed(2) : null} />
                    <FundRow label="배당수익률" value={dividendYield != null && parseFloat(String(dividendYield)) > 0 ? `${(parseFloat(String(dividendYield))*100).toFixed(2)}%` : '없음'} />
                  </div>
                  <div>
                    <FundRow
                      label="분기실적성장"
                      value={earningsGrowth != null ? `${parseFloat(earningsGrowth) > 0 ? '+' : ''}${earningsGrowth}%` : null}
                      valueClass={earningsGrowth != null ? (parseFloat(earningsGrowth) > 0 ? 'text-red' : 'text-blue') : ''}
                    />
                    <FundRow
                      label="분기매출성장"
                      value={revenueGrowth != null ? `${parseFloat(revenueGrowth) > 0 ? '+' : ''}${revenueGrowth}%` : null}
                      valueClass={revenueGrowth != null ? (parseFloat(revenueGrowth) > 0 ? 'text-red' : 'text-blue') : ''}
                    />
                    <FundRow
                      label="영업이익률"
                      value={operatingMargin != null ? `${operatingMargin}%` : null}
                      valueClass={operatingMargin != null && parseFloat(operatingMargin) > 0 ? 'text-red' : ''}
                    />
                    <FundRow
                      label="순이익률"
                      value={profitMargin != null ? `${profitMargin}%` : null}
                      valueClass={profitMargin != null && parseFloat(profitMargin) > 0 ? 'text-red' : ''}
                    />
                    <FundRow label="52주 고점" value={high52 ? `$${high52.toFixed(2)}` : null} />
                    <FundRow label="52주 저점" value={low52  ? `$${low52.toFixed(2)}`  : null} />
                  </div>
                </div>

                {analystTarget != null && (
                  <div className="mt-4 px-3.5 py-3 bg-surface-2 rounded-lg flex justify-between items-center">
                    <span className="text-xs text-fg-muted">애널리스트 목표주가</span>
                    <span className="text-[15px] font-bold font-mono text-accent">
                      ${parseFloat(String(analystTarget)).toFixed(2)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Description */}
            {description && (
              <Card className="fade-in-delay-2">
                <CardHeader>
                  <CardTitle>기업 개요</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[13px] text-fg-secondary leading-[1.7]">
                    {description.length > 400 ? description.slice(0, 400) + '...' : description}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column — AI Analysis (moves to top on mobile) */}
          <div className="max-[900px]:order-first">
            <AIAnalysis analysis={analysis} />
          </div>
        </div>
      </div>
    </div>
  )
}

export { formatMarketCap }

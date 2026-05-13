import { useState } from 'react'
import StockChart from './StockChart'
import MetricsGrid from './MetricsGrid'
import AIAnalysis from './AIAnalysis'
import { formatMarketCap } from '../utils/calculations'

function FundRow({ label, value, colorClass }) {
  return (
    <div className="fundamental-row">
      <span className="fundamental-key">{label}</span>
      <span className={`fundamental-val${colorClass ? ` ${colorClass}` : ''}`}>{value ?? 'N/A'}</span>
    </div>
  )
}

export default function ResultsPage({ stockData, analysis, onBack, onSearch }) {
  const [searchVal, setSearchVal] = useState('')

  const {
    companyName, symbol, sector, industry, description,
    currentPrice, dailyChange,
    high52, low52,
    peRatio, pegRatio, eps, dividendYield, analystTarget,
    marketCapFormatted, beta,
    earningsGrowth, revenueGrowth, operatingMargin, profitMargin,
    chartData, volumeData, sma20Data
  } = stockData

  const priceColor = dailyChange >= 0 ? 'up' : 'down'
  const priceSign  = dailyChange >= 0 ? '+' : ''

  const handleTopSearch = (e) => {
    if (e.key === 'Enter' && searchVal.trim()) {
      onSearch(searchVal.trim())
      setSearchVal('')
    }
  }

  return (
    <div className="results-page">
      {/* Top bar */}
      <div className="results-topbar">
        <div className="topbar-logo" onClick={onBack}>
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="rgba(79,142,247,0.15)"/>
            <path d="M8 16 L14 10 L18 14 L24 8" stroke="#4f8ef7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="24" cy="8" r="2" fill="#34d399"/>
          </svg>
          <span>StockLens</span>
        </div>

        <div className="topbar-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit' }}
            placeholder="새 종목 검색..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            onKeyDown={handleTopSearch}
          />
        </div>

        <button className="btn-outline" style={{ fontSize: 12, padding: '7px 14px' }} onClick={onBack}>
          ← 홈
        </button>
      </div>

      {/* Mobile search bar */}
      <div className="mobile-search-bar">
        <div className="search-input-wrapper">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 16, color: 'var(--text-primary)', fontFamily: 'inherit' }}
            placeholder="새 종목 검색..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            onKeyDown={handleTopSearch}
          />
        </div>
      </div>

      <div className="results-content">
        {/* Company header */}
        <div className="company-header fade-in">
          <div className="company-badge">
            <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="var(--green)"/></svg>
            US Stock
          </div>
          <div className="company-name">{companyName}</div>
          <div>
            <span className="company-ticker">{symbol}</span>
            {sector && <span className="company-sector">{sector}{industry ? ` · ${industry}` : ''}</span>}
          </div>
          <div className="price-row">
            <span className="price-current mono">${currentPrice?.toFixed(2)}</span>
            <span className={`price-change ${priceColor}`}>
              {priceSign}{dailyChange?.toFixed(2)}%
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>당일 변동</span>
          </div>
        </div>

        {/* Metrics */}
        <MetricsGrid stockData={stockData} />

        {/* Main layout */}
        <div className="two-col">
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Chart */}
            <div className="card fade-in-delay">
              <StockChart
                chartData={chartData}
                volumeData={volumeData}
                sma20Data={sma20Data}
                symbol={symbol}
              />
            </div>

            {/* Fundamentals */}
            <div className="card fade-in-delay-2">
              <div className="card-header">
                <span className="card-title">펀더멘털</span>
              </div>
              <div className="card-body">
                <div className="fund-cols">
                  <div>
                    <FundRow label="시가총액"  value={marketCapFormatted} />
                    <FundRow label="P/E 비율"  value={peRatio && peRatio !== 'None' ? parseFloat(peRatio).toFixed(1) : null} />
                    <FundRow label="PEG 비율"  value={pegRatio && pegRatio !== 'None' ? parseFloat(pegRatio).toFixed(2) : null} />
                    <FundRow label="EPS"       value={eps && eps !== 'None' ? `$${parseFloat(eps).toFixed(2)}` : null} />
                    <FundRow label="베타"       value={beta && beta !== 'None' ? parseFloat(beta).toFixed(2) : null} />
                    <FundRow label="배당수익률" value={dividendYield && dividendYield !== 'None' && parseFloat(dividendYield) > 0 ? `${(parseFloat(dividendYield)*100).toFixed(2)}%` : '없음'} />
                  </div>
                  <div>
                    <FundRow
                      label="분기실적성장"
                      value={earningsGrowth != null ? `${earningsGrowth > 0 ? '+' : ''}${earningsGrowth}%` : null}
                      colorClass={earningsGrowth != null && parseFloat(earningsGrowth) > 0 ? 'up' : earningsGrowth != null ? 'down' : ''}
                    />
                    <FundRow
                      label="분기매출성장"
                      value={revenueGrowth != null ? `${revenueGrowth > 0 ? '+' : ''}${revenueGrowth}%` : null}
                      colorClass={revenueGrowth != null && parseFloat(revenueGrowth) > 0 ? 'up' : revenueGrowth != null ? 'down' : ''}
                    />
                    <FundRow
                      label="영업이익률"
                      value={operatingMargin != null ? `${operatingMargin}%` : null}
                      colorClass={operatingMargin != null && parseFloat(operatingMargin) > 0 ? 'up' : ''}
                    />
                    <FundRow
                      label="순이익률"
                      value={profitMargin != null ? `${profitMargin}%` : null}
                      colorClass={profitMargin != null && parseFloat(profitMargin) > 0 ? 'up' : ''}
                    />
                    <FundRow label="52주 고점"  value={high52 ? `$${high52.toFixed(2)}` : null} />
                    <FundRow label="52주 저점"  value={low52  ? `$${low52.toFixed(2)}`  : null} />
                  </div>
                </div>

                {analystTarget && analystTarget !== 'None' && (
                  <div style={{
                    marginTop: 16,
                    padding: '12px 14px',
                    background: 'var(--surface-2)',
                    borderRadius: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>애널리스트 목표주가</span>
                    <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent)' }}>
                      ${parseFloat(analystTarget).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {description && (
              <div className="card fade-in-delay-2">
                <div className="card-header">
                  <span className="card-title">기업 개요</span>
                </div>
                <div className="card-body">
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                    {description.length > 400 ? description.slice(0, 400) + '...' : description}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right column — AI Analysis */}
          <div>
            <AIAnalysis analysis={analysis} />
          </div>
        </div>
      </div>
    </div>
  )
}

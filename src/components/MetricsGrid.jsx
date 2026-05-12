import { getRsiStatus } from '../utils/calculations'

function MetricCard({ label, value, sub, colorClass, barPercent, barColor, extra }) {
  return (
    <div className="metric-card fade-in">
      <div className="metric-label">{label}</div>
      <div className={`metric-value${colorClass ? ` ${colorClass}` : ''}`}>{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
      {barPercent != null && (
        <div className="metric-bar">
          <div
            className="metric-bar-fill"
            style={{ width: `${Math.min(100, Math.max(0, barPercent))}%`, background: barColor || 'var(--accent)' }}
          />
        </div>
      )}
      {extra}
    </div>
  )
}

export default function MetricsGrid({ stockData }) {
  const {
    sevenDayReturn,
    volumeGrowthRate,
    rsi,
    earningsGrowth,
    operatingMargin,
    peRatio,
    macd,
    macdHistogram,
    priceVsSMA20,
    priceVs52High,
    priceVs52Low,
    beta
  } = stockData

  const rsiStatus = getRsiStatus(rsi)
  const fmt = (v, decimals = 2, suffix = '%') =>
    v != null ? `${v > 0 ? '+' : ''}${parseFloat(v).toFixed(decimals)}${suffix}` : 'N/A'

  const colorClass = (v) => {
    if (v == null) return ''
    return parseFloat(v) > 0 ? 'up' : parseFloat(v) < 0 ? 'down' : ''
  }

  const macdBull = macdHistogram != null && macdHistogram > 0

  return (
    <div className="metrics-grid">
      {/* 7-day return */}
      <MetricCard
        label="7일 수익률"
        value={fmt(sevenDayReturn)}
        sub="최근 7거래일"
        colorClass={colorClass(sevenDayReturn)}
        barPercent={sevenDayReturn != null ? 50 + Math.min(50, Math.max(-50, sevenDayReturn)) : null}
        barColor={sevenDayReturn >= 0 ? 'var(--green)' : 'var(--red)'}
      />

      {/* Volume growth */}
      <MetricCard
        label="거래량 증가율"
        value={fmt(volumeGrowthRate)}
        sub="vs 20일 평균"
        colorClass={volumeGrowthRate != null && volumeGrowthRate > 0 ? 'up' : volumeGrowthRate < 0 ? 'down' : ''}
        barPercent={volumeGrowthRate != null ? Math.min(100, 50 + volumeGrowthRate / 2) : null}
        barColor={volumeGrowthRate >= 0 ? 'var(--green)' : 'var(--red)'}
      />

      {/* RSI */}
      <MetricCard
        label="RSI (14)"
        value={rsi != null ? rsi.toFixed(1) : 'N/A'}
        sub={rsiStatus.label}
        colorClass={rsi >= 70 ? 'down' : rsi <= 30 ? 'up' : ''}
        extra={
          rsi != null && (
            <div className="rsi-gauge" style={{ marginTop: 10 }}>
              <div className="rsi-needle" style={{ left: `${rsi}%` }} />
            </div>
          )
        }
      />

      {/* Earnings growth */}
      <MetricCard
        label="분기 실적 성장"
        value={earningsGrowth != null ? `${earningsGrowth > 0 ? '+' : ''}${earningsGrowth}%` : 'N/A'}
        sub="YoY 분기 EPS"
        colorClass={colorClass(earningsGrowth)}
      />

      {/* Operating margin */}
      <MetricCard
        label="영업이익률"
        value={operatingMargin != null ? `${operatingMargin}%` : 'N/A'}
        sub="TTM"
        colorClass={operatingMargin != null && parseFloat(operatingMargin) > 15 ? 'up' : ''}
        barPercent={operatingMargin != null ? Math.min(100, Math.max(0, parseFloat(operatingMargin))) : null}
        barColor="var(--accent)"
      />

      {/* P/E */}
      <MetricCard
        label="P/E 비율"
        value={peRatio && peRatio !== 'None' ? parseFloat(peRatio).toFixed(1) : 'N/A'}
        sub={peRatio && parseFloat(peRatio) < 15 ? '저평가 영역' : peRatio && parseFloat(peRatio) > 30 ? '고평가 영역' : '적정 수준'}
        colorClass={peRatio && parseFloat(peRatio) < 15 ? 'up' : peRatio && parseFloat(peRatio) > 40 ? 'warn' : ''}
      />

      {/* MACD */}
      <MetricCard
        label="MACD"
        value={macd != null ? macd.toFixed(3) : 'N/A'}
        sub={macdHistogram != null ? `히스토: ${macdHistogram > 0 ? '+' : ''}${macdHistogram.toFixed(3)}` : ''}
        colorClass={macdBull ? 'up' : 'down'}
      />

      {/* vs SMA20 */}
      <MetricCard
        label="SMA20 대비"
        value={priceVsSMA20 != null ? fmt(priceVsSMA20) : 'N/A'}
        sub="20일 이동평균"
        colorClass={colorClass(priceVsSMA20)}
      />

      {/* Beta */}
      <MetricCard
        label="베타"
        value={beta && beta !== 'None' ? parseFloat(beta).toFixed(2) : 'N/A'}
        sub={beta && parseFloat(beta) > 1.5 ? '고변동성' : beta && parseFloat(beta) < 0.8 ? '저변동성' : '시장 유사'}
        colorClass={beta && parseFloat(beta) > 2 ? 'warn' : ''}
      />
    </div>
  )
}

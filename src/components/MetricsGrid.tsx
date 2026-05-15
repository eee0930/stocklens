import { useState, useRef, useEffect } from 'react'
import { getRsiStatus } from '../utils/calculations'
import type { StockData } from '../types'

const TOOLTIPS: Record<string, string> = {
  sevenDayReturn:  '최근 7거래일 주가 변동률.\n양수면 단기 상승 모멘텀, 음수면 하락 압력입니다.\n급격한 상승 후엔 차익실현 가능성도 고려하세요.',
  volumeGrowth:    '오늘 거래량 vs 20일 평균 거래량.\n상승 + 거래량 급증 → 강한 매수 신호\n하락 + 거래량 급증 → 강한 매도 신호',
  rsi:             '과매수·과매도 지표 (0~100).\n· 70 이상: 과매수 (조정 주의)\n· 30 이하: 과매도 (반등 가능)\n· 30~70: 중립 구간',
  earningsGrowth:  '전년 동기 대비 EPS(주당순이익) 성장률.\n지속적인 플러스 성장은 주가 상승의 핵심 동력,\n마이너스는 실적 악화를 의미합니다.',
  operatingMargin: '매출 대비 영업이익 비율.\n· 15% 이상: 우수\n· 5% 미만: 수익성 주의\n높을수록 비용 효율이 좋고 경쟁력이 강합니다.',
  peRatio:         '주가 ÷ EPS. 기업 가치 평가 지표.\n· 15 미만: 저평가 가능\n· 30 이상: 고평가 가능\n성장주는 높은 P/E를 가질 수 있으며 업종 평균과 비교하세요.',
  macd:            '단기(12일)와 장기(26일) 이동평균의 차이.\n히스토그램 양수 → 상승 추세\n히스토그램 음수 → 하락 추세\n시그널선 상향 돌파 시 매수 신호입니다.',
  sma20:           '현재 주가 vs 20일 이동평균 괴리율.\n양수 → 이동평균 위 (단기 상승 추세)\n음수 → 이동평균 아래 (단기 약세)',
  beta:            '시장 지수 대비 변동성 민감도.\n· 1 초과: 시장보다 변동성 큼\n· 1 미만: 시장보다 안정적\n· 2 이상: 고변동성 주의',
}

interface MetricCardProps {
  label: string
  value: string
  sub?: string
  valueClass?: string
  barPercent?: number | null
  barColor?: string
  extra?: React.ReactNode
  tooltip?: string
}

function MetricCard({ label, value, sub, valueClass, barPercent, barColor, extra, tooltip }: MetricCardProps) {
  const [showTip, setShowTip] = useState(false)
  const [tipStyle, setTipStyle] = useState<React.CSSProperties>({})
  const wrapperRef = useRef<HTMLDivElement>(null)
  const touchActiveRef = useRef(false)

  const handleOpen = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect()
      const spaceLeft  = rect.right
      const spaceRight = window.innerWidth - rect.left
      const MARGIN = 8
      if (spaceLeft >= spaceRight) {
        setTipStyle({ right: 0, left: 'auto', width: Math.min(210, spaceLeft - MARGIN) })
      } else {
        setTipStyle({ left: 0, right: 'auto', width: Math.min(210, spaceRight - MARGIN) })
      }
    }
    setShowTip(true)
  }

  useEffect(() => {
    if (!showTip) return
    const onTouch = (e: TouchEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setShowTip(false)
    }
    document.addEventListener('touchstart', onTouch)
    return () => document.removeEventListener('touchstart', onTouch)
  }, [showTip])

  return (
    <div
      className="bg-surface-1 border border-border rounded-xl p-4 relative hover:border-border-light transition-colors fade-in"
      style={showTip ? { zIndex: 999 } : undefined}
    >
      {tooltip && (
        <div
          ref={wrapperRef}
          className="absolute top-2.5 right-2.5 z-[1]"
          onMouseEnter={() => { if (!touchActiveRef.current) handleOpen() }}
          onMouseLeave={() => { if (!touchActiveRef.current) setShowTip(false) }}
        >
          <button
            className="w-[18px] h-[18px] rounded-full bg-surface-3 border border-border-light text-fg-muted text-[10px] font-bold cursor-pointer flex items-center justify-center hover:border-accent hover:text-accent transition-colors"
            onTouchStart={() => {
              touchActiveRef.current = true
              setTimeout(() => { touchActiveRef.current = false }, 600)
            }}
            onClick={() => showTip ? setShowTip(false) : handleOpen()}
            aria-label="지표 설명"
          >!</button>
          {showTip && (
            <div
              className="absolute top-[calc(100%+6px)] bg-surface-2 border border-border-light rounded-xl p-2.5 px-3 text-[11px] leading-[1.65] text-fg-secondary z-[999] whitespace-pre-line shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
              style={tipStyle}
            >
              {tooltip}
            </div>
          )}
        </div>
      )}
      <div className="text-[11px] font-medium text-fg-muted uppercase tracking-wide mb-2">{label}</div>
      <div className={['text-[22px] font-bold font-mono tracking-tight leading-none mb-1', valueClass ?? 'text-fg'].join(' ')}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-fg-muted">{sub}</div>}
      {barPercent != null && (
        <div className="h-[3px] bg-surface-3 rounded-sm mt-2.5 overflow-hidden">
          <div
            className="h-full rounded-sm transition-all duration-[600ms]"
            style={{ width: `${Math.min(100, Math.max(0, barPercent))}%`, background: barColor || '#4f8ef7' }}
          />
        </div>
      )}
      {extra}
    </div>
  )
}

interface MetricsGridProps {
  stockData: StockData
}

export default function MetricsGrid({ stockData }: MetricsGridProps) {
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
    beta
  } = stockData

  const rsiStatus = getRsiStatus(rsi)
  const fmt = (v: number | null | undefined, decimals = 2, suffix = '%') =>
    v != null ? `${v > 0 ? '+' : ''}${parseFloat(String(v)).toFixed(decimals)}${suffix}` : 'N/A'

  const upDown = (v: number | string | null | undefined): string => {
    if (v == null) return 'text-fg'
    return parseFloat(String(v)) > 0 ? 'text-red' : parseFloat(String(v)) < 0 ? 'text-blue' : 'text-fg'
  }

  const macdBull = macdHistogram != null && macdHistogram > 0

  return (
    <div className="grid grid-cols-3 gap-3 mb-6 max-[480px]:grid-cols-2">
      <MetricCard
        label="7일 수익률"
        value={fmt(sevenDayReturn)}
        sub="최근 7거래일"
        valueClass={upDown(sevenDayReturn)}
        barPercent={sevenDayReturn != null ? 50 + Math.min(50, Math.max(-50, sevenDayReturn)) : null}
        barColor={sevenDayReturn != null && sevenDayReturn >= 0 ? '#f87171' : '#60a5fa'}
        tooltip={TOOLTIPS.sevenDayReturn}
      />

      <MetricCard
        label="거래량 증가율"
        value={fmt(volumeGrowthRate)}
        sub="vs 20일 평균"
        valueClass={upDown(volumeGrowthRate)}
        barPercent={volumeGrowthRate != null ? Math.min(100, 50 + volumeGrowthRate / 2) : null}
        barColor={volumeGrowthRate != null && volumeGrowthRate >= 0 ? '#f87171' : '#60a5fa'}
        tooltip={TOOLTIPS.volumeGrowth}
      />

      <MetricCard
        label="RSI (14)"
        value={rsi != null ? rsi.toFixed(1) : 'N/A'}
        sub={rsiStatus.label}
        valueClass={rsi != null && rsi >= 70 ? 'text-blue' : rsi != null && rsi <= 30 ? 'text-red' : 'text-fg'}
        extra={
          rsi != null && (
            <div className="rsi-gauge">
              <div className="rsi-needle" style={{ left: `${rsi}%` }} />
            </div>
          )
        }
        tooltip={TOOLTIPS.rsi}
      />

      <MetricCard
        label="분기 실적 성장"
        value={earningsGrowth != null ? `${parseFloat(earningsGrowth) > 0 ? '+' : ''}${earningsGrowth}%` : 'N/A'}
        sub="YoY 분기 EPS"
        valueClass={upDown(earningsGrowth)}
        tooltip={TOOLTIPS.earningsGrowth}
      />

      <MetricCard
        label="영업이익률"
        value={operatingMargin != null ? `${operatingMargin}%` : 'N/A'}
        sub="TTM"
        valueClass={operatingMargin != null && parseFloat(operatingMargin) > 15 ? 'text-red' : 'text-fg'}
        barPercent={operatingMargin != null ? Math.min(100, Math.max(0, parseFloat(operatingMargin))) : null}
        barColor="#4f8ef7"
        tooltip={TOOLTIPS.operatingMargin}
      />

      <MetricCard
        label="P/E 비율"
        value={peRatio != null ? parseFloat(String(peRatio)).toFixed(1) : 'N/A'}
        sub={peRatio != null && parseFloat(String(peRatio)) < 15 ? '저평가 영역' : peRatio != null && parseFloat(String(peRatio)) > 30 ? '고평가 영역' : '적정 수준'}
        valueClass={peRatio != null && parseFloat(String(peRatio)) < 15 ? 'text-red' : peRatio != null && parseFloat(String(peRatio)) > 40 ? 'text-yellow' : 'text-fg'}
        tooltip={TOOLTIPS.peRatio}
      />

      <MetricCard
        label="MACD"
        value={macd != null ? macd.toFixed(3) : 'N/A'}
        sub={macdHistogram != null ? `히스토: ${macdHistogram > 0 ? '+' : ''}${macdHistogram.toFixed(3)}` : ''}
        valueClass={macdBull ? 'text-red' : 'text-blue'}
        tooltip={TOOLTIPS.macd}
      />

      <MetricCard
        label="SMA20 대비"
        value={priceVsSMA20 != null ? fmt(priceVsSMA20) : 'N/A'}
        sub="20일 이동평균"
        valueClass={upDown(priceVsSMA20)}
        tooltip={TOOLTIPS.sma20}
      />

      <MetricCard
        label="베타"
        value={beta != null ? parseFloat(String(beta)).toFixed(2) : 'N/A'}
        sub={beta != null && parseFloat(String(beta)) > 1.5 ? '고변동성' : beta != null && parseFloat(String(beta)) < 0.8 ? '저변동성' : '시장 유사'}
        valueClass={beta != null && parseFloat(String(beta)) > 2 ? 'text-yellow' : 'text-fg'}
        tooltip={TOOLTIPS.beta}
      />
    </div>
  )
}

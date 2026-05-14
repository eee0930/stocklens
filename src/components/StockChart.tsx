import { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts'
import type { ChartPoint, VolumePoint, SMA20Point } from '../types'

interface StockChartProps {
  chartData: ChartPoint[]
  volumeData: VolumePoint[]
  sma20Data: SMA20Point[]
  symbol: string
}

export default function StockChart({ chartData, volumeData, sma20Data, symbol: _symbol }: StockChartProps) {
  const mainRef   = useRef<HTMLDivElement>(null)
  const chartRef  = useRef<ReturnType<typeof createChart> | null>(null)
  const [range, setRange] = useState('1M')

  useEffect(() => {
    if (!mainRef.current || !chartData?.length) return

    const container = mainRef.current
    const isMobile  = container.clientWidth < 480
    const chartH    = isMobile ? 220 : 320
    const volH      = isMobile ? 60  : 80

    // ── Main chart
    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#6b7280',
        fontFamily: "'JetBrains Mono', monospace"
      },
      grid: {
        vertLines: { color: '#1e2025', style: 1 },
        horzLines: { color: '#1e2025', style: 1 }
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#4f8ef7', width: 1, style: 2, labelBackgroundColor: '#1a1b23' },
        horzLine: { color: '#4f8ef7', width: 1, style: 2, labelBackgroundColor: '#1a1b23' }
      },
      rightPriceScale: { borderColor: '#1e2025' },
      timeScale: { borderColor: '#1e2025', timeVisible: true, secondsVisible: false },
      width: container.clientWidth,
      height: chartH + volH
    })

    chartRef.current = chart

    // Candlestick
    const candleSeries = chart.addCandlestickSeries({
      upColor:      '#f87171',
      downColor:    '#60a5fa',
      borderVisible: false,
      wickUpColor:   '#f87171',
      wickDownColor: '#60a5fa',
      priceScaleId: 'right'
    })

    // Volume (histogram on separate scale)
    const volumeSeries = chart.addHistogramSeries({
      priceFormat:    { type: 'volume' },
      priceScaleId:   'volume',
      color:          'rgba(52,211,153,0.4)',
    })
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 }
    })

    // SMA 20 overlay
    const sma20Series = chart.addLineSeries({
      color:          '#fbbf24',
      lineWidth:      1,
      priceScaleId:   'right',
      crosshairMarkerVisible: false,
      lastValueVisible: true,
      priceLineVisible: false
    })

    candleSeries.setData(chartData)
    if (volumeData?.length) volumeSeries.setData(volumeData)
    if (sma20Data?.length)  sma20Series.setData(sma20Data)

    chart.timeScale().fitContent()

    // Resize handler
    const ro = new ResizeObserver(() => {
      if (!container) return
      const w  = container.clientWidth
      const mobile = w < 480
      chart.applyOptions({
        width:  w,
        height: (mobile ? 220 : 320) + (mobile ? 60 : 80)
      })
    })
    ro.observe(container)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
    }
  }, [chartData, volumeData, sma20Data])

  // Range selector
  const applyRange = (r: string) => {
    setRange(r)
    if (!chartRef.current || !chartData?.length) return
    const days: Record<string, number> = { '1W': 5, '1M': 21, '3M': 63, '1Y': 252, '5Y': 1260, 'ALL': chartData.length }
    const n = days[r] ?? chartData.length
    const slice = chartData.slice(-n)
    if (slice.length) {
      chartRef.current.timeScale().setVisibleRange({ from: slice[0].time as unknown as import('lightweight-charts').Time, to: slice[slice.length - 1].time as unknown as import('lightweight-charts').Time })
    }
  }

  return (
    <div>
      <div className="card-header" style={{ padding: '12px 20px' }}>
        <span className="card-title">차트</span>
        <div className="chart-tabs">
          {['1W', '1M', '3M', '1Y', '5Y', 'ALL'].map((r) => (
            <button
              key={r}
              className={`chart-tab${range === r ? ' active' : ''}`}
              onClick={() => applyRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 4px 4px' }}>
        <div ref={mainRef} style={{ width: '100%' }} />
      </div>

      <div style={{ padding: '8px 20px 12px', display: 'flex', gap: 16 }}>
        <span className="volume-indicator">
          <span className="volume-dot" style={{ background: '#f87171' }} /> 상승
        </span>
        <span className="volume-indicator">
          <span className="volume-dot" style={{ background: '#60a5fa' }} /> 하락
        </span>
        <span className="volume-indicator" style={{ color: '#fbbf24' }}>— SMA 20</span>
      </div>
    </div>
  )
}

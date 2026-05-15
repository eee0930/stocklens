import { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts'
import { CardHeader, CardTitle } from '@/components/ui/card'
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

    const candleSeries = chart.addCandlestickSeries({
      upColor:      '#f87171',
      downColor:    '#60a5fa',
      borderVisible: false,
      wickUpColor:   '#f87171',
      wickDownColor: '#60a5fa',
      priceScaleId: 'right'
    })

    const volumeSeries = chart.addHistogramSeries({
      priceFormat:    { type: 'volume' },
      priceScaleId:   'volume',
      color:          'rgba(52,211,153,0.4)',
    })
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 }
    })

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

    const initialSlice = chartData.slice(-21)
    if (initialSlice.length) {
      chart.timeScale().setVisibleRange({
        from: initialSlice[0].time as unknown as import('lightweight-charts').Time,
        to: initialSlice[initialSlice.length - 1].time as unknown as import('lightweight-charts').Time
      })
    }

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
      <CardHeader className="px-5 py-3">
        <CardTitle>차트</CardTitle>
        <div className="flex gap-1">
          {['1W', '1M', '3M', '1Y', '5Y', 'ALL'].map((r) => (
            <button
              key={r}
              className={[
                'bg-transparent border rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer transition-all',
                range === r
                  ? 'bg-surface-3 border-border-light text-fg'
                  : 'border-transparent text-fg-muted hover:text-fg-secondary',
              ].join(' ')}
              onClick={() => applyRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </CardHeader>

      <div className="px-1 pb-1">
        <div ref={mainRef} className="w-full" />
      </div>

      <div className="px-5 py-3 flex gap-4">
        <span className="flex items-center gap-1.5 text-[11px] text-fg-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-red inline-block" /> 상승
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-fg-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-blue inline-block" /> 하락
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-yellow">— SMA 20</span>
      </div>
    </div>
  )
}

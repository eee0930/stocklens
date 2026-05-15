import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import type { EtfHolding } from '../types'

interface ETFHoldingsProps {
  holdings: EtfHolding[]
  onSearch: (query: string) => void
}

export default function ETFHoldings({ holdings, onSearch }: ETFHoldingsProps) {
  if (!holdings.length) return null

  const maxWeight = Math.max(...holdings.map(h => h.weight))

  return (
    <Card className="fade-in-delay-2">
      <CardHeader>
        <CardTitle>ETF 상위 보유 종목</CardTitle>
        <span className="text-[11px] text-fg-muted">TOP {holdings.length}</span>
      </CardHeader>
      <div className="pb-1">
        {holdings.map((h, i) => (
          <div
            key={i}
            className={[
              'flex items-center gap-2.5 px-5 py-[9px] transition-colors',
              i < holdings.length - 1 ? 'border-b border-border' : '',
              h.symbol ? 'cursor-pointer hover:bg-surface-2' : '',
            ].join(' ')}
            onClick={() => h.symbol && onSearch(h.symbol)}
          >
            <span className="w-5 text-[11px] text-fg-muted text-right shrink-0">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-[13px] font-semibold text-fg break-words">{h.name}</span>
                <span className="text-xs font-bold text-accent shrink-0 ml-2">{(h.weight * 100).toFixed(2)}%</span>
              </div>
              <div className="flex items-center gap-2">
                {h.symbol && (
                  <span className="text-[10px] text-fg-muted font-mono">{h.symbol}</span>
                )}
                <div className="flex-1 h-[3px] bg-surface-2 rounded-sm">
                  <div
                    className="h-full bg-accent rounded-sm opacity-70"
                    style={{ width: `${(h.weight / maxWeight) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

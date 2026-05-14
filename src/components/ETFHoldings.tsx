import type { EtfHolding } from '../types'

interface ETFHoldingsProps {
  holdings: EtfHolding[]
  onSearch: (query: string) => void
}

export default function ETFHoldings({ holdings, onSearch }: ETFHoldingsProps) {
  if (!holdings.length) return null

  const maxWeight = Math.max(...holdings.map(h => h.weight))

  return (
    <div className="card fade-in-delay-2">
      <div className="card-header">
        <span className="card-title">ETF 상위 보유 종목</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>TOP {holdings.length}</span>
      </div>
      <div className="card-body" style={{ padding: '0 0 4px' }}>
        {holdings.map((h, i) => (
          <div key={i} onClick={() => h.symbol && onSearch(h.symbol)} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 20px',
            borderBottom: i < holdings.length - 1 ? '1px solid var(--border)' : 'none',
            cursor: h.symbol ? 'pointer' : 'default',
          }} onMouseEnter={e => { if (h.symbol) (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)' }}
             onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = '' }}>
            <span style={{ width: 20, fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
              {i + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                  {h.name}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', flexShrink: 0, marginLeft: 8 }}>
                  {(h.weight * 100).toFixed(2)}%
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {h.symbol && (
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{h.symbol}</span>
                )}
                <div style={{ flex: 1, height: 3, background: 'var(--surface-2)', borderRadius: 2 }}>
                  <div style={{
                    width: `${(h.weight / maxWeight) * 100}%`,
                    height: '100%',
                    background: 'var(--accent)',
                    borderRadius: 2,
                    opacity: 0.7,
                  }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

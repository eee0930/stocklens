import { useState } from 'react'

const US_EXAMPLES = ['NVDA', 'SMH', 'SCHD', 'VOO', 'QQQ']
const KR_EXAMPLES = ['삼성전자', 'SK하이닉스', '현대차', 'KODEX 미국나스닥100', 'TIGER 미국S&P500']

interface SearchPageProps {
  onSearch: (query: string) => Promise<void>
}

export default function SearchPage({ onSearch }: SearchPageProps) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) return
    setLoading(true)
    await onSearch(trimmed)
    setLoading(false)
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit(query)
  }

  return (
    <div className="search-page">
      {/* Logo */}
      <div className="search-logo fade-in">
        <svg viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="rgba(79,142,247,0.15)" />
          <path d="M8 16 L14 10 L18 14 L24 8" stroke="#4f8ef7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 22 L14 16 L18 20 L24 14" stroke="rgba(79,142,247,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="24" cy="8" r="2" fill="#34d399"/>
        </svg>
        <div>
          <div className="search-logo-text">StockLens</div>
          <div className="search-logo-sub">AI Stock Analysis</div>
        </div>
      </div>

      {/* Search */}
      <div className="search-box fade-in-delay">
        <div className="search-input-wrapper">
          <svg className="search-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="search-input"
            type="text"
            placeholder="종목명 또는 티커 입력"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            autoFocus
          />
          <button
            className="search-btn"
            onClick={() => submit(query)}
            disabled={loading || !query.trim()}
          >
            {loading ? '검색 중...' : '분석'}
          </button>
        </div>

        <div className="search-hint">
          <span className="hint-label">🇺🇸</span>
          {US_EXAMPLES.map((ex) => (
            <button key={ex} className="search-hint-tag" onClick={() => { setQuery(ex); submit(ex) }}>
              {ex}
            </button>
          ))}
        </div>
        <div className="search-hint" style={{ marginTop: 8 }}>
          <span className="hint-label">🇰🇷</span>
          {KR_EXAMPLES.map((ex) => (
            <button key={ex} className="search-hint-tag kr" onClick={() => { setQuery(ex); submit(ex) }}>
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Feature description */}
      <div style={{ marginTop: 48, display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 560 }} className="fade-in-delay-2">
        {[
          { icon: '📈', label: '기술적 지표', desc: 'RSI · MACD · SMA' },
          { icon: '🏦', label: '펀더멘털', desc: '실적 · 밸류에이션' },
          { icon: '🤖', label: 'AI 분석', desc: 'Google Gemini 2.0' }
        ].map((f) => (
          <div key={f.label} style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '12px 16px',
            width: 160,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{f.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{f.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

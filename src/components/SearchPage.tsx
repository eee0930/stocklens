import { useState } from 'react'

const US_EXAMPLES = ['NVDA', 'SMH', 'SCHD', 'VOO', 'QQQ', 'UFO']
const KR_EXAMPLES = ['삼성전자', 'SK하이닉스', '현대차', 'KODEX 미국나스닥100', 'TIGER 미국S&P500']

interface SearchPageProps {
  onSearch: (query: string) => Promise<void>
}

export default function SearchPage({ onSearch }: SearchPageProps) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    try {
      await onSearch(trimmed)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit(query)
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-6"
      style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(79,142,247,0.08) 0%, transparent 70%), #0a0b0e' }}
    >
      {/* Logo */}
      <div className="mb-12 flex items-center gap-3.5 fade-in">
        <svg width="52" height="52" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="rgba(79,142,247,0.15)" />
          <path d="M8 16 L14 10 L18 14 L24 8" stroke="#4f8ef7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 22 L14 16 L18 20 L24 14" stroke="rgba(79,142,247,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="24" cy="8" r="2" fill="#34d399"/>
        </svg>
        <div>
          <div
            className="text-4xl font-bold tracking-tight"
            style={{ background: 'linear-gradient(135deg, #e8eaf0, #4f8ef7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
          >
            StockLens
          </div>
          <div className="text-xs text-fg-muted tracking-widest uppercase mt-0.5">AI Stock Analysis</div>
        </div>
      </div>

      {/* Search */}
      <div className="w-full max-w-[600px] fade-in-delay">
        <div className="flex items-center bg-surface-1 border border-border-light rounded-full py-1.5 pl-5 pr-1.5 transition-all focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
          <svg className="text-fg-muted shrink-0 mr-3" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="flex-1 bg-transparent border-none outline-none text-base text-fg min-w-0 placeholder:text-fg-muted py-3 sm:py-0"
            type="text"
            placeholder="종목명 또는 티커 입력"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            autoFocus
          />
          <button
            className="shrink-0 w-[64px] flex items-center justify-center bg-accent border-none rounded-full py-3.5 sm:py-2.5 text-sm font-semibold text-white cursor-pointer hover:opacity-90 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            onClick={() => submit(query)}
            disabled={loading || !query.trim()}
          >
            {loading ? (
              <span className="flex items-center gap-[3px]">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="block w-[4px] h-[4px] rounded-full bg-white"
                    style={{ animation: `dotBounce 1s ease infinite`, animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
            ) : '분석'}
          </button>
        </div>

        {error && (
          <div className="mt-3 px-3.5 py-2.5 bg-red/8 border border-red/20 rounded-lg text-sm text-red whitespace-pre-line leading-relaxed">
            {error}
          </div>
        )}

        <div className="mt-7 sm:mt-4 text-center text-xs text-fg-muted flex items-center justify-center gap-2 flex-wrap">
          <span className="text-sm leading-none">🇺🇸</span>
          {US_EXAMPLES.map((ex) => (
            <button
              key={ex}
              className="bg-surface-2 border border-border rounded px-2.5 py-[3px] text-xs text-fg-secondary cursor-pointer hover:border-accent hover:text-accent transition-colors"
              onClick={() => { setQuery(ex); submit(ex) }}
            >
              {ex}
            </button>
          ))}
        </div>
        <div className="mt-2 text-center text-xs text-fg-muted flex items-center justify-center gap-2 flex-wrap">
          <span className="text-sm leading-none">🇰🇷</span>
          {KR_EXAMPLES.map((ex) => (
            <button
              key={ex}
              className="bg-surface-2 border border-yellow/20 rounded px-2.5 py-[3px] text-xs text-yellow/85 cursor-pointer hover:border-yellow hover:text-yellow transition-colors"
              onClick={() => { setQuery(ex); submit(ex) }}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Feature cards */}
      <div className="mt-12 hidden md:flex gap-4 flex-wrap justify-center max-w-[560px] fade-in-delay-2">
        {[
          { icon: '📈', label: '기술적 지표', desc: 'RSI · MACD · SMA' },
          { icon: '🏦', label: '펀더멘털', desc: '실적 · 밸류에이션' },
          { icon: '🤖', label: 'AI 분석', desc: 'Google Gemini 2.0' }
        ].map((f) => (
          <div
            key={f.label}
            className="bg-surface-1 border border-border rounded-xl px-4 py-3 w-40 text-center"
          >
            <div className="text-xl mb-1">{f.icon}</div>
            <div className="text-xs font-semibold text-fg mb-0.5">{f.label}</div>
            <div className="text-[11px] text-fg-muted">{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

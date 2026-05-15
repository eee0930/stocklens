import { getScoreColor, getRecommendationClass } from '../utils/calculations'
import type { Analysis } from '../types'

interface ScoreRingProps {
  score: number
}

function ScoreRing({ score }: ScoreRingProps) {
  const r        = 34
  const circ     = 2 * Math.PI * r
  const progress = circ - (score / 100) * circ
  const color    = getScoreColor(score)

  return (
    <div className="relative w-[80px] h-[80px] shrink-0">
      <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="40" cy="40" r={r} fill="none" stroke="#1f2330" strokeWidth="5" />
        <circle
          cx="40" cy="40" r={r}
          fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={progress}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[22px] font-bold font-mono leading-none" style={{ color }}>{score}</span>
        <span className="text-[9px] text-fg-muted uppercase tracking-wide">SCORE</span>
      </div>
    </div>
  )
}

const PILL_CLASSES: Record<string, string> = {
  'strong-buy':  'bg-green/15 text-green border border-green/30',
  'buy':         'bg-green/8 text-[#86efac] border border-green/20',
  'neutral':     'bg-yellow/8 text-yellow border border-yellow/20',
  'sell':        'bg-red/8 text-[#fca5a5] border border-red/20',
  'strong-sell': 'bg-red/15 text-red border border-red/30',
}

interface AIAnalysisProps {
  analysis: Analysis
}

export default function AIAnalysis({ analysis }: AIAnalysisProps) {
  if (!analysis) return null
  if (analysis?.geminiError) console.error('[Gemini]', analysis.geminiError)

  const { score = 50, recommendation = '중립', outlook, longTermOutlook, reasons = [], risks = [] } = analysis
  const recClass = getRecommendationClass(recommendation)
  const isRuleBased = analysis?.isRuleBased

  return (
    <div className="bg-surface-1 border border-border rounded-2xl overflow-hidden sticky top-[72px] fade-in-delay-3">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border">
        <span className="text-[13px] font-semibold text-fg-secondary uppercase tracking-wide">AI 투자 분석</span>
        <span
          className={[
            'inline-flex items-center gap-1 text-[10px] font-semibold border rounded px-1.5 py-0.5 uppercase tracking-wide',
            isRuleBased
              ? 'text-yellow bg-yellow/10 border-yellow/20'
              : 'text-purple bg-purple/10 border-purple/20',
          ].join(' ')}
        >
          <svg width="8" height="8" viewBox="0 0 8 8">
            <circle cx="4" cy="4" r="4" fill="currentColor"/>
          </svg>
          {isRuleBased ? '규칙 기반' : 'Gemini'}
        </span>
      </div>

      {/* Score + Recommendation */}
      <div className="p-5 flex items-center gap-5 border-b border-border">
        <ScoreRing score={score} />
        <div>
          <div className="text-[11px] text-fg-muted mb-1.5 uppercase tracking-wide">단기 투자 의견</div>
          <div className={['inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-base font-bold tracking-tight', PILL_CLASSES[recClass] ?? 'bg-surface-2 text-fg'].join(' ')}>
            {recommendation}
          </div>
          <div className="mt-2 text-[11px] text-fg-muted">
            {score >= 75 ? '강한 상승 신호' : score >= 60 ? '긍정적 신호' : score >= 45 ? '방향성 불명확' : score >= 30 ? '하락 신호' : '강한 하락 신호'}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col gap-4">
        {outlook && (
          <div>
            <div className="text-[11px] font-semibold text-fg-muted uppercase tracking-wide mb-2">단기 전망</div>
            <div className="text-[13px] leading-[1.7] text-fg-secondary">{outlook}</div>
          </div>
        )}

        {longTermOutlook && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide mb-2 text-green">장기 전망</div>
            <div className="text-[13px] leading-[1.7] text-fg-secondary border-l-2 border-green/40 pl-2.5">
              {longTermOutlook}
            </div>
          </div>
        )}

        {(reasons.length > 0 || risks.length > 0) && <div className="h-px bg-border" />}

        {reasons.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold text-fg-muted uppercase tracking-wide mb-2">매수 근거</div>
            <div className="flex flex-col gap-1.5">
              {reasons.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-[13px] leading-[1.5] text-fg-secondary">
                  <span className="shrink-0 w-4 h-4 bg-green/12 text-green rounded flex items-center justify-center text-xs font-bold mt-[1px]">+</span>
                  {r}
                </div>
              ))}
            </div>
          </div>
        )}

        {risks.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold text-fg-muted uppercase tracking-wide mb-2">주요 리스크</div>
            <div className="flex flex-col gap-1.5">
              {risks.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-[13px] leading-[1.5] text-fg-secondary">
                  <span className="shrink-0 w-4 h-4 bg-yellow/12 text-yellow rounded flex items-center justify-center text-[11px] font-bold mt-[1px]">!</span>
                  {r}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-[10px] text-fg-muted leading-[1.5] pt-2">
          ※ 본 분석은 AI가 정량 데이터를 기반으로 생성한 참고 정보입니다. 투자 결정은 본인의 책임 하에 이루어져야 합니다.
        </div>
      </div>
    </div>
  )
}

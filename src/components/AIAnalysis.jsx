import { getScoreColor, getRecommendationClass } from '../utils/calculations'

function ScoreRing({ score }) {
  const r        = 34
  const circ     = 2 * Math.PI * r
  const progress = circ - (score / 100) * circ
  const color    = getScoreColor(score)

  return (
    <div className="score-ring">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle className="score-ring-bg" cx="40" cy="40" r={r} />
        <circle
          className="score-ring-fill"
          cx="40" cy="40" r={r}
          stroke={color}
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={progress}
        />
      </svg>
      <div className="score-text">
        <span className="score-number mono" style={{ color }}>{score}</span>
        <span className="score-label">SCORE</span>
      </div>
    </div>
  )
}

export default function AIAnalysis({ analysis }) {
  if (!analysis) return null

  const { score = 50, recommendation = '중립', outlook, reasons = [], risks = [] } = analysis
  const recClass = getRecommendationClass(recommendation)

  return (
    <div className="analysis-card fade-in-delay-3">
      {/* Header */}
      <div className="analysis-header">
        <span className="analysis-title">AI 투자 분석</span>
        <span className="analysis-ai-badge" style={analysis?.isRuleBased ? { background: 'rgba(251,191,36,0.1)', color: '#fbbf24', borderColor: 'rgba(251,191,36,0.2)' } : {}}>
          <svg width="8" height="8" viewBox="0 0 8 8">
            <circle cx="4" cy="4" r="4" fill="currentColor"/>
          </svg>
          {analysis?.isRuleBased ? '규칙 기반' : 'Gemini'}
        </span>
      </div>

      {/* Score + Recommendation */}
      <div className="score-section">
        <ScoreRing score={score} />
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            단기 투자 의견
          </div>
          <div className={`recommendation-pill ${recClass}`}>
            {recommendation}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
            {score >= 75 ? '강한 상승 신호' : score >= 60 ? '긍정적 신호' : score >= 45 ? '방향성 불명확' : score >= 30 ? '하락 신호' : '강한 하락 신호'}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="analysis-body">
        {/* Outlook */}
        {outlook && (
          <div>
            <div className="analysis-section-title">단기 전망</div>
            <div className="analysis-outlook">{outlook}</div>
          </div>
        )}

        {/* Divider */}
        {(reasons.length > 0 || risks.length > 0) && <div className="divider" />}

        {/* Reasons */}
        {reasons.length > 0 && (
          <div>
            <div className="analysis-section-title">매수 근거</div>
            <div className="analysis-list">
              {reasons.map((r, i) => (
                <div key={i} className="analysis-list-item reason">{r}</div>
              ))}
            </div>
          </div>
        )}

        {/* Risks */}
        {risks.length > 0 && (
          <div>
            <div className="analysis-section-title">주요 리스크</div>
            <div className="analysis-list">
              {risks.map((r, i) => (
                <div key={i} className="analysis-list-item risk">{r}</div>
              ))}
            </div>
          </div>
        )}

        <div style={{
          fontSize: 10,
          color: 'var(--text-muted)',
          padding: '8px 0 0',
          lineHeight: 1.5
        }}>
          ※ 본 분석은 AI가 정량 데이터를 기반으로 생성한 참고 정보입니다. 투자 결정은 본인의 책임 하에 이루어져야 합니다.
        </div>
      </div>
    </div>
  )
}

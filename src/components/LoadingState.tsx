interface Step {
  id: string
  label: string
}

interface LoadingStateProps {
  steps: Step[]
  currentStep: number
}

export default function LoadingState({ steps, currentStep }: LoadingStateProps) {
  return (
    <div className="loading-page">
      <div className="loading-spinner" />

      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
          데이터 분석 중
        </div>
        <div style={{ fontSize: 15, color: 'var(--text-muted)' }}>잠시만 기다려주세요</div>
      </div>

      <div className="loading-steps">
        {steps.map((s, i) => {
          const isDone   = i < currentStep
          const isActive = i === currentStep
          return (
            <div
              key={s.id}
              className={`loading-step${isActive ? ' active' : ''}${isDone ? ' done' : ''}`}
            >
              <span className="loading-step-dot" />
              {isDone
                ? <span>✓ {s.label.replace('중...', '완료')}</span>
                : <span>{s.label}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

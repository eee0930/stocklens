interface Step {
  id: string
  label: string
}

interface LoadingStateProps {
  steps: Step[]
  currentStep: number
  onStop?: () => void
}

export default function LoadingState({ steps, currentStep, onStop }: LoadingStateProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-7 bg-bg p-6">
      <div
        className="w-[60px] h-[60px] rounded-full border-[3px] border-border-light border-t-accent"
        style={{ animation: 'spin 0.8s linear infinite' }}
      />

      <div className="text-center mb-2">
        <div className="text-[22px] font-semibold text-fg mb-1.5">데이터 분석 중</div>
        <div className="text-[15px] text-fg-muted">잠시만 기다려주세요</div>
      </div>

      <div className="flex flex-col gap-2.5 min-w-[300px]">
        {steps.map((s, i) => {
          const isDone   = i < currentStep
          const isActive = i === currentStep
          return (
            <div
              key={s.id}
              className={[
                'flex items-center gap-3 text-base px-4 py-2.5 rounded-xl transition-all',
                isActive ? 'text-fg bg-surface-1 border border-border' : '',
                isDone   ? 'text-green' : '',
                !isActive && !isDone ? 'text-fg-muted' : '',
              ].join(' ')}
            >
              <span
                className="w-2 h-2 rounded-full bg-current shrink-0"
                style={isActive ? { animation: 'pulse 1s ease infinite', background: '#4f8ef7' } : undefined}
              />
              {isDone
                ? <span>✓ {s.label.replace('중...', '완료')}</span>
                : <span>{s.label}</span>}
            </div>
          )
        })}
      </div>

      {onStop && (
        <button
          onClick={onStop}
          className="mt-2 bg-transparent border border-border-light rounded-xl px-5 py-2 text-[13px] font-medium text-fg-muted cursor-pointer hover:border-red/50 hover:text-red/80 transition-all"
        >
          ✕ 중지
        </button>
      )}
    </div>
  )
}

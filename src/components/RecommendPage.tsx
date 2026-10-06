import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import type { RecommendResult } from '../types'

interface RecommendPageProps {
  result: RecommendResult
  onBack: () => void
  onSearch: (query: string) => void
}

export default function RecommendPage({ result, onBack, onSearch }: RecommendPageProps) {
  return (
    <div className="min-h-screen bg-bg">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border sticky top-0 bg-bg/90 backdrop-blur-xl z-[100] gap-3">
        <div
          className="flex items-center gap-2 text-base font-bold text-fg cursor-pointer shrink-0"
          onClick={onBack}
        >
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="rgba(79,142,247,0.15)"/>
            <path d="M8 16 L14 10 L18 14 L24 8" stroke="#4f8ef7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="24" cy="8" r="2" fill="#34d399"/>
          </svg>
          <span>StockLens</span>
        </div>
        <button
          className="bg-transparent border border-border-light rounded-xl px-3.5 py-1.5 text-xs font-medium text-fg-secondary cursor-pointer hover:border-accent hover:text-accent transition-all"
          onClick={onBack}
        >
          ← 홈
        </button>
      </div>

      <div className="max-w-[720px] mx-auto px-6 pt-7 pb-16 max-md:px-4 max-md:pt-5">
        <div className="mb-5 fade-in">
          <div className="text-2xl font-bold text-fg tracking-tight mb-1">Gemini 추천 미국 종목</div>
          <div className="text-[13px] text-fg-muted">거래량 급증 + 횡보 구간 스크리닝 결과</div>
        </div>

        <Card className="fade-in-delay">
          <CardHeader>
            <CardTitle>스크리닝 결과</CardTitle>
            {result.found && <span className="text-[11px] text-fg-muted">{result.stocks.length}개 종목</span>}
          </CardHeader>

          {!result.found ? (
            <CardContent>
              <div className="text-center py-6 text-[15px] text-fg-muted">추천할 종목 없음</div>
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-2.5 text-[11px] font-medium text-fg-muted uppercase tracking-wide">종목명</th>
                    <th className="text-right px-5 py-2.5 text-[11px] font-medium text-fg-muted uppercase tracking-wide">주가</th>
                    <th className="text-right px-5 py-2.5 text-[11px] font-medium text-fg-muted uppercase tracking-wide">거래량</th>
                    <th className="text-right px-5 py-2.5 text-[11px] font-medium text-fg-muted uppercase tracking-wide">1개월 상승률</th>
                  </tr>
                </thead>
                <tbody>
                  {result.stocks.map((s, i) => (
                    <tr
                      key={i}
                      className="border-b border-border last:border-b-0 cursor-pointer hover:bg-surface-2 transition-colors"
                      onClick={() => onSearch(s.symbol)}
                    >
                      <td className="px-5 py-3">
                        <div className="text-[13px] font-semibold text-fg">{s.name}</div>
                        <div className="text-[11px] text-fg-muted font-mono">{s.symbol}</div>
                      </td>
                      <td className="px-5 py-3 text-right text-[13px] font-mono text-fg">
                        ${s.price?.toFixed(2)}
                      </td>
                      <td className="px-5 py-3 text-right text-[13px] font-mono text-fg">
                        {s.volume?.toLocaleString()}
                      </td>
                      <td className={['px-5 py-3 text-right text-[13px] font-mono font-semibold', s.changePercent >= 0 ? 'text-red' : 'text-blue'].join(' ')}>
                        {s.changePercent >= 0 ? '+' : ''}{s.changePercent?.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="mt-4 text-[11px] text-fg-muted leading-[1.6]">
          ※ 본 결과는 Gemini가 생성한 참고 정보이며, 실시간 시세 데이터베이스를 직접 조회한 것이 아니므로 실제 수치와 다를 수 있습니다. 투자 결정 전 반드시 최신 시세로 재확인하세요.
        </div>
      </div>
    </div>
  )
}

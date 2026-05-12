import { useState } from 'react'
import SearchPage from './components/SearchPage'
import ResultsPage from './components/ResultsPage'
import LoadingState from './components/LoadingState'
import { searchSymbol, fetchAllStockData } from './services/stockApi'
import { processStockData } from './utils/calculations'

const STEPS = [
  { id: 'search', label: '종목 검색 중...' },
  { id: 'price',  label: '주가 데이터 불러오는 중...' },
  { id: 'calc',   label: '기술적 지표 계산 중...' },
  { id: 'ai',     label: 'Gemini AI 분석 중...' },
]

export default function App() {
  const [phase, setPhase]         = useState('search')
  const [step, setStep]           = useState(0)
  const [stockData, setStockData] = useState(null)
  const [analysis, setAnalysis]   = useState(null)
  const [error, setError]         = useState(null)

  const handleSearch = async (query) => {
    setPhase('loading')
    setError(null)
    setStep(0)

    try {
      // 1. 종목 검색
      const matches = await searchSymbol(query)
      if (!matches || matches.length === 0) {
        throw new Error(`"${query}"에 해당하는 종목을 찾을 수 없습니다.\n미국 주식: 티커(AAPL) 또는 영문 회사명\n한국 주식: 삼성전자, 카카오, SK하이닉스 등`)
      }
      const symbol = matches[0].symbol

      // 2. 차트 + 펀더멘털 (병렬)
      setStep(1)
      const { chart, summary } = await fetchAllStockData(symbol)

      // 3. 기술적 지표 계산
      setStep(2)
      const processed = processStockData(chart, summary)
      processed.symbol      = symbol
      processed.companyName = processed.companyName || matches[0].shortname || matches[0].longname || symbol

      // 4. Gemini AI 분석
      setStep(3)
      const aiRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processed),
      })

      if (!aiRes.ok) {
        const err = await aiRes.json().catch(() => ({}))
        throw new Error(err.error || 'AI 분석에 실패했습니다. .env의 GEMINI_API_KEY를 확인하세요.')
      }

      const aiAnalysis = await aiRes.json()

      setStockData(processed)
      setAnalysis(aiAnalysis)
      setPhase('results')
    } catch (err) {
      console.error(err)
      setError(err.message)
      setPhase('error')
    }
  }

  const handleBack = () => {
    setPhase('search')
    setStockData(null)
    setAnalysis(null)
    setError(null)
  }

  if (phase === 'loading') return <LoadingState steps={STEPS} currentStep={step} />

  if (phase === 'results') return (
    <ResultsPage stockData={stockData} analysis={analysis} onBack={handleBack} onSearch={handleSearch} />
  )

  if (phase === 'error') return (
    <div className="error-page">
      <div className="error-box fade-in">
        <div className="error-icon">⚠</div>
        <div className="error-title">오류가 발생했습니다</div>
        <div className="error-message">{error}</div>
      </div>
      <button className="btn-outline" onClick={handleBack}>다시 검색</button>
    </div>
  )

  return <SearchPage onSearch={handleSearch} />
}

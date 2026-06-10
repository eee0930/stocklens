import { useParams, useNavigate } from 'react-router-dom'
import { useSearchNavigator } from '../hooks/useSearchNavigator'
import { useStockData } from '../hooks/useStockData'
import ResultsPage from '../components/ResultsPage'
import LoadingState from '../components/LoadingState'
import ErrorPage from '../components/ErrorPage'

const STEPS = [
  { id: 'price', label: '주가 데이터 불러오는 중...' },
  { id: 'calc',  label: '기술적 지표 계산 중...' },
  { id: 'ai',    label: 'Gemini AI 분석 중...' },
]

export default function StockRoute() {
  const { symbol = '' } = useParams<{ symbol: string }>()
  const navigate     = useNavigate()
  const handleSearch = useSearchNavigator()
  const handleBack   = () => navigate('/')

  const { chartQuery, summaryQuery, stockData, analysisQuery, step } = useStockData(symbol)

  const anyError = chartQuery.isError || summaryQuery.isError || analysisQuery.isError
  const errorMsg = (chartQuery.error || summaryQuery.error || analysisQuery.error) as Error | null

  if (anyError) return <ErrorPage message={errorMsg?.message ?? '알 수 없는 오류'} onBack={handleBack} />

  if (stockData && analysisQuery.data) return (
    <ResultsPage
      stockData={stockData}
      analysis={analysisQuery.data}
      onBack={handleBack}
      onSearch={handleSearch}
    />
  )

  return <LoadingState steps={STEPS} currentStep={step} onStop={handleBack} />
}

import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useSearchNavigator } from '../hooks/useSearchNavigator'
import { fetchRecommendation } from '../services/recommendApi'
import { getLocalRecommendation, setLocalRecommendation } from '../utils/recommendCache'
import RecommendPage from '../components/RecommendPage'
import LoadingState from '../components/LoadingState'
import ErrorPage from '../components/ErrorPage'

const STEPS = [{ id: 'screen', label: 'Gemini가 종목 스크리닝 중...' }]

export default function RecommendRoute() {
  const navigate = useNavigate()
  const handleSearch = useSearchNavigator()
  const handleBack = () => navigate('/')

  const query = useQuery({
    queryKey: ['recommend', new Date().toISOString().slice(0, 10)],
    queryFn: async () => {
      const cached = getLocalRecommendation()
      if (cached) return cached
      const result = await fetchRecommendation()
      setLocalRecommendation(result)
      return result
    },
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
    retry: false,
  })

  if (query.isError) {
    return <ErrorPage message={(query.error as Error)?.message ?? '알 수 없는 오류'} onBack={handleBack} />
  }

  if (query.data) {
    return <RecommendPage result={query.data} onBack={handleBack} onSearch={handleSearch} />
  }

  return (
    <LoadingState
      steps={STEPS}
      currentStep={0}
      onStop={handleBack}
      description={'Gemini 추천 종목은 거래량이 터졌지만 아직 가격이 움직이지 않은 종목입니다.\n시장 상황에 따라 추천하는 종목이 없을 수도 있습니다.'}
    />
  )
}

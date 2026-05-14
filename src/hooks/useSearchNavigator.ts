import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { searchSymbol } from '../services/stockApi'

export function useSearchNavigator() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return async (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) return
    const results = await queryClient.fetchQuery({
      queryKey: ['search', trimmed],
      queryFn: async () => {
        const r = await searchSymbol(trimmed)
        if (!r?.length)
          throw new Error(
            `"${trimmed}"에 해당하는 종목을 찾을 수 없습니다.\n미국 주식: 티커(AAPL) 또는 영문 회사명\n한국 주식: 삼성전자, 카카오, SK하이닉스 등`
          )
        return r
      },
      staleTime: 10 * 60 * 1000,
    })
    navigate(`/stock/${results[0].symbol}`)
  }
}

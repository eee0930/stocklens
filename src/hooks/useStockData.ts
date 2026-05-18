import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getChart, getQuoteSummary, isMarketOpen } from '../services/stockApi'
import { fetchAnalysis } from '../services/analyzeApi'
import { getLocalAnalysis, setLocalAnalysis } from '../utils/analysisCache'
import { processStockData } from '../utils/calculations'

export function useStockData(symbol: string) {
  const isOpen = isMarketOpen(symbol)
  const stockStale = isOpen ? 0 : 12 * 60 * 60 * 1000

  const chartQuery = useQuery({
    queryKey:  ['chart', symbol],
    queryFn:   () => getChart(symbol),
    enabled:   !!symbol,
    staleTime: stockStale,
    retry: 1,
  })

  const summaryQuery = useQuery({
    queryKey:  ['summary', symbol],
    queryFn:   () => getQuoteSummary(symbol),
    enabled:   !!symbol,
    staleTime: stockStale,
    retry: 1,
  })

  const stockData = useMemo(() => {
    if (!chartQuery.data || !summaryQuery.data || !symbol) return null
    try {
      const p = processStockData(chartQuery.data, summaryQuery.data)
      p.symbol      = symbol
      p.companyName = p.companyName || symbol
      return p
    } catch { return null }
  }, [chartQuery.data, summaryQuery.data, symbol])

  const analysisQuery = useQuery({
    queryKey: ['analysis', symbol],
    queryFn:  async () => {
      const cached = getLocalAnalysis(symbol)
      if (cached) return cached
      const { chartData: _c, volumeData: _v, sma20Data: _s, ...payload } = stockData!
      const result = await fetchAnalysis(payload as Record<string, unknown>)
      setLocalAnalysis(symbol, result)
      return result
    },
    enabled:  !!stockData,
    staleTime: Infinity,
    gcTime:    24 * 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  })

  const step = chartQuery.isLoading || summaryQuery.isLoading ? 0
             : !stockData                                      ? 1
             : analysisQuery.isLoading                         ? 2
             : 3

  return { chartQuery, summaryQuery, stockData, analysisQuery, step }
}

import type { RecommendResult } from '../types'

const LS_KEY = 'sl_recommend'
// RecommendResult 구조가 바뀔 때마다 올려서 과거 캐시를 무효화한다 (예: volume -> volumeIncreasePercent).
const CACHE_VERSION = 2
const todayKey = () => new Date().toISOString().slice(0, 10)

export function getLocalRecommendation(): RecommendResult | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const { result, dateKey, version } = JSON.parse(raw) as { result: RecommendResult; dateKey: string; version?: number }
    if (dateKey !== todayKey() || version !== CACHE_VERSION) return null
    return result
  } catch { return null }
}

export function setLocalRecommendation(result: RecommendResult): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ result, dateKey: todayKey(), version: CACHE_VERSION }))
  } catch {}
}

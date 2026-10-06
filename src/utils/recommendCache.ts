import type { RecommendResult } from '../types'

const LS_KEY = 'sl_recommend'
const todayKey = () => new Date().toISOString().slice(0, 10)

export function getLocalRecommendation(): RecommendResult | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const { result, dateKey } = JSON.parse(raw) as { result: RecommendResult; dateKey: string }
    if (dateKey !== todayKey()) return null
    return result
  } catch { return null }
}

export function setLocalRecommendation(result: RecommendResult): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ result, dateKey: todayKey() }))
  } catch {}
}

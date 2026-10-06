import type { RecommendResult } from '../types'

export async function fetchRecommendation(): Promise<RecommendResult> {
  const res = await fetch('/api/recommend', { method: 'POST' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(err.error || 'Gemini 추천 요청에 실패했습니다.')
  }
  return res.json() as Promise<RecommendResult>
}

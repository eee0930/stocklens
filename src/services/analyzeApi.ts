import type { Analysis } from '../types'

export async function fetchAnalysis(payload: Record<string, unknown>): Promise<Analysis> {
  const callAnalyze = () => fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  let res = await callAnalyze()

  for (let retry = 0; res.status === 429 && retry < 3; retry++) {
    const { retryAfterMs } = await res.json() as { retryAfterMs: number }
    const wait = Math.min(retryAfterMs ?? 65000, 120000)
    console.log(`[Gemini] rate-limited, retrying in ${Math.ceil(wait / 1000)}s... (${retry + 1}/3)`)
    await new Promise(r => setTimeout(r, wait))
    res = await callAnalyze()
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(err.error || 'AI 분석에 실패했습니다.')
  }
  return res.json() as Promise<Analysis>
}

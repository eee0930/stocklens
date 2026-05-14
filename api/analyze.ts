/// <reference types="node" />
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (req: any, res: any) => Promise<void>

import { buildPrompt, parseGeminiResponse, ruleBasedAnalysis } from '../shared/geminiAnalysis'

interface CacheEntry {
  analysis: Record<string, unknown>
  dateKey: string
}

const serverCache    = new Map<string, CacheEntry>()
const dailyExhausted = new Map<string, string>()

function today(): string { return new Date().toISOString().slice(0, 10) }

function isDailyExhausted(model: string): boolean {
  return dailyExhausted.get(model) === today()
}
function markDailyExhausted(model: string): void {
  dailyExhausted.set(model, today())
  console.log(`[${model}] daily quota exhausted`)
}

function getServerCached(symbol: string): Record<string, unknown> | null {
  const entry = serverCache.get((symbol || '').toUpperCase())
  if (!entry || entry.dateKey !== today() || entry.analysis?.isRuleBased) return null
  return entry.analysis
}
function setServerCached(symbol: string, analysis: Record<string, unknown>): void {
  if (!symbol) return
  serverCache.set(symbol.toUpperCase(), { analysis, dateKey: today() })
}

interface GeminiError extends Error {
  status?: number
  retryDelayMs?: number
  isDailyExhausted?: boolean
}

const handler: Handler = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const d = req.body as Record<string, unknown>

  const cached = getServerCached(d.symbol as string)
  if (cached) return res.status(200).json(cached)

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    const fallback = ruleBasedAnalysis(d)
    return res.status(200).json({ ...fallback, isRuleBased: true, geminiError: 'GEMINI_API_KEY 미설정' })
  }

  async function callGemini(modelName: string): Promise<string> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 25000)
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: buildPrompt(d) }] }] }),
          signal: controller.signal,
        }
      )
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as {
          error?: { message?: string; details?: Array<{ '@type'?: string; retryDelay?: string; violations?: Array<{ quotaId?: string }> }> }
        }
        const msg = body?.error?.message || `HTTP ${response.status}`
        const err = new Error(msg) as GeminiError
        err.status = response.status
        if (response.status === 429) {
          const details = body?.error?.details ?? []
          const violations = details.flatMap(item => item.violations ?? [])
          if (violations.some(v => v.quotaId?.includes('PerDay'))) {
            markDailyExhausted(modelName)
            err.isDailyExhausted = true
          }
          const retryInfo = details.find(item => item['@type']?.includes('RetryInfo'))
          const delaySec = parseFloat(retryInfo?.retryDelay ?? '') || 62
          err.retryDelayMs = Math.ceil(delaySec * 1000) + 1000
        }
        throw err
      }
      const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    } finally {
      clearTimeout(timer)
    }
  }

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
  const models = ['gemini-2.0-flash-lite', 'gemini-2.0-flash']
  let text: string | null = null
  let bestRetryMs: number | null = null
  let authError: GeminiError | null = null
  let dailyExhaustedCount = 0

  outer: for (const model of models) {
    if (isDailyExhausted(model)) { dailyExhaustedCount++; continue }
    const maxAttempts = model === models[0] ? 2 : 1
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        text = await callGemini(model)
        break outer
      } catch (e) {
        const err = e as GeminiError
        if (err.status === 400 || err.status === 403) { authError = err; break outer }
        if (err.status === 429) {
          if (err.isDailyExhausted) {
            dailyExhaustedCount++
          } else if (err.retryDelayMs != null) {
            if (bestRetryMs === null || err.retryDelayMs < bestRetryMs) bestRetryMs = err.retryDelayMs
          }
          break
        }
        console.error(`[${model}] attempt ${attempt + 1} failed: ${err.message?.slice(0, 80)}`)
        if (attempt < maxAttempts - 1) await sleep(2000)
      }
    }
  }

  if (authError) {
    const fallback = ruleBasedAnalysis(d)
    return res.status(200).json({ ...fallback, isRuleBased: true, geminiError: authError.message })
  }

  if (text === null && bestRetryMs !== null) {
    return res.status(429).json({ isRateLimited: true, retryAfterMs: bestRetryMs })
  }

  if (text === null) {
    const fallback = ruleBasedAnalysis(d)
    const errorMsg = dailyExhaustedCount >= models.length
      ? 'Gemini 일일 무료 할당량 초과 (자정 후 갱신)'
      : 'Gemini API 일시적 오류'
    return res.status(200).json({ ...fallback, isRuleBased: true, geminiError: errorMsg })
  }

  const analysis = parseGeminiResponse(text)
  setServerCached(d.symbol as string, analysis)
  return res.status(200).json(analysis)
}

export default handler

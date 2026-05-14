import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'http'
import { buildPrompt, parseGeminiResponse, ruleBasedAnalysis } from '../shared/geminiAnalysis'

const rateLimitedUntil = new Map<string, number>()

function isRateLimited(model: string): boolean {
  const until = rateLimitedUntil.get(model)
  if (!until) return false
  if (Date.now() >= until) { rateLimitedUntil.delete(model); return false }
  return true
}

function setRateLimited(model: string, retryAfterSec: number) {
  rateLimitedUntil.set(model, Date.now() + retryAfterSec * 1000)
  console.log(`[dev] ${model} rate-limited for ${retryAfterSec}s`)
}

const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite']

async function callGemini(modelName: string, prompt: string, apiKey: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal: controller.signal,
      }
    )
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { error?: { message?: string } }
      const msg = body?.error?.message || `HTTP ${response.status}`
      const err = Object.assign(new Error(msg), { status: response.status })
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '60', 10)
        setRateLimited(modelName, Math.min(retryAfter, 300))
      }
      throw err
    }
    const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  } finally {
    clearTimeout(timer)
  }
}

export function geminiPlugin(): Plugin {
  return {
    name: 'gemini-api',
    configureServer(server) {
      server.middlewares.use('/api/analyze', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        let body = ''
        req.on('data', (c: Buffer) => { body += c.toString() })
        req.on('end', async () => {
          const d = JSON.parse(body) as Record<string, unknown>
          const apiKey = process.env.GEMINI_API_KEY
          const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

          let text: string | null = null
          const modelErrors: string[] = []

          for (const model of models) {
            if (isRateLimited(model)) {
              const remaining = Math.ceil(((rateLimitedUntil.get(model) ?? 0) - Date.now()) / 1000)
              console.log(`[dev] Skipping ${model}: rate-limited ${remaining}s more`)
              continue
            }
            try {
              text = await callGemini(model, buildPrompt(d), apiKey ?? '')
              break
            } catch (e) {
              const err = e as Error & { status?: number }
              const msg = err.name === 'AbortError' ? '15s timeout' : err.message
              modelErrors.push(`[${model}] ${msg}`)
              console.error(`[dev] Gemini error (${model}):`, msg)
              if (err.status === 400 || err.status === 403) break
            }
          }

          // 가장 빨리 풀리는 모델로 한 번 더 (30초 이내)
          if (text === null) {
            const soonest = models
              .map(m => ({ model: m, until: rateLimitedUntil.get(m) ?? 0 }))
              .sort((a, b) => a.until - b.until)[0]
            const waitMs = Math.max(0, soonest.until - Date.now())
            if (waitMs <= 30000) {
              if (waitMs > 0) await sleep(waitMs + 500)
              try { text = await callGemini(soonest.model, buildPrompt(d), apiKey ?? '') } catch {}
            }
          }

          const send = (data: unknown) => {
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(data))
          }

          if (text !== null) {
            send(parseGeminiResponse(text))
          } else {
            console.error('[dev] All Gemini models failed:', modelErrors.join(' | '))
            const fallback = ruleBasedAnalysis(d)
            send({ ...fallback, isRuleBased: true, geminiError: modelErrors.join(' | ') })
          }
        })
      })
    }
  }
}

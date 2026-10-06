import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'http'
import { buildRecommendPrompt, parseRecommendResponse, geminiModels as models } from '../api/recommend'

async function callGemini(modelName: string, prompt: string, apiKey: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 40000)
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
      throw new Error(body?.error?.message || `HTTP ${response.status}`)
    }
    const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  } finally {
    clearTimeout(timer)
  }
}

export function recommendPlugin(): Plugin {
  return {
    name: 'gemini-recommend',
    configureServer(server) {
      server.middlewares.use('/api/recommend', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        const send = (status: number, data: unknown) => {
          res.writeHead(status, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(data))
        }

        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) return send(503, { error: 'GEMINI_API_KEY 미설정' })

        let text: string | null = null
        let lastError: string | null = null
        const prompt = buildRecommendPrompt()

        for (const model of models) {
          try {
            text = await callGemini(model, prompt, apiKey)
            break
          } catch (e) {
            lastError = (e as Error).message
            console.error(`[dev] recommend (${model}) failed:`, lastError)
          }
        }

        if (text === null) return send(502, { error: lastError || 'Gemini 추천 요청에 실패했습니다.' })
        send(200, parseRecommendResponse(text))
      })
    }
  }
}

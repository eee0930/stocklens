/// <reference types="node" />
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (req: any, res: any) => Promise<void>

export const geminiModels = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-flash-lite-latest']

export function buildRecommendPrompt(): string {
  return `당신은 미국 주식 시장 전문 애널리스트입니다. 아래 조건을 모두 만족하는 미국 주식을 찾으세요.

① 미국 개별주 (ETF 제외)
② 시총 ≥ $5억
③ 주가 ≥ $5
④ 최근 20거래일 평균 거래량 ÷ 이전 20거래일 평균 거래량 ≥ 3
⑤ 최근 1개월 주가상승률: -3% ~ +3%
⑥ 하루 거래량 폭발만으로 ④번 조건을 충족한 종목 제외

해당 조건을 모두 만족하는 종목을 5개 이하로 찾아줘.

아래 JSON만 반환 (다른 텍스트 금지):
조건을 만족하는 종목이 있으면:
{"found":true,"stocks":[{"name":"<종목명>","symbol":"<티커>","price":<현재가 숫자>,"volumeIncreasePercent":<④번 조건의 거래량 증가율(%). (최근 20거래일 평균 거래량 ÷ 이전 20거래일 평균 거래량 - 1) × 100>,"changePercent":<1개월 상승률 숫자>}]}
조건을 만족하는 종목이 하나도 없으면:
{"found":false,"stocks":[]}`
}

interface RecommendedStockRaw {
  name?: unknown
  symbol?: unknown
  price?: unknown
  volumeIncreasePercent?: unknown
  changePercent?: unknown
}

export function parseRecommendResponse(text: string): { found: boolean; stocks: RecommendedStockRaw[] } {
  try {
    const m = text.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(m ? m[0] : text) as { found?: boolean; stocks?: unknown[] }
    const stocks = Array.isArray(parsed.stocks) ? parsed.stocks as RecommendedStockRaw[] : []
    return { found: !!parsed.found && stocks.length > 0, stocks }
  } catch {
    return { found: false, stocks: [] }
  }
}

// ── server-side daily cache (단일 쿼리라 심볼별 키 불필요) ──────────────────

interface CacheEntry {
  result: { found: boolean; stocks: RecommendedStockRaw[] }
  dateKey: string
}

let serverCache: CacheEntry | null = null

function today(): string { return new Date().toISOString().slice(0, 10) }

const handler: Handler = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (serverCache && serverCache.dateKey === today()) {
    return res.status(200).json(serverCache.result)
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(503).json({ error: 'GEMINI_API_KEY 미설정' })
  }

  async function callGemini(modelName: string): Promise<string> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 40000)
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: buildRecommendPrompt() }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
          signal: controller.signal,
        }
      )
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: { message?: string } }
        const err = new Error(body?.error?.message || `HTTP ${response.status}`) as Error & { status?: number }
        err.status = response.status
        throw err
      }
      const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    } finally {
      clearTimeout(timer)
    }
  }

  const models = geminiModels
  let text: string | null = null
  let lastError: string | null = null

  for (const model of models) {
    try {
      text = await callGemini(model)
      break
    } catch (e) {
      lastError = (e as Error).message
      console.error(`[${model}] recommend failed:`, lastError)
    }
  }

  if (text === null) {
    return res.status(502).json({ error: lastError || 'Gemini 추천 요청에 실패했습니다.' })
  }

  const result = parseRecommendResponse(text)
  serverCache = { result, dateKey: today() }
  return res.status(200).json(result)
}

export default handler

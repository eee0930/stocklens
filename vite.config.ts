import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'http'

// ── Stock data proxy (yahoo-finance2) ────────────────────────────
function stockDataPlugin(): Plugin {
  return {
    name: 'stock-data',
    configureServer(server) {
      server.middlewares.use('/api/stock', async (req: IncomingMessage, res: ServerResponse) => {
        const path = req.url   // /search?q=... | /chart/AAPL | /summary/AAPL

        const send = (status: number, data: unknown) => {
          res.writeHead(status, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(data))
        }

        try {
          const { default: YahooFinance } = await import('yahoo-finance2') as { default: new (opts: Record<string, unknown>) => Record<string, (...args: unknown[]) => Promise<unknown>> }
          const yf = new YahooFinance({ suppressNotices: ['ripHistorical'] })

          if (path && path.startsWith('/search')) {
            const q = new URL(`http://x${path}`).searchParams.get('q')
            const result = await (yf as unknown as { search: (q: string | null, opts: Record<string, unknown>, extra: Record<string, unknown>) => Promise<{ quotes?: unknown[] }> }).search(q, {}, { validateResult: false })
            send(200, result.quotes ?? [])

          } else if (path && path.startsWith('/chart')) {
            const symbol = new URL(`http://x${path}`).searchParams.get('symbol')
            const fiveYrsAgo = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000)
            const history = await (yf as unknown as { historical: (symbol: string | null, opts: Record<string, unknown>, extra: Record<string, unknown>) => Promise<unknown[]> }).historical(symbol, {
              period1: fiveYrsAgo,
              period2: new Date(),
              interval: '1d',
            }, { validateResult: false })
            send(200, history)

          } else if (path && path.startsWith('/summary')) {
            const symbol = new URL(`http://x${path}`).searchParams.get('symbol')
            const summary = await (yf as unknown as { quoteSummary: (symbol: string | null, opts: Record<string, unknown>, extra: Record<string, unknown>) => Promise<unknown> }).quoteSummary(symbol, {
              modules: ['financialData', 'defaultKeyStatistics', 'assetProfile', 'summaryDetail'],
            }, { validateResult: false })
            send(200, summary)

          } else {
            send(404, { error: 'Unknown endpoint' })
          }
        } catch (err) {
          const error = err as Error
          console.error('Stock data error:', error.message)
          send(500, { error: error.message })
        }
      })
    }
  }
}

// ── Gemini AI proxy (프로덕션 api/analyze.ts와 동일한 로직) ────────
const devRateLimitedUntil = new Map<string, number>()

function devIsRateLimited(model: string): boolean {
  const until = devRateLimitedUntil.get(model)
  if (!until) return false
  if (Date.now() >= until) { devRateLimitedUntil.delete(model); return false }
  return true
}

function devSetRateLimited(model: string, retryAfterSec: number) {
  devRateLimitedUntil.set(model, Date.now() + retryAfterSec * 1000)
  console.log(`[dev] ${model} rate-limited for ${retryAfterSec}s`)
}

function geminiPlugin(): Plugin {
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
          const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite']
          const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

          async function callGemini(modelName: string): Promise<string> {
            const controller = new AbortController()
            const timer = setTimeout(() => controller.abort(), 15000)
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
                const respBody = await response.json().catch(() => ({})) as { error?: { message?: string } }
                const msg = respBody?.error?.message || `HTTP ${response.status}`
                const err = Object.assign(new Error(msg), { status: response.status })
                if (response.status === 429) {
                  const retryAfter = parseInt(response.headers.get('retry-after') || '60', 10)
                  devSetRateLimited(modelName, Math.min(retryAfter, 300))
                }
                throw err
              }
              const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
              return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
            } finally {
              clearTimeout(timer)
            }
          }

          let text: string | null = null
          const modelErrors: string[] = []

          for (const model of models) {
            if (devIsRateLimited(model)) {
              const remaining = Math.ceil(((devRateLimitedUntil.get(model) ?? 0) - Date.now()) / 1000)
              console.log(`[dev] Skipping ${model}: rate-limited ${remaining}s more`)
              continue
            }
            try {
              text = await callGemini(model)
              break
            } catch (e) {
              const err = e as Error & { status?: number }
              const msg = err.name === 'AbortError' ? '15s timeout' : err.message
              modelErrors.push(`[${model}] ${msg}`)
              console.error(`[dev] Gemini error (${model}):`, msg)
              if (err.status === 400 || err.status === 403) break
            }
          }

          // 2차: 가장 빨리 풀리는 모델로 한 번 더 (30초 이내)
          if (text === null) {
            const soonest = models
              .map(m => ({ model: m, until: devRateLimitedUntil.get(m) ?? 0 }))
              .sort((a, b) => a.until - b.until)[0]
            const waitMs = Math.max(0, soonest.until - Date.now())
            if (waitMs <= 30000) {
              if (waitMs > 0) await sleep(waitMs + 500)
              try { text = await callGemini(soonest.model) } catch {}
            }
          }

          if (text !== null) {
            let analysis: Record<string, unknown>
            try {
              const m = text.match(/\{[\s\S]*\}/)
              analysis = JSON.parse(m ? m[0] : text) as Record<string, unknown>
            } catch {
              analysis = { score: 50, recommendation: '중립', outlook: text, reasons: [], risks: [] }
            }
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(analysis))
          } else {
            console.error('[dev] All Gemini models failed:', modelErrors.join(' | '))
            const fallback = ruleBasedAnalysis(d)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ...fallback, isRuleBased: true, geminiError: modelErrors.join(' | ') }))
          }
        })
      })
    }
  }
}

function buildPrompt(d: Record<string, unknown>): string {
  const currentPrice = typeof d.currentPrice === 'number' ? d.currentPrice.toFixed(2) : 'N/A'
  const sevenDayReturn = typeof d.sevenDayReturn === 'number' ? d.sevenDayReturn.toFixed(2) + '%' : 'N/A'
  const volumeGrowthRate = typeof d.volumeGrowthRate === 'number' ? d.volumeGrowthRate.toFixed(2) + '%' : 'N/A'
  const rsi = typeof d.rsi === 'number' ? d.rsi.toFixed(2) : 'N/A'
  const macdHistogram = typeof d.macdHistogram === 'number' ? d.macdHistogram.toFixed(4) : 'N/A'
  const priceVsSMA20 = typeof d.priceVsSMA20 === 'number' ? d.priceVsSMA20.toFixed(2) + '%' : 'N/A'
  const priceVs52High = typeof d.priceVs52High === 'number' ? d.priceVs52High.toFixed(2) + '%' : 'N/A'
  const priceVs52Low = typeof d.priceVs52Low === 'number' ? d.priceVs52Low.toFixed(2) + '%' : 'N/A'

  return `당신은 미국 주식 시장 전문 애널리스트입니다. 다음 정량 데이터를 기반으로 단기(1~4주) 투자 의견을 분석하세요.

## 종목 정보
- 종목명: ${d.companyName} (${d.symbol})
- 섹터: ${d.sector || 'N/A'} / 업종: ${d.industry || 'N/A'}
- 현재가: $${currentPrice}

## 모멘텀 & 기술적 지표
- 최근 7일 수익률: ${sevenDayReturn}
- 거래량 증가율 (vs 20일 평균): ${volumeGrowthRate}
- RSI (14일): ${rsi}
- MACD 히스토그램: ${macdHistogram}
- 20일 이동평균 대비: ${priceVsSMA20}
- 52주 고점 대비: ${priceVs52High}
- 52주 저점 대비: ${priceVs52Low}

## 펀더멘털
- 실적 성장률 (YoY): ${d.earningsGrowth != null ? d.earningsGrowth + '%' : 'N/A'}
- 매출 성장률 (YoY): ${d.revenueGrowth != null ? d.revenueGrowth + '%' : 'N/A'}
- 영업이익률: ${d.operatingMargin != null ? d.operatingMargin + '%' : 'N/A'}
- 순이익률: ${d.profitMargin != null ? d.profitMargin + '%' : 'N/A'}
- P/E 비율: ${d.peRatio || 'N/A'}
- 베타: ${d.beta || 'N/A'}
- 시가총액: ${d.marketCapFormatted || 'N/A'}

위 데이터를 근거로 단기·장기 투자 의견을 모두 제시하세요. 반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):

{
  "score": <0~100 정수>,
  "recommendation": "<강력매수|매수|중립|매도|강력매도 중 하나>",
  "outlook": "<단기(1~4주) 전망 2~3문장, 한국어>",
  "longTermOutlook": "<장기(6개월~2년) 투자 가치와 매수 타이밍 조언 2~3문장. 예: 지금 바로 사도 좋은지, 조금 더 조정을 기다릴지, 분할 매수를 권하는지, 하락장이 길지 않을 것 같으니 장기 보유 목적이면 아무때나 사도 좋다 등 실용적인 조언. 한국어>",
  "reasons": ["<근거1>", "<근거2>", "<근거3>"],
  "risks": ["<리스크1>", "<리스크2>"]
}`
}

interface RuleBasedResult {
  score: number
  recommendation: string
  outlook: string
  longTermOutlook: string
  reasons: string[]
  risks: string[]
}

function ruleBasedAnalysis(d: Record<string, unknown>): RuleBasedResult {
  let score = 50
  const reasons: string[] = []
  const risks: string[] = []

  const rsi = typeof d.rsi === 'number' ? d.rsi : null
  const sevenDayReturn = typeof d.sevenDayReturn === 'number' ? d.sevenDayReturn : null
  const macdHistogram = typeof d.macdHistogram === 'number' ? d.macdHistogram : null
  const priceVsSMA20 = typeof d.priceVsSMA20 === 'number' ? d.priceVsSMA20 : null
  const volumeGrowthRate = typeof d.volumeGrowthRate === 'number' ? d.volumeGrowthRate : null
  const earningsGrowth = d.earningsGrowth != null ? parseFloat(String(d.earningsGrowth)) : null
  const priceVs52Low = typeof d.priceVs52Low === 'number' ? d.priceVs52Low : null
  const priceVs52High = typeof d.priceVs52High === 'number' ? d.priceVs52High : null

  // RSI
  if (rsi != null) {
    if (rsi < 30)       { score += 12; reasons.push(`RSI ${rsi.toFixed(1)} — 과매도 구간으로 반등 가능성`) }
    else if (rsi < 50)  { score += 5;  reasons.push(`RSI ${rsi.toFixed(1)} — 중립 이하, 추가 하락 주의`) }
    else if (rsi < 65)  { score += 8;  reasons.push(`RSI ${rsi.toFixed(1)} — 건강한 상승 구간`) }
    else if (rsi < 75)  { score += 3;  risks.push(`RSI ${rsi.toFixed(1)} — 과매수 접근, 단기 조정 가능`) }
    else                { score -= 8;  risks.push(`RSI ${rsi.toFixed(1)} — 과매수 구간, 매도 압력 증가`) }
  }

  // 7일 수익률
  if (sevenDayReturn != null) {
    if (sevenDayReturn > 5)       { score += 8;  reasons.push(`7일 수익률 +${sevenDayReturn.toFixed(1)}% — 강한 단기 모멘텀`) }
    else if (sevenDayReturn > 0)  { score += 4;  reasons.push(`7일 수익률 +${sevenDayReturn.toFixed(1)}% — 양호한 단기 흐름`) }
    else if (sevenDayReturn > -5) { score -= 3;  risks.push(`7일 수익률 ${sevenDayReturn.toFixed(1)}% — 단기 약세`) }
    else                          { score -= 10; risks.push(`7일 수익률 ${sevenDayReturn.toFixed(1)}% — 강한 단기 하락`) }
  }

  // MACD
  if (macdHistogram != null) {
    if (macdHistogram > 0) { score += 6;  reasons.push('MACD 히스토그램 양수 — 상승 모멘텀') }
    else                   { score -= 6;  risks.push('MACD 히스토그램 음수 — 하락 모멘텀') }
  }

  // SMA20 대비
  if (priceVsSMA20 != null) {
    if (priceVsSMA20 > 3)       { score += 5;  reasons.push(`20일 이평선 +${priceVsSMA20.toFixed(1)}% 위 — 단기 상승 추세`) }
    else if (priceVsSMA20 > 0)  { score += 2 }
    else if (priceVsSMA20 > -5) { score -= 3;  risks.push('20일 이평선 하회 — 단기 추세 약화') }
    else                        { score -= 8;  risks.push(`20일 이평선 ${priceVsSMA20.toFixed(1)}% 하회 — 추세 붕괴`) }
  }

  // 거래량
  if (volumeGrowthRate != null && volumeGrowthRate > 30) {
    score += 4
    reasons.push(`거래량 평균 대비 +${volumeGrowthRate.toFixed(0)}% — 관심 증가`)
  }

  // 실적 성장률
  if (earningsGrowth != null) {
    if (earningsGrowth > 20)      { score += 7;  reasons.push(`실적 성장률 +${earningsGrowth}% — 강한 이익 성장`) }
    else if (earningsGrowth > 0)  { score += 3;  reasons.push(`실적 성장률 +${earningsGrowth}% — 양호한 이익 성장`) }
    else                          { score -= 5;  risks.push(`실적 성장률 ${earningsGrowth}% — 이익 감소 추세`) }
  }

  score = Math.max(10, Math.min(90, score))

  let recommendation: string
  if (score >= 75)      recommendation = '강력매수'
  else if (score >= 63) recommendation = '매수'
  else if (score >= 45) recommendation = '중립'
  else if (score >= 33) recommendation = '매도'
  else                  recommendation = '강력매도'

  const outlook = `${d.companyName}(${d.symbol})의 기술적 지표를 종합하면 단기 ${recommendation} 의견입니다. RSI·MACD·이동평균 등 정량 지표 기반 규칙 분석 결과이며, Gemini AI 키 설정 후 더 정밀한 분석이 제공됩니다.`

  let longTermOutlook: string
  if (earningsGrowth != null && earningsGrowth > 15 && priceVs52High != null && priceVs52High > -10) {
    longTermOutlook = `실적 성장세(+${earningsGrowth}%)가 탄탄하지만 현재 52주 고점 근처에 위치해 있습니다. 장기 투자 가치는 충분하나, 단기 조정 가능성을 고려해 분할 매수 전략을 추천합니다.`
  } else if (earningsGrowth != null && earningsGrowth > 15 && priceVs52Low != null && priceVs52Low < 20) {
    longTermOutlook = `실적 성장성이 높고 52주 저점 근처의 저렴한 가격대입니다. 장기 보유 목적이라면 지금도 좋은 진입 시점으로 볼 수 있으며, 하락장은 오래 지속되지 않는 경향이 있어 분할 매수를 고려해보세요.`
  } else if (priceVs52Low != null && priceVs52Low < 15) {
    longTermOutlook = `52주 저점에 가까운 구간으로 장기 투자자에게 매력적인 가격대입니다. 단기 변동성은 있을 수 있지만, 장기 보유 목적이라면 현 수준에서 분할 매수를 고려해볼 만합니다.`
  } else if (priceVs52High != null && priceVs52High < -30) {
    longTermOutlook = `고점 대비 큰 폭으로 하락한 상태입니다. 추가 하락 가능성도 있으나, 장기 관점에서는 이미 충분한 조정이 이뤄졌을 수 있습니다. 분할 매수로 평균 단가를 낮춰가는 전략이 유효합니다.`
  } else if (score >= 65) {
    longTermOutlook = `전반적인 지표가 양호합니다. 장기 투자 관점에서도 긍정적이며, 단기 과열 시 소폭 조정을 기다린 후 진입하거나 지금 일부 매수 후 추가 하락 시 분할 매수하는 전략을 추천합니다.`
  } else {
    longTermOutlook = `현재 뚜렷한 방향성이 없는 구간입니다. 장기 투자 목적이라면 하락장은 오래 지속되지 않으므로 지금부터 소액씩 분할 매수를 시작하거나, 명확한 추세 전환 신호 후 진입하는 방법 모두 유효합니다.`
  }

  return { score, recommendation, outlook, longTermOutlook, reasons: reasons.slice(0, 3), risks: risks.slice(0, 2) }
}

export default defineConfig({
  plugins: [react(), stockDataPlugin(), geminiPlugin()],
  optimizeDeps: {
    include: ['technicalindicators', 'lightweight-charts']
  }
})

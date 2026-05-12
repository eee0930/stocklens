import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ── Stock data proxy (yahoo-finance2) ────────────────────────────
function stockDataPlugin() {
  return {
    name: 'stock-data',
    configureServer(server) {
      server.middlewares.use('/api/stock', async (req, res) => {
        const path = req.url   // /search?q=... | /chart/AAPL | /summary/AAPL

        const send = (status, data) => {
          res.writeHead(status, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(data))
        }

        try {
          const { default: YahooFinance } = await import('yahoo-finance2')
          const yf = new YahooFinance({ suppressNotices: ['ripHistorical'] })

          if (path.startsWith('/search')) {
            const q = new URL(`http://x${path}`).searchParams.get('q')
            const result = await yf.search(q, {}, { validateResult: false })
            send(200, result.quotes ?? [])

          } else if (path.startsWith('/chart/')) {
            const symbol = path.match(/\/chart\/([^?]+)/)?.[1]
            const sixMoAgo = new Date(Date.now() - 183 * 24 * 60 * 60 * 1000)
            const history = await yf.historical(symbol, {
              period1: sixMoAgo,
              period2: new Date(),
              interval: '1d',
            }, { validateResult: false })
            send(200, history)

          } else if (path.startsWith('/summary/')) {
            const symbol = path.match(/\/summary\/([^?]+)/)?.[1]
            const summary = await yf.quoteSummary(symbol, {
              modules: ['financialData', 'defaultKeyStatistics', 'assetProfile', 'summaryDetail'],
            }, { validateResult: false })
            send(200, summary)

          } else {
            send(404, { error: 'Unknown endpoint' })
          }
        } catch (err) {
          console.error('Stock data error:', err.message)
          send(500, { error: err.message })
        }
      })
    }
  }
}

// ── Gemini AI proxy ──────────────────────────────────────────────
function geminiPlugin() {
  return {
    name: 'gemini-api',
    configureServer(server) {
      server.middlewares.use('/api/analyze', async (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }
        let body = ''
        req.on('data', c => { body += c.toString() })
        req.on('end', async () => {
          const d = JSON.parse(body)
          try {
            const { GoogleGenerativeAI } = await import('@google/generative-ai')
            const apiKey = process.env.GEMINI_API_KEY
            const genAI = new GoogleGenerativeAI(apiKey)
            // gemini-2.0-flash-lite 먼저 시도, 실패 시 gemini-1.5-flash
            let result
            for (const modelName of ['gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash']) {
              try {
                const model = genAI.getGenerativeModel({ model: modelName })
                result = await model.generateContent(buildPrompt(d))
                break
              } catch (e) {
                if (!e.message?.includes('quota') && !e.message?.includes('not found')) throw e
              }
            }
            if (!result) throw new Error('사용 가능한 Gemini 모델이 없습니다.')
            const text = result.response.text()
            let analysis
            try {
              const m = text.match(/\{[\s\S]*\}/)
              analysis = JSON.parse(m ? m[0] : text)
            } catch {
              analysis = { score: 50, recommendation: '중립', outlook: text, reasons: [], risks: [] }
            }
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(analysis))
          } catch (err) {
            console.error('Gemini error:', err.message)
            // AI 실패 시 규칙 기반 분석으로 대체
            const fallback = ruleBasedAnalysis(d)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ...fallback, isRuleBased: true }))
          }
        })
      })
    }
  }
}

function buildPrompt(d) {
  return `당신은 미국 주식 시장 전문 애널리스트입니다. 다음 정량 데이터를 기반으로 단기(1~4주) 투자 의견을 분석하세요.

## 종목 정보
- 종목명: ${d.companyName} (${d.symbol})
- 섹터: ${d.sector || 'N/A'} / 업종: ${d.industry || 'N/A'}
- 현재가: $${d.currentPrice?.toFixed(2)}

## 모멘텀 & 기술적 지표
- 최근 7일 수익률: ${d.sevenDayReturn != null ? d.sevenDayReturn.toFixed(2) + '%' : 'N/A'}
- 거래량 증가율 (vs 20일 평균): ${d.volumeGrowthRate != null ? d.volumeGrowthRate.toFixed(2) + '%' : 'N/A'}
- RSI (14일): ${d.rsi != null ? d.rsi.toFixed(2) : 'N/A'}
- MACD 히스토그램: ${d.macdHistogram != null ? d.macdHistogram.toFixed(4) : 'N/A'}
- 20일 이동평균 대비: ${d.priceVsSMA20 != null ? d.priceVsSMA20.toFixed(2) + '%' : 'N/A'}
- 52주 고점 대비: ${d.priceVs52High != null ? d.priceVs52High.toFixed(2) + '%' : 'N/A'}
- 52주 저점 대비: ${d.priceVs52Low != null ? d.priceVs52Low.toFixed(2) + '%' : 'N/A'}

## 펀더멘털
- 실적 성장률 (YoY): ${d.earningsGrowth != null ? d.earningsGrowth + '%' : 'N/A'}
- 매출 성장률 (YoY): ${d.revenueGrowth != null ? d.revenueGrowth + '%' : 'N/A'}
- 영업이익률: ${d.operatingMargin != null ? d.operatingMargin + '%' : 'N/A'}
- 순이익률: ${d.profitMargin != null ? d.profitMargin + '%' : 'N/A'}
- P/E 비율: ${d.peRatio || 'N/A'}
- 베타: ${d.beta || 'N/A'}
- 시가총액: ${d.marketCapFormatted || 'N/A'}

위 데이터만을 근거로 단기 투자 의견을 제시하세요. 반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):

{
  "score": <0~100 정수>,
  "recommendation": "<강력매수|매수|중립|매도|강력매도 중 하나>",
  "outlook": "<단기 전망 2~3문장, 한국어>",
  "reasons": ["<근거1>", "<근거2>", "<근거3>"],
  "risks": ["<리스크1>", "<리스크2>"]
}`
}

function ruleBasedAnalysis(d) {
  let score = 50
  const reasons = []
  const risks = []

  // RSI
  if (d.rsi != null) {
    if (d.rsi < 30)       { score += 12; reasons.push(`RSI ${d.rsi.toFixed(1)} — 과매도 구간으로 반등 가능성`) }
    else if (d.rsi < 50)  { score += 5;  reasons.push(`RSI ${d.rsi.toFixed(1)} — 중립 이하, 추가 하락 주의`) }
    else if (d.rsi < 65)  { score += 8;  reasons.push(`RSI ${d.rsi.toFixed(1)} — 건강한 상승 구간`) }
    else if (d.rsi < 75)  { score += 3;  risks.push(`RSI ${d.rsi.toFixed(1)} — 과매수 접근, 단기 조정 가능`) }
    else                  { score -= 8;  risks.push(`RSI ${d.rsi.toFixed(1)} — 과매수 구간, 매도 압력 증가`) }
  }

  // 7일 수익률
  if (d.sevenDayReturn != null) {
    if (d.sevenDayReturn > 5)       { score += 8;  reasons.push(`7일 수익률 +${d.sevenDayReturn.toFixed(1)}% — 강한 단기 모멘텀`) }
    else if (d.sevenDayReturn > 0)  { score += 4;  reasons.push(`7일 수익률 +${d.sevenDayReturn.toFixed(1)}% — 양호한 단기 흐름`) }
    else if (d.sevenDayReturn > -5) { score -= 3;  risks.push(`7일 수익률 ${d.sevenDayReturn.toFixed(1)}% — 단기 약세`) }
    else                            { score -= 10; risks.push(`7일 수익률 ${d.sevenDayReturn.toFixed(1)}% — 강한 단기 하락`) }
  }

  // MACD
  if (d.macdHistogram != null) {
    if (d.macdHistogram > 0) { score += 6;  reasons.push('MACD 히스토그램 양수 — 상승 모멘텀') }
    else                     { score -= 6;  risks.push('MACD 히스토그램 음수 — 하락 모멘텀') }
  }

  // SMA20 대비
  if (d.priceVsSMA20 != null) {
    if (d.priceVsSMA20 > 3)       { score += 5;  reasons.push(`20일 이평선 +${d.priceVsSMA20.toFixed(1)}% 위 — 단기 상승 추세`) }
    else if (d.priceVsSMA20 > 0)  { score += 2 }
    else if (d.priceVsSMA20 > -5) { score -= 3;  risks.push('20일 이평선 하회 — 단기 추세 약화') }
    else                          { score -= 8;  risks.push(`20일 이평선 ${d.priceVsSMA20.toFixed(1)}% 하회 — 추세 붕괴`) }
  }

  // 거래량
  if (d.volumeGrowthRate != null && d.volumeGrowthRate > 30) {
    score += 4
    reasons.push(`거래량 평균 대비 +${d.volumeGrowthRate.toFixed(0)}% — 관심 증가`)
  }

  // 실적 성장률
  if (d.earningsGrowth != null) {
    const g = parseFloat(d.earningsGrowth)
    if (g > 20)      { score += 7;  reasons.push(`실적 성장률 +${g}% — 강한 이익 성장`) }
    else if (g > 0)  { score += 3;  reasons.push(`실적 성장률 +${g}% — 양호한 이익 성장`) }
    else             { score -= 5;  risks.push(`실적 성장률 ${g}% — 이익 감소 추세`) }
  }

  score = Math.max(10, Math.min(90, score))

  let recommendation
  if (score >= 75)      recommendation = '강력매수'
  else if (score >= 63) recommendation = '매수'
  else if (score >= 45) recommendation = '중립'
  else if (score >= 33) recommendation = '매도'
  else                  recommendation = '강력매도'

  const outlook = `${d.companyName}(${d.symbol})의 기술적 지표를 종합하면 단기 ${recommendation} 의견입니다. RSI·MACD·이동평균 등 정량 지표 기반 규칙 분석 결과이며, Gemini AI 키 설정 후 더 정밀한 분석이 제공됩니다.`

  return { score, recommendation, outlook, reasons: reasons.slice(0, 3), risks: risks.slice(0, 2) }
}

export default defineConfig({
  plugins: [react(), stockDataPlugin(), geminiPlugin()],
  optimizeDeps: {
    include: ['technicalindicators', 'lightweight-charts']
  }
})

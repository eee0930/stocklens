/// <reference types="node" />
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (req: any, res: any) => Promise<void>

// ── inlined from shared/geminiAnalysis.ts ──────────────────────────────────

function buildPrompt(d: Record<string, unknown>): string {
  const n   = (v: unknown, suffix = '') => v != null ? `${v}${suffix}` : 'N/A'
  const pct = (v: unknown) => typeof v === 'number' ? v.toFixed(1) + '%' : (v != null ? `${v}%` : 'N/A')
  const price = typeof d.currentPrice === 'number' ? '$' + d.currentPrice.toFixed(2) : 'N/A'
  const desc  = typeof d.description === 'string' && d.description
    ? `\n사업 개요: ${d.description.slice(0, 400)}`
    : ''

  return `당신은 월스트리트 수석 애널리스트입니다. 아래 데이터를 바탕으로 ${d.companyName}(${d.symbol})에 대한 심층 투자 분석을 작성하세요.

[종목 정보]
회사명: ${d.companyName} (${d.symbol})
섹터: ${n(d.sector)} | 산업: ${n(d.industry)}
현재가: ${price} | 시가총액: ${n(d.marketCapFormatted)} | 베타: ${n(d.beta)}${desc}

[기술적 지표]
RSI(14): ${typeof d.rsi === 'number' ? d.rsi.toFixed(1) : 'N/A'}
MACD 히스토그램: ${typeof d.macdHistogram === 'number' ? d.macdHistogram.toFixed(4) : 'N/A'}
20일 이평선 대비: ${pct(d.priceVsSMA20)}
7일 수익률: ${pct(d.sevenDayReturn)}
52주 고점 대비: ${pct(d.priceVs52High)} | 52주 저점 대비: ${pct(d.priceVs52Low)}
거래량 증감률(20일 평균 대비): ${pct(d.volumeGrowthRate)}

[펀더멘털]
P/E: ${n(d.peRatio)} | 실적 성장(YoY): ${n(d.earningsGrowth, '%')} | 영업이익률: ${n(d.operatingMargin, '%')}

[분석 지침]
- outlook: 현재 기술적 지표와 이 회사 고유의 사업 특성을 연결하여 단기(1~4주) 주가 방향성을 3~5문장으로 설명. 수치를 직접 인용할 것.
- longTermOutlook: 펀더멘털, 섹터 전망, 밸류에이션을 근거로 6~12개월 장기 투자 전략을 3~5문장으로 조언. 매수 타이밍, 목표가 수준, 리스크 관리 방법 포함.
- reasons: 이 종목만의 구체적 매수/보유 근거 3~4개. 단순 지표 나열이 아닌 "왜 이 수치가 이 회사에서 의미 있는지" 설명.
- risks: 투자 시 주의해야 할 리스크 2~3개. 섹터·경쟁·거시경제 요인 포함.

아래 JSON만 반환 (설명 텍스트, 마크다운 금지):
{"score":<0-100>,"recommendation":"<강력매수|매수|중립|매도|강력매도>","outlook":"<3~5문장>","longTermOutlook":"<3~5문장>","reasons":["<근거1>","<근거2>","<근거3>"],"risks":["<리스크1>","<리스크2>"]}`
}

function parseGeminiResponse(text: string): Record<string, unknown> {
  try {
    const m = text.match(/\{[\s\S]*\}/)
    return JSON.parse(m ? m[0] : text) as Record<string, unknown>
  } catch {
    return { score: 50, recommendation: '중립', outlook: text, reasons: [], risks: [] }
  }
}

function ruleBasedAnalysis(d: Record<string, unknown>): Record<string, unknown> {
  let score = 50
  const reasons: string[] = []
  const risks: string[] = []

  const rsi              = typeof d.rsi === 'number' ? d.rsi : null
  const sevenDayReturn   = typeof d.sevenDayReturn === 'number' ? d.sevenDayReturn : null
  const macdHistogram    = typeof d.macdHistogram === 'number' ? d.macdHistogram : null
  const priceVsSMA20     = typeof d.priceVsSMA20 === 'number' ? d.priceVsSMA20 : null
  const volumeGrowthRate = typeof d.volumeGrowthRate === 'number' ? d.volumeGrowthRate : null
  const earningsGrowth   = d.earningsGrowth != null ? parseFloat(String(d.earningsGrowth)) : null
  const priceVs52Low     = typeof d.priceVs52Low === 'number' ? d.priceVs52Low : null
  const priceVs52High    = typeof d.priceVs52High === 'number' ? d.priceVs52High : null

  if (rsi != null) {
    if (rsi < 30)       { score += 12; reasons.push(`RSI ${rsi.toFixed(1)} — 과매도 구간으로 반등 가능성`) }
    else if (rsi < 50)  { score += 5;  reasons.push(`RSI ${rsi.toFixed(1)} — 중립 이하, 추가 하락 주의`) }
    else if (rsi < 65)  { score += 8;  reasons.push(`RSI ${rsi.toFixed(1)} — 건강한 상승 구간`) }
    else if (rsi < 75)  { score += 3;  risks.push(`RSI ${rsi.toFixed(1)} — 과매수 접근, 단기 조정 가능`) }
    else                { score -= 8;  risks.push(`RSI ${rsi.toFixed(1)} — 과매수 구간, 매도 압력 증가`) }
  }
  if (sevenDayReturn != null) {
    if (sevenDayReturn > 5)       { score += 8;  reasons.push(`7일 수익률 +${sevenDayReturn.toFixed(1)}% — 강한 단기 모멘텀`) }
    else if (sevenDayReturn > 0)  { score += 4;  reasons.push(`7일 수익률 +${sevenDayReturn.toFixed(1)}% — 양호한 단기 흐름`) }
    else if (sevenDayReturn > -5) { score -= 3;  risks.push(`7일 수익률 ${sevenDayReturn.toFixed(1)}% — 단기 약세`) }
    else                          { score -= 10; risks.push(`7일 수익률 ${sevenDayReturn.toFixed(1)}% — 강한 단기 하락`) }
  }
  if (macdHistogram != null) {
    if (macdHistogram > 0) { score += 6; reasons.push('MACD 히스토그램 양수 — 상승 모멘텀') }
    else                   { score -= 6; risks.push('MACD 히스토그램 음수 — 하락 모멘텀') }
  }
  if (priceVsSMA20 != null) {
    if (priceVsSMA20 > 3)       { score += 5; reasons.push(`20일 이평선 +${priceVsSMA20.toFixed(1)}% 위 — 단기 상승 추세`) }
    else if (priceVsSMA20 > 0)  { score += 2 }
    else if (priceVsSMA20 > -5) { score -= 3; risks.push('20일 이평선 하회 — 단기 추세 약화') }
    else                        { score -= 8; risks.push(`20일 이평선 ${priceVsSMA20.toFixed(1)}% 하회 — 추세 붕괴`) }
  }
  if (volumeGrowthRate != null && volumeGrowthRate > 30) {
    score += 4; reasons.push(`거래량 평균 대비 +${volumeGrowthRate.toFixed(0)}% — 관심 증가`)
  }
  if (earningsGrowth != null) {
    if (earningsGrowth > 20)     { score += 7; reasons.push(`실적 성장률 +${earningsGrowth}% — 강한 이익 성장`) }
    else if (earningsGrowth > 0) { score += 3; reasons.push(`실적 성장률 +${earningsGrowth}% — 양호한 이익 성장`) }
    else                         { score -= 5; risks.push(`실적 성장률 ${earningsGrowth}% — 이익 감소 추세`) }
  }

  score = Math.max(10, Math.min(90, score))

  let recommendation: string
  if (score >= 75)      recommendation = '강력매수'
  else if (score >= 63) recommendation = '매수'
  else if (score >= 45) recommendation = '중립'
  else if (score >= 33) recommendation = '매도'
  else                  recommendation = '강력매도'

  const rsiDesc = rsi != null
    ? rsi < 30 ? `RSI ${rsi.toFixed(1)}로 과매도 구간` : rsi > 70 ? `RSI ${rsi.toFixed(1)}로 과매수 구간` : `RSI ${rsi.toFixed(1)}`
    : null
  const macdDesc = macdHistogram != null
    ? macdHistogram > 0 ? 'MACD 히스토그램 양수(상승 모멘텀)' : 'MACD 히스토그램 음수(하락 모멘텀)'
    : null
  const smaDesc = priceVsSMA20 != null
    ? priceVsSMA20 > 0 ? `20일 이평선 +${priceVsSMA20.toFixed(1)}% 위` : `20일 이평선 ${priceVsSMA20.toFixed(1)}% 하회`
    : null
  const indicators = [rsiDesc, macdDesc, smaDesc].filter(Boolean).join(', ')

  const outlook = `${d.companyName}(${d.symbol})의 단기 기술적 신호는 ${recommendation} 구간입니다. ${indicators ? `현재 ${indicators} 상태로` : ''} 정량 지표를 종합한 점수는 ${score}점(100점 만점)입니다. Gemini AI 분석을 사용할 수 없어 규칙 기반 분석으로 대체되었습니다.`

  let longTermOutlook: string
  if (earningsGrowth != null && earningsGrowth > 15 && priceVs52High != null && priceVs52High > -10) {
    longTermOutlook = `실적 성장률 +${earningsGrowth}%로 펀더멘털이 탄탄하지만, 현재가가 52주 고점 ${Math.abs(priceVs52High).toFixed(1)}% 이내로 고점 부담이 있습니다. 장기 투자 가치는 있으나 단기 조정 시 분할 매수 진입을 권장합니다.`
  } else if (earningsGrowth != null && earningsGrowth > 15 && priceVs52Low != null && priceVs52Low < 20) {
    longTermOutlook = `실적 성장률 +${earningsGrowth}%의 높은 성장성을 보유하면서 52주 저점 +${priceVs52Low.toFixed(1)}% 수준의 저렴한 가격대입니다. 장기 보유 목적이라면 현재 구간이 매력적인 진입 시점입니다.`
  } else if (priceVs52Low != null && priceVs52Low < 15) {
    longTermOutlook = `현재가가 52주 저점 +${priceVs52Low.toFixed(1)}% 수준으로 역사적 저가 구간입니다. 추가 하락 리스크를 고려해 소량씩 분할 매수하는 전략이 유효합니다.`
  } else if (priceVs52High != null && priceVs52High < -30) {
    longTermOutlook = `52주 고점 대비 ${Math.abs(priceVs52High).toFixed(1)}% 하락한 상태로 상당한 조정이 진행됐습니다. 하락 원인이 일시적이라면 장기 분할 매수 관점에서 접근할 만합니다.`
  } else if (score >= 65) {
    longTermOutlook = `전반적인 기술적 지표(점수 ${score}점)가 양호한 수준입니다. 단기 과열 시 소폭 조정 후 진입하거나, 현재 일부 매수 후 추가 하락 시 비중을 늘리는 분할 매수 전략을 권장합니다.`
  } else {
    longTermOutlook = `현재 기술적 지표(점수 ${score}점)는 방향성이 불명확한 구간입니다. 추세 전환 신호(RSI 반등, MACD 골든크로스 등) 확인 후 진입하거나 소액씩 분할 매수를 시작하는 방법 모두 유효합니다.`
  }

  return { score, recommendation, outlook, longTermOutlook, reasons: reasons.slice(0, 3), risks: risks.slice(0, 2) }
}

// ── server-side cache ──────────────────────────────────────────────────────

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

// ── handler ────────────────────────────────────────────────────────────────

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
          const retryInfo = details.find(item => item['@type']?.includes('RetryInfo'))
          const delaySec = parseFloat(retryInfo?.retryDelay ?? '') || 62
          err.retryDelayMs = Math.ceil(delaySec * 1000) + 1000
          // 진짜 일일 소진: PerDay 위반 + 재시도 대기가 1시간 초과 (RPM 초과는 보통 60초 이내)
          const hasPerDayViolation = violations.some(v => v.quotaId?.includes('PerDay'))
          if (hasPerDayViolation && delaySec > 3600) {
            markDailyExhausted(modelName)
            err.isDailyExhausted = true
          }
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
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite']
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

  if (text === null) {
    const fallback = ruleBasedAnalysis(d)
    let errorMsg: string
    if (dailyExhaustedCount >= models.length) {
      errorMsg = 'Gemini 일일 무료 할당량 초과 (자정 후 갱신)'
    } else if (bestRetryMs !== null) {
      errorMsg = `Gemini 분당 한도 초과 (${Math.ceil(bestRetryMs / 1000)}초 후 갱신)`
    } else {
      errorMsg = 'Gemini API 일시적 오류'
    }
    return res.status(200).json({ ...fallback, isRuleBased: true, geminiError: errorMsg })
  }

  const analysis = parseGeminiResponse(text)
  setServerCached(d.symbol as string, analysis)
  return res.status(200).json(analysis)
}

export default handler

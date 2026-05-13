// 서버 사이드 캐시 (Vercel warm instance 동안 공유 — 모든 사용자 공유)
const serverCache = new Map() // symbol → { analysis, dateKey }

function getServerCached(symbol) {
  const today = new Date().toISOString().slice(0, 10)
  const entry = serverCache.get((symbol || '').toUpperCase())
  if (!entry || entry.dateKey !== today || entry.analysis?.isRuleBased) return null
  return entry.analysis
}

function setServerCached(symbol, analysis) {
  if (!symbol) return
  serverCache.set(symbol.toUpperCase(), {
    analysis,
    dateKey: new Date().toISOString().slice(0, 10),
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const d = req.body

  // 서버 캐시 히트 → Gemini 호출 없이 바로 반환
  const cached = getServerCached(d.symbol)
  if (cached) return res.status(200).json(cached)

  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.')

    const sleep = (ms) => new Promise(r => setTimeout(r, ms))
    const models = ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-2.5-flash']

    async function callGemini(modelName) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 15000)
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: buildPrompt(d) }] }] }),
            signal: controller.signal,
          }
        )
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          const msg = body?.error?.message || `HTTP ${res.status}`
          throw Object.assign(new Error(msg), { status: res.status })
        }
        const data = await res.json()
        return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      } finally {
        clearTimeout(timer)
      }
    }

    let text = null
    const modelErrors = []
    for (let i = 0; i < models.length; i++) {
      if (i > 0) await sleep(1500)
      try {
        text = await callGemini(models[i])
        break
      } catch (e) {
        const msg = e.name === 'AbortError' ? '15s timeout' : e.message
        modelErrors.push(`[${models[i]}] ${msg}`)
        console.error(`Gemini error (${models[i]}):`, msg)
        if (e.status === 400 || e.status === 403) throw e  // 인증 오류: 즉시 중단
        if (e.status === 429) break                         // 분당 한도 초과: 다른 모델도 같으므로 즉시 규칙기반으로
      }
    }

    if (text === null) {
      const isQuota = modelErrors.some(e => e.includes('quota') || e.includes('429'))
      throw new Error(isQuota
        ? 'Gemini 무료 할당량 초과 — 잠시 후 다시 시도하거나 Google AI Studio에서 결제를 활성화하세요.'
        : modelErrors.join(' | ')
      )
    }

    let analysis
    try {
      const m = text.match(/\{[\s\S]*\}/)
      analysis = JSON.parse(m ? m[0] : text)
    } catch {
      analysis = { score: 50, recommendation: '중립', outlook: text, reasons: [], risks: [] }
    }

    setServerCached(d.symbol, analysis)
    res.status(200).json(analysis)
  } catch (err) {
    console.error('Gemini error:', err.message)
    const fallback = ruleBasedAnalysis(d)
    res.status(200).json({ ...fallback, isRuleBased: true, geminiError: err.message })
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

function ruleBasedAnalysis(d) {
  let score = 50
  const reasons = []
  const risks = []

  if (d.rsi != null) {
    if (d.rsi < 30)       { score += 12; reasons.push(`RSI ${d.rsi.toFixed(1)} — 과매도 구간으로 반등 가능성`) }
    else if (d.rsi < 50)  { score += 5;  reasons.push(`RSI ${d.rsi.toFixed(1)} — 중립 이하, 추가 하락 주의`) }
    else if (d.rsi < 65)  { score += 8;  reasons.push(`RSI ${d.rsi.toFixed(1)} — 건강한 상승 구간`) }
    else if (d.rsi < 75)  { score += 3;  risks.push(`RSI ${d.rsi.toFixed(1)} — 과매수 접근, 단기 조정 가능`) }
    else                  { score -= 8;  risks.push(`RSI ${d.rsi.toFixed(1)} — 과매수 구간, 매도 압력 증가`) }
  }

  if (d.sevenDayReturn != null) {
    if (d.sevenDayReturn > 5)       { score += 8;  reasons.push(`7일 수익률 +${d.sevenDayReturn.toFixed(1)}% — 강한 단기 모멘텀`) }
    else if (d.sevenDayReturn > 0)  { score += 4;  reasons.push(`7일 수익률 +${d.sevenDayReturn.toFixed(1)}% — 양호한 단기 흐름`) }
    else if (d.sevenDayReturn > -5) { score -= 3;  risks.push(`7일 수익률 ${d.sevenDayReturn.toFixed(1)}% — 단기 약세`) }
    else                            { score -= 10; risks.push(`7일 수익률 ${d.sevenDayReturn.toFixed(1)}% — 강한 단기 하락`) }
  }

  if (d.macdHistogram != null) {
    if (d.macdHistogram > 0) { score += 6;  reasons.push('MACD 히스토그램 양수 — 상승 모멘텀') }
    else                     { score -= 6;  risks.push('MACD 히스토그램 음수 — 하락 모멘텀') }
  }

  if (d.priceVsSMA20 != null) {
    if (d.priceVsSMA20 > 3)       { score += 5;  reasons.push(`20일 이평선 +${d.priceVsSMA20.toFixed(1)}% 위 — 단기 상승 추세`) }
    else if (d.priceVsSMA20 > 0)  { score += 2 }
    else if (d.priceVsSMA20 > -5) { score -= 3;  risks.push('20일 이평선 하회 — 단기 추세 약화') }
    else                          { score -= 8;  risks.push(`20일 이평선 ${d.priceVsSMA20.toFixed(1)}% 하회 — 추세 붕괴`) }
  }

  if (d.volumeGrowthRate != null && d.volumeGrowthRate > 30) {
    score += 4
    reasons.push(`거래량 평균 대비 +${d.volumeGrowthRate.toFixed(0)}% — 관심 증가`)
  }

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

  const outlook = `${d.companyName}(${d.symbol})의 기술적 지표를 종합하면 단기 ${recommendation} 의견입니다. RSI·MACD·이동평균 등 정량 지표 기반 규칙 분석 결과입니다.`

  // 장기 전망 규칙 기반 생성
  let longTermOutlook
  const eg = d.earningsGrowth != null ? parseFloat(d.earningsGrowth) : null
  const fromLow = d.priceVs52Low != null ? d.priceVs52Low : null
  const fromHigh = d.priceVs52High != null ? d.priceVs52High : null

  if (eg != null && eg > 15 && fromHigh != null && fromHigh > -10) {
    longTermOutlook = `실적 성장세(+${eg}%)가 탄탄하지만 현재 52주 고점 근처에 위치해 있습니다. 장기 투자 가치는 충분하나, 단기 조정 가능성을 고려해 분할 매수 전략을 추천합니다.`
  } else if (eg != null && eg > 15 && fromLow != null && fromLow < 20) {
    longTermOutlook = `실적 성장성이 높고 52주 저점 근처의 저렴한 가격대입니다. 장기 보유 목적이라면 지금도 좋은 진입 시점으로 볼 수 있으며, 하락장은 오래 지속되지 않는 경향이 있어 분할 매수를 고려해보세요.`
  } else if (fromLow != null && fromLow < 15) {
    longTermOutlook = `52주 저점에 가까운 구간으로 장기 투자자에게 매력적인 가격대입니다. 단기 변동성은 있을 수 있지만, 장기 보유 목적이라면 현 수준에서 분할 매수를 고려해볼 만합니다.`
  } else if (fromHigh != null && fromHigh < -30) {
    longTermOutlook = `고점 대비 큰 폭으로 하락한 상태입니다. 추가 하락 가능성도 있으나, 장기 관점에서는 이미 충분한 조정이 이뤄졌을 수 있습니다. 분할 매수로 평균 단가를 낮춰가는 전략이 유효합니다.`
  } else if (score >= 65) {
    longTermOutlook = `전반적인 지표가 양호합니다. 장기 투자 관점에서도 긍정적이며, 단기 과열 시 소폭 조정을 기다린 후 진입하거나 지금 일부 매수 후 추가 하락 시 분할 매수하는 전략을 추천합니다.`
  } else {
    longTermOutlook = `현재 뚜렷한 방향성이 없는 구간입니다. 장기 투자 목적이라면 하락장은 오래 지속되지 않으므로 지금부터 소액씩 분할 매수를 시작하거나, 명확한 추세 전환 신호 후 진입하는 방법 모두 유효합니다.`
  }

  return { score, recommendation, outlook, longTermOutlook, reasons: reasons.slice(0, 3), risks: risks.slice(0, 2) }
}

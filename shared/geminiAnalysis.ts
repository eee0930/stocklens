export interface RuleBasedResult {
  score: number
  recommendation: string
  outlook: string
  longTermOutlook: string
  reasons: string[]
  risks: string[]
}

export function buildPrompt(d: Record<string, unknown>): string {
  const n = (v: unknown, suffix = '') => v != null ? `${v}${suffix}` : 'N/A'
  const pct = (v: unknown) => typeof v === 'number' ? v.toFixed(1) + '%' : (v != null ? `${v}%` : 'N/A')
  const price = typeof d.currentPrice === 'number' ? '$' + d.currentPrice.toFixed(2) : 'N/A'

  return `주식 애널리스트로서 아래 데이터를 기반으로 투자 의견을 분석하세요.

종목: ${d.companyName} (${d.symbol}) / 섹터: ${n(d.sector)} / 현재가: ${price}

[기술 지표] 7일 수익률: ${pct(d.sevenDayReturn)} | RSI: ${typeof d.rsi === 'number' ? d.rsi.toFixed(1) : 'N/A'} | MACD 히스토: ${typeof d.macdHistogram === 'number' ? d.macdHistogram.toFixed(4) : 'N/A'} | 20일 이평선 대비: ${pct(d.priceVsSMA20)} | 52주 고점 대비: ${pct(d.priceVs52High)}

[펀더멘털] 실적 성장(YoY): ${n(d.earningsGrowth, '%')} | 영업이익률: ${n(d.operatingMargin, '%')} | P/E: ${n(d.peRatio)}

아래 JSON만 반환 (다른 텍스트 금지):
{"score":<0-100>,"recommendation":"<강력매수|매수|중립|매도|강력매도>","outlook":"<단기 1~2문장>","longTermOutlook":"<장기 매수 타이밍 조언 1~2문장>","reasons":["<근거1>","<근거2>"],"risks":["<리스크1>"]}`
}

export function parseGeminiResponse(text: string): Record<string, unknown> {
  try {
    const m = text.match(/\{[\s\S]*\}/)
    return JSON.parse(m ? m[0] : text) as Record<string, unknown>
  } catch {
    return { score: 50, recommendation: '중립', outlook: text, reasons: [], risks: [] }
  }
}

export function ruleBasedAnalysis(d: Record<string, unknown>): RuleBasedResult {
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

  const outlook = `${d.companyName}(${d.symbol})의 기술적 지표를 종합하면 단기 ${recommendation} 의견입니다. RSI·MACD·이동평균 등 정량 지표 기반 규칙 분석 결과입니다.`

  let longTermOutlook: string
  if (earningsGrowth != null && earningsGrowth > 15 && priceVs52High != null && priceVs52High > -10) {
    longTermOutlook = `실적 성장세(+${earningsGrowth}%)가 탄탄하지만 현재 52주 고점 근처입니다. 장기 투자 가치는 충분하나 단기 조정 가능성을 고려해 분할 매수를 추천합니다.`
  } else if (earningsGrowth != null && earningsGrowth > 15 && priceVs52Low != null && priceVs52Low < 20) {
    longTermOutlook = `실적 성장성이 높고 52주 저점 근처의 저렴한 가격대입니다. 장기 보유 목적이라면 지금도 좋은 진입 시점으로 볼 수 있습니다.`
  } else if (priceVs52Low != null && priceVs52Low < 15) {
    longTermOutlook = `52주 저점에 가까운 구간으로 장기 투자자에게 매력적인 가격대입니다. 분할 매수를 고려해볼 만합니다.`
  } else if (priceVs52High != null && priceVs52High < -30) {
    longTermOutlook = `고점 대비 큰 폭으로 하락한 상태입니다. 장기 관점에서는 충분한 조정이 이뤄졌을 수 있어 분할 매수 전략이 유효합니다.`
  } else if (score >= 65) {
    longTermOutlook = `전반적인 지표가 양호합니다. 단기 과열 시 소폭 조정을 기다린 후 진입하거나 지금 일부 매수 후 추가 하락 시 분할 매수하는 전략을 추천합니다.`
  } else {
    longTermOutlook = `현재 뚜렷한 방향성이 없는 구간입니다. 명확한 추세 전환 신호 후 진입하거나 소액씩 분할 매수를 시작하는 방법 모두 유효합니다.`
  }

  return { score, recommendation, outlook, longTermOutlook, reasons: reasons.slice(0, 3), risks: risks.slice(0, 2) }
}

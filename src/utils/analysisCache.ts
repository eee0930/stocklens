import type { Analysis } from '../types'

const LS_PREFIX = 'sl_analysis:'
const todayKey = () => new Date().toISOString().slice(0, 10)

export function getLocalAnalysis(symbol: string): Analysis | null {
  try {
    const raw = localStorage.getItem(LS_PREFIX + symbol.toUpperCase())
    if (!raw) return null
    const { analysis, dateKey } = JSON.parse(raw) as { analysis: Analysis; dateKey: string }
    if (dateKey !== todayKey() || analysis?.isRuleBased) return null
    return analysis
  } catch { return null }
}

export function setLocalAnalysis(symbol: string, analysis: Analysis): void {
  if (analysis?.isRuleBased) return
  try {
    localStorage.setItem(LS_PREFIX + symbol.toUpperCase(), JSON.stringify({ analysis, dateKey: todayKey() }))
  } catch {}
}

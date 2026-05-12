const BASE_URL = 'https://www.alphavantage.co/query'
const API_KEY = 'QRZJHYVQPJ426HHB'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchAV(params) {
  const url = new URL(BASE_URL)
  url.searchParams.set('apikey', API_KEY)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`API 요청 실패: ${res.status}`)
  const data = await res.json()

  if (data['Note']) {
    throw new Error('분당 API 호출 한도(5회) 초과입니다. 잠시 후 다시 검색해주세요.')
  }
  if (data['Information']) {
    throw new Error('일일 API 호출 한도(25회) 초과입니다. 내일 다시 이용하거나 Alpha Vantage에서 키를 재발급 받으세요.')
  }

  return data
}

export async function searchSymbol(query) {
  const data = await fetchAV({ function: 'SYMBOL_SEARCH', keywords: query })
  const matches = data.bestMatches || []
  return matches.filter((m) =>
    ['United States'].some((r) => m['4. region']?.includes(r)) ||
    m['3. type'] === 'ETF'
  )
}

export async function getDailyData(symbol) {
  const data = await fetchAV({ function: 'TIME_SERIES_DAILY', symbol, outputsize: 'compact' })
  return data['Time Series (Daily)'] || {}
}

export async function getOverview(symbol) {
  await sleep(2000)
  try {
    const data = await fetchAV({ function: 'OVERVIEW', symbol })
    if (!data || !data['Symbol']) return {}
    return data
  } catch (err) {
    // 한도 초과여도 차트·기술 지표는 표시
    console.warn('OVERVIEW 호출 실패 (펀더멘털 없이 진행):', err.message)
    return {}
  }
}

export async function fetchAllStockData(symbol) {
  // SYMBOL_SEARCH(1) + TIME_SERIES_DAILY(2) + OVERVIEW(3) = 총 3회
  // OVERVIEW 실패 시에도 차트·기술 지표는 정상 표시
  const dailyData = await getDailyData(symbol)
  const overview = await getOverview(symbol)
  return { dailyData, overview }
}

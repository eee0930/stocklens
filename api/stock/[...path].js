export default async function handler(req, res) {
  // req.url 예: /api/stock/search?q=AAPL  |  /api/stock/chart/AAPL
  const url    = new URL(req.url, 'http://x')
  const path   = url.pathname.replace(/^\/api\/stock/, '')   // → /search, /chart/AAPL, ...
  const params = url.searchParams

  const send = (status, data) => res.status(status).json(data)

  try {
    const { default: YahooFinance } = await import('yahoo-finance2')
    const yf = new YahooFinance({ suppressNotices: ['ripHistorical'] })

    if (path.startsWith('/search')) {
      const q = params.get('q')
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
}

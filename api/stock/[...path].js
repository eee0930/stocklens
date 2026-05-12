export default async function handler(req, res) {
  const segments = Array.isArray(req.query.path)
    ? req.query.path
    : [req.query.path].filter(Boolean)
  const route = segments[0]

  const send = (status, data) => res.status(status).json(data)

  try {
    const { default: YahooFinance } = await import('yahoo-finance2')
    const yf = new YahooFinance({ suppressNotices: ['ripHistorical'] })

    if (route === 'search') {
      const q = req.query.q
      const result = await yf.search(q, {}, { validateResult: false })
      send(200, result.quotes ?? [])

    } else if (route === 'chart') {
      const symbol = segments[1]
      const sixMoAgo = new Date(Date.now() - 183 * 24 * 60 * 60 * 1000)
      const history = await yf.historical(symbol, {
        period1: sixMoAgo,
        period2: new Date(),
        interval: '1d',
      }, { validateResult: false })
      send(200, history)

    } else if (route === 'summary') {
      const symbol = segments[1]
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

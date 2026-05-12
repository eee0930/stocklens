export default async function handler(req, res) {
  const symbol = req.query.symbol
  try {
    const { default: YahooFinance } = await import('yahoo-finance2')
    const yf = new YahooFinance({ suppressNotices: ['ripHistorical'] })
    const summary = await yf.quoteSummary(symbol, {
      modules: ['financialData', 'defaultKeyStatistics', 'assetProfile', 'summaryDetail'],
    }, { validateResult: false })
    res.status(200).json(summary)
  } catch (err) {
    console.error('Summary error:', err.message)
    res.status(500).json({ error: err.message })
  }
}

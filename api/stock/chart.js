export default async function handler(req, res) {
  const symbol = req.query.symbol
  try {
    const { default: YahooFinance } = await import('yahoo-finance2')
    const yf = new YahooFinance({ suppressNotices: ['ripHistorical'] })
    const sixMoAgo = new Date(Date.now() - 183 * 24 * 60 * 60 * 1000)
    const history = await yf.historical(symbol, {
      period1: sixMoAgo,
      period2: new Date(),
      interval: '1d',
    }, { validateResult: false })
    res.status(200).json(history)
  } catch (err) {
    console.error('Chart error:', err.message)
    res.status(500).json({ error: err.message })
  }
}

export default async function handler(req, res) {
  const q = req.query.q
  try {
    const { default: YahooFinance } = await import('yahoo-finance2')
    const yf = new YahooFinance({ suppressNotices: ['ripHistorical'] })
    const result = await yf.search(q, {}, { validateResult: false })
    res.status(200).json(result.quotes ?? [])
  } catch (err) {
    console.error('Search error:', err.message)
    res.status(500).json({ error: err.message })
  }
}

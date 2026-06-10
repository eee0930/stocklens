/// <reference types="node" />
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (req: any, res: any) => Promise<void>

const handler: Handler = async (req, res) => {
  const symbol = req.query.symbol as string
  try {
    const { default: YahooFinance } = await import('yahoo-finance2') as { default: new (opts: Record<string, unknown>) => unknown }
    const yf = new YahooFinance({ suppressNotices: ['ripHistorical'] }) as {
      chart: (symbol: string, opts: Record<string, unknown>, extra: Record<string, unknown>) => Promise<{ quotes?: Array<Record<string, unknown>> }>
    }
    const fiveYrsAgo = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000)
    const result = await yf.chart(symbol, {
      period1: fiveYrsAgo,
      period2: new Date(),
      interval: '1d',
      includePrePost: false,
    }, { validateResult: false })

    const rows = (result.quotes ?? [])
      .filter(q => q.open != null && q.high != null && q.low != null && q.close != null)
      .map(({ adjclose, ...rest }) => adjclose != null ? { ...rest, adjClose: adjclose } : rest)

    res.status(200).json(rows)
  } catch (err) {
    console.error('Chart error:', (err as Error).message)
    res.status(500).json({ error: (err as Error).message })
  }
}

export default handler

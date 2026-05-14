/// <reference types="node" />
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (req: any, res: any) => Promise<void>

const handler: Handler = async (req, res) => {
  const symbol = req.query.symbol as string
  try {
    const { default: YahooFinance } = await import('yahoo-finance2') as { default: new (opts: Record<string, unknown>) => unknown }
    const yf = new YahooFinance({ suppressNotices: ['ripHistorical'] }) as {
      historical: (symbol: string, opts: Record<string, unknown>, extra: Record<string, unknown>) => Promise<unknown[]>
    }
    const fiveYrsAgo = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000)
    const history = await yf.historical(symbol, {
      period1: fiveYrsAgo,
      period2: new Date(),
      interval: '1d',
    }, { validateResult: false })
    res.status(200).json(history)
  } catch (err) {
    console.error('Chart error:', (err as Error).message)
    res.status(500).json({ error: (err as Error).message })
  }
}

export default handler

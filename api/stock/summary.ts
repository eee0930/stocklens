/// <reference types="node" />
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (req: any, res: any) => Promise<void>

const handler: Handler = async (req, res) => {
  const symbol = req.query.symbol as string
  try {
    const { default: YahooFinance } = await import('yahoo-finance2') as { default: new (opts: Record<string, unknown>) => unknown }
    const yf = new YahooFinance({ suppressNotices: ['ripHistorical'] }) as {
      quoteSummary: (symbol: string, opts: Record<string, unknown>, extra: Record<string, unknown>) => Promise<unknown>
    }
    const summary = await yf.quoteSummary(symbol, {
      modules: ['financialData', 'defaultKeyStatistics', 'assetProfile', 'summaryDetail', 'topHoldings'],
    }, { validateResult: false })
    res.status(200).json(summary)
  } catch (err) {
    console.error('Summary error:', (err as Error).message)
    res.status(500).json({ error: (err as Error).message })
  }
}

export default handler

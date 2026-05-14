/// <reference types="node" />
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (req: any, res: any) => Promise<void>

const handler: Handler = async (req, res) => {
  const q = req.query.q as string
  try {
    const { default: YahooFinance } = await import('yahoo-finance2') as { default: new (opts: Record<string, unknown>) => unknown }
    const yf = new YahooFinance({ suppressNotices: ['ripHistorical'] }) as {
      search: (q: string, opts: Record<string, unknown>, extra: Record<string, unknown>) => Promise<{ quotes?: unknown[] }>
    }
    const result = await yf.search(q, {}, { validateResult: false })
    res.status(200).json(result.quotes ?? [])
  } catch (err) {
    console.error('Search error:', (err as Error).message)
    res.status(500).json({ error: (err as Error).message })
  }
}

export default handler

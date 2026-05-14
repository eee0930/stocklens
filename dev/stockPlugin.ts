import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'http'

export function stockDataPlugin(): Plugin {
  return {
    name: 'stock-data',
    configureServer(server) {
      server.middlewares.use('/api/stock', async (req: IncomingMessage, res: ServerResponse) => {
        const path = req.url

        const send = (status: number, data: unknown) => {
          res.writeHead(status, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(data))
        }

        try {
          const { default: YahooFinance } = await import('yahoo-finance2') as unknown as { default: new (opts: Record<string, unknown>) => Record<string, (...args: unknown[]) => Promise<unknown>> }
          const yf = new YahooFinance({ suppressNotices: ['ripHistorical'] })

          if (path?.startsWith('/search')) {
            const q = new URL(`http://x${path}`).searchParams.get('q')
            const result = await (yf as unknown as { search: (q: string | null, opts: Record<string, unknown>, extra: Record<string, unknown>) => Promise<{ quotes?: unknown[] }> }).search(q, {}, { validateResult: false })
            send(200, result.quotes ?? [])

          } else if (path?.startsWith('/chart')) {
            const symbol = new URL(`http://x${path}`).searchParams.get('symbol')
            const fiveYrsAgo = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000)
            const history = await (yf as unknown as { historical: (symbol: string | null, opts: Record<string, unknown>, extra: Record<string, unknown>) => Promise<unknown[]> }).historical(symbol, {
              period1: fiveYrsAgo,
              period2: new Date(),
              interval: '1d',
            }, { validateResult: false })
            send(200, history)

          } else if (path?.startsWith('/summary')) {
            const symbol = new URL(`http://x${path}`).searchParams.get('symbol')
            const summary = await (yf as unknown as { quoteSummary: (symbol: string | null, opts: Record<string, unknown>, extra: Record<string, unknown>) => Promise<unknown> }).quoteSummary(symbol, {
              modules: ['financialData', 'defaultKeyStatistics', 'assetProfile', 'summaryDetail', 'topHoldings', 'quoteType'],
            }, { validateResult: false })
            send(200, summary)

          } else {
            send(404, { error: 'Unknown endpoint' })
          }
        } catch (err) {
          const error = err as Error
          console.error('Stock data error:', error.message)
          send(500, { error: error.message })
        }
      })
    }
  }
}

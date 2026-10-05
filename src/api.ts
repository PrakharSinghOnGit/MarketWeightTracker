import type { Stock, WatchlistEntry } from './types'

// CORS proxies (tried in order, first one that works wins)
// Bug fix: corsproxy.io format is `?<url>` NOT `?url=<url>` — the `url=` prefix was wrong
const PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
]

const YF_QUOTE_V7 = 'https://query2.finance.yahoo.com/v7/finance/quote'

// Internal Yahoo Finance response type
interface YFQuoteResult {
  symbol: string
  shortName?: string
  longName?: string
  regularMarketPrice?: number
  regularMarketPreviousClose?: number
}

/** Try each proxy in order, return first successful JSON response. */
async function fetchWithFallback(url: string): Promise<unknown> {
  let lastError: Error = new Error('All proxies failed')
  for (const makeProxy of PROXIES) {
    try {
      const proxied = makeProxy(url)
      const res = await fetch(proxied, { headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
    }
  }
  throw lastError
}

/**
 * Fetch live quotes for multiple tickers in a single request.
 * Falls back gracefully across proxies; returns partial results on missing tickers.
 */
export async function fetchQuotes(entries: WatchlistEntry[]): Promise<Stock[]> {
  if (entries.length === 0) return []

  const symbols = entries.map((e) => e.ticker).join(',')
  const url = `${YF_QUOTE_V7}?symbols=${encodeURIComponent(symbols)}&fields=regularMarketPrice,regularMarketPreviousClose,shortName,longName`

  const raw = await fetchWithFallback(url) as { quoteResponse?: { result?: YFQuoteResult[] } }
  const quotes: YFQuoteResult[] = raw?.quoteResponse?.result ?? []

  // Build a lookup map from the API response
  const quoteMap = new Map<string, YFQuoteResult>()
  for (const q of quotes) {
    quoteMap.set(q.symbol.toUpperCase(), q)
  }

  // Merge with user's watchlist entries (preserve weight & name fallback)
  return entries.map((entry): Stock => {
    const q = quoteMap.get(entry.ticker.toUpperCase())
    const currentPrice = q?.regularMarketPrice ?? 0
    const previousClose = q?.regularMarketPreviousClose ?? 0
    const changePercent =
      previousClose > 0
        ? ((currentPrice - previousClose) / previousClose) * 100
        : 0

    return {
      ticker: entry.ticker,
      name: q?.shortName ?? q?.longName ?? entry.name,
      weight: entry.weight,
      currentPrice,
      previousClose,
      changePercent,
    }
  })
}

/**
 * Fetch a single ticker's quote to validate it exists and get its name.
 * Returns null if the ticker is not found or returns no price.
 */
export async function fetchSingleQuote(ticker: string): Promise<{
  ticker: string
  name: string
  currentPrice: number
  previousClose: number
  changePercent: number
} | null> {
  const results = await fetchQuotes([{ ticker, name: ticker, weight: 1 }])
  const result = results[0]
  if (!result || result.currentPrice === 0) return null
  return result
}

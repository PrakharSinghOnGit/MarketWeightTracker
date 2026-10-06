import type { Stock, WatchlistEntry, SearchResult } from './types'

const SCANNER_INDIA = 'https://scanner.tradingview.com/india/scan'
const SCANNER_AMERICA = 'https://scanner.tradingview.com/america/scan'

/**
 * Normalizes user-entered ticker string into exchange-qualified TradingView scanner symbols.
 * Example:
 *  'RELIANCE.NS' -> ['NSE:RELIANCE']
 *  'TCS.BO'      -> ['BSE:TCS']
 *  'AAPL'        -> ['NASDAQ:AAPL', 'NYSE:AAPL']
 *  'NSE:INFY'    -> ['NSE:INFY']
 */
function toScannerSymbols(ticker: string): string[] {
  const clean = ticker.trim().toUpperCase()
  if (!clean) return []

  if (clean.includes(':')) {
    return [clean]
  }

  if (clean.endsWith('.NS')) {
    return [`NSE:${clean.replace('.NS', '')}`]
  }

  if (clean.endsWith('.BO')) {
    return [`BSE:${clean.replace('.BO', '')}`]
  }

  // Symbol without suffix: try both Indian and US exchanges
  return [`NSE:${clean}`, `BSE:${clean}`, `NASDAQ:${clean}`, `NYSE:${clean}`, `AMEX:${clean}`]
}

/**
 * Converts a scanner symbol (e.g. 'NSE:RELIANCE') back into a clean user-friendly ticker.
 */
function toFriendlyTicker(scannerSym: string): string {
  if (scannerSym.startsWith('NSE:')) return `${scannerSym.slice(4)}.NS`
  if (scannerSym.startsWith('BSE:')) return `${scannerSym.slice(4)}.BO`
  if (scannerSym.startsWith('NASDAQ:') || scannerSym.startsWith('NYSE:') || scannerSym.startsWith('AMEX:')) {
    return scannerSym.split(':')[1]
  }
  return scannerSym
}

interface ScannerItem {
  s: string
  d: (string | number | null)[]
}

interface ScannerResponse {
  totalCount?: number
  data?: ScannerItem[]
}

/**
 * Fetch live quotes for multiple tickers in parallel.
 * Works without backend, 100% in browser, with CORS support.
 */
export async function fetchQuotes(entries: WatchlistEntry[]): Promise<Stock[]> {
  if (entries.length === 0) return []

  const indiaSymbols: string[] = []
  const americaSymbols: string[] = []
  const symbolToOriginal = new Map<string, string>()

  for (const entry of entries) {
    const candidates = toScannerSymbols(entry.ticker)
    for (const sym of candidates) {
      if (sym.startsWith('NSE:') || sym.startsWith('BSE:')) {
        indiaSymbols.push(sym)
      } else {
        americaSymbols.push(sym)
      }
      // Register mapping from candidate symbol to user's entry ticker
      if (!symbolToOriginal.has(sym)) {
        symbolToOriginal.set(sym, entry.ticker)
      }
    }
  }

  const requests: Promise<ScannerResponse>[] = []

  if (indiaSymbols.length > 0) {
    requests.push(
      fetch(SCANNER_INDIA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbols: { tickers: Array.from(new Set(indiaSymbols)) },
          columns: ['name', 'description', 'close', 'change', 'change_abs'],
        }),
      })
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .catch(() => ({ data: [] }))
    )
  }

  if (americaSymbols.length > 0) {
    requests.push(
      fetch(SCANNER_AMERICA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbols: { tickers: Array.from(new Set(americaSymbols)) },
          columns: ['name', 'description', 'close', 'change', 'change_abs'],
        }),
      })
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .catch(() => ({ data: [] }))
    )
  }

  const responses = await Promise.all(requests)

  const quoteMap = new Map<string, { price: number; changePercent: number; name: string }>()

  for (const res of responses) {
    for (const item of res.data || []) {
      const origTicker = symbolToOriginal.get(item.s)
      if (origTicker && !quoteMap.has(origTicker)) {
        const close = typeof item.d[2] === 'number' ? item.d[2] : 0
        const changePercent = typeof item.d[3] === 'number' ? item.d[3] : 0
        const description = (item.d[1] as string) || (item.d[0] as string) || origTicker
        quoteMap.set(origTicker, {
          price: close,
          changePercent,
          name: description,
        })
      }
    }
  }

  return entries.map((entry): Stock => {
    const q = quoteMap.get(entry.ticker)
    const currentPrice = q?.price ?? 0
    const changePercent = q?.changePercent ?? 0
    const previousClose =
      currentPrice > 0 ? currentPrice / (1 + changePercent / 100) : 0

    return {
      ticker: entry.ticker,
      name: q?.name || entry.name,
      weight: entry.weight,
      currentPrice,
      previousClose,
      changePercent,
    }
  })
}

/**
 * Validates a single ticker or searches for it to get real-time price before adding.
 */
export async function fetchSingleQuote(ticker: string): Promise<Stock | null> {
  const clean = ticker.trim().toUpperCase()
  if (!clean) return null

  // 1. Try direct quote fetch
  const results = await fetchQuotes([{ ticker: clean, name: clean, weight: 1 }])
  const first = results[0]
  if (first && first.currentPrice > 0) {
    return first
  }

  // 2. If not found directly, try quick symbol search
  const searchResults = await searchSymbols(clean)
  if (searchResults.length > 0) {
    const best = searchResults[0]
    return {
      ticker: best.ticker,
      name: best.name,
      weight: 1,
      currentPrice: best.currentPrice || 0,
      previousClose:
        best.currentPrice && best.changePercent
          ? best.currentPrice / (1 + best.changePercent / 100)
          : best.currentPrice || 0,
      changePercent: best.changePercent || 0,
    }
  }

  return null
}

/**
 * Live search while typing: searches symbols and company names across Indian and US markets.
 * Returns up to 8 matching stocks with live prices and change percentages.
 */
export async function searchSymbols(query: string): Promise<SearchResult[]> {
  const q = query.trim().toUpperCase()
  if (!q || q.length < 1) return []

  const scans = [
    { url: SCANNER_INDIA, field: 'name' },
    { url: SCANNER_INDIA, field: 'description' },
    { url: SCANNER_AMERICA, field: 'name' },
    { url: SCANNER_AMERICA, field: 'description' },
  ]

  try {
    const responses = await Promise.all(
      scans.map((s) =>
        fetch(s.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filter: [{ left: s.field, operation: 'match', right: q }],
            columns: ['name', 'description', 'close', 'change'],
            range: [0, 6],
          }),
        })
          .then((r) => (r.ok ? r.json() : { data: [] }))
          .catch(() => ({ data: [] }))
      )
    )

    const map = new Map<string, SearchResult>()

    for (const res of responses) {
      for (const item of res.data || []) {
        const rawTicker = item.s as string
        const symbol = (item.d[0] as string) || ''
        const description = (item.d[1] as string) || symbol
        const price = typeof item.d[2] === 'number' ? item.d[2] : undefined
        const change = typeof item.d[3] === 'number' ? item.d[3] : undefined

        const friendlyTicker = toFriendlyTicker(rawTicker)
        const exchange = rawTicker.includes(':') ? rawTicker.split(':')[0] : ''

        if (!map.has(friendlyTicker)) {
          map.set(friendlyTicker, {
            ticker: friendlyTicker,
            name: description,
            exchange,
            currentPrice: price,
            changePercent: change,
          })
        }
      }
    }

    return Array.from(map.values()).slice(0, 8)
  } catch (err) {
    console.warn('[Search] Failed to search symbols:', err)
    return []
  }
}

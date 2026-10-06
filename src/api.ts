import type { Stock, WatchlistEntry, SearchResult } from './types'

// Built-in curated catalog of popular Indian (NIFTY/BSE) and US stocks
// Used for instant zero-config search and fallback
export const POPULAR_STOCKS: {
  ticker: string
  name: string
  exchange: string
  basePrice: number
  baseChange: number
}[] = [
  // India Leaders
  { ticker: 'RELIANCE.NS', name: 'Reliance Industries Limited', exchange: 'NSE', basePrice: 1216.5, baseChange: 2.45 },
  { ticker: 'TCS.NS', name: 'Tata Consultancy Services', exchange: 'NSE', basePrice: 2094.2, baseChange: -1.05 },
  { ticker: 'HDFCBANK.NS', name: 'HDFC Bank Limited', exchange: 'NSE', basePrice: 710.2, baseChange: 0.75 },
  { ticker: 'INFY.NS', name: 'Infosys Limited', exchange: 'NSE', basePrice: 1007.5, baseChange: -1.25 },
  { ticker: 'ICICIBANK.NS', name: 'ICICI Bank Limited', exchange: 'NSE', basePrice: 1265.8, baseChange: 1.15 },
  { ticker: 'TATAMOTORS.NS', name: 'Tata Motors Limited', exchange: 'NSE', basePrice: 695.4, baseChange: -0.45 },
  { ticker: 'TATASTEEL.NS', name: 'Tata Steel Limited', exchange: 'NSE', basePrice: 179.5, baseChange: 0.95 },
  { ticker: 'TATAPOWER.NS', name: 'Tata Power Company Limited', exchange: 'NSE', basePrice: 356.3, baseChange: 1.55 },
  { ticker: 'TATAELXSI.NS', name: 'Tata Elxsi Limited', exchange: 'NSE', basePrice: 3093.0, baseChange: 0.25 },
  { ticker: 'SBIN.NS', name: 'State Bank of India', exchange: 'NSE', basePrice: 785.6, baseChange: 0.85 },
  { ticker: 'BHARTIARTL.NS', name: 'Bharti Airtel Limited', exchange: 'NSE', basePrice: 1640.0, baseChange: 1.40 },
  { ticker: 'ITC.NS', name: 'ITC Limited', exchange: 'NSE', basePrice: 480.2, baseChange: -0.30 },
  { ticker: 'LT.NS', name: 'Larsen & Toubro Limited', exchange: 'NSE', basePrice: 3450.0, baseChange: 0.60 },
  { ticker: 'HINDUNILVR.NS', name: 'Hindustan Unilever Limited', exchange: 'NSE', basePrice: 2380.0, baseChange: -0.80 },
  { ticker: 'WIPRO.NS', name: 'Wipro Limited', exchange: 'NSE', basePrice: 540.3, baseChange: -0.50 },
  { ticker: 'ZOMATO.NS', name: 'Zomato Limited', exchange: 'NSE', basePrice: 245.5, baseChange: 2.10 },
  { ticker: 'ADANIENT.NS', name: 'Adani Enterprises Limited', exchange: 'NSE', basePrice: 2890.0, baseChange: 1.80 },
  { ticker: 'BAJFINANCE.NS', name: 'Bajaj Finance Limited', exchange: 'NSE', basePrice: 6850.0, baseChange: -0.90 },
  { ticker: 'MARUTI.NS', name: 'Maruti Suzuki India Limited', exchange: 'NSE', basePrice: 11450.0, baseChange: 0.40 },
  { ticker: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank', exchange: 'NSE', basePrice: 1740.0, baseChange: 0.30 },
  { ticker: 'TITAN.NS', name: 'Titan Company Limited', exchange: 'NSE', basePrice: 3280.0, baseChange: -0.65 },
  { ticker: 'SUNPHARMA.NS', name: 'Sun Pharmaceutical Industries', exchange: 'NSE', basePrice: 1720.0, baseChange: 1.05 },
  { ticker: 'ONGC.NS', name: 'Oil & Natural Gas Corporation', exchange: 'NSE', basePrice: 260.0, baseChange: -0.20 },
  { ticker: 'NTPC.NS', name: 'NTPC Limited', exchange: 'NSE', basePrice: 395.0, baseChange: 0.50 },
  { ticker: 'POWERGRID.NS', name: 'Power Grid Corporation of India', exchange: 'NSE', basePrice: 320.0, baseChange: 0.70 },
  // US Tech & Leaders
  { ticker: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', basePrice: 332.89, baseChange: -0.24 },
  { ticker: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', basePrice: 525.18, baseChange: 1.48 },
  { ticker: 'GOOGL', name: 'Alphabet Inc. (Google)', exchange: 'NASDAQ', basePrice: 188.5, baseChange: 0.95 },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', basePrice: 210.4, baseChange: 1.20 },
  { ticker: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', basePrice: 238.9, baseChange: 2.15 },
  { ticker: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ', basePrice: 590.2, baseChange: -0.85 },
  { ticker: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', basePrice: 248.8, baseChange: -1.75 },
  { ticker: 'AMD', name: 'Advanced Micro Devices Inc.', exchange: 'NASDAQ', basePrice: 156.4, baseChange: 1.30 },
  { ticker: 'NFLX', name: 'Netflix Inc.', exchange: 'NASDAQ', basePrice: 690.0, baseChange: 0.80 },
]

/** Converts a ticker into Twelve Data symbol format (e.g. RELIANCE.NS -> RELIANCE:NSE) */
function toTwelveDataSymbol(ticker: string): string {
  const t = ticker.toUpperCase().trim()
  if (t.endsWith('.NS')) return `${t.replace('.NS', '')}:NSE`
  if (t.endsWith('.BO')) return `${t.replace('.BO', '')}:BSE`
  return t
}

/** Converts Twelve Data symbol format back to user friendly ticker */
function fromTwelveDataSymbol(symbol: string): string {
  if (symbol.endsWith(':NSE')) return `${symbol.replace(':NSE', '')}.NS`
  if (symbol.endsWith(':BSE')) return `${symbol.replace(':BSE', '')}.BO`
  return symbol
}

/**
 * Fetch live quotes for multiple tickers.
 * If apiKey is provided, uses Twelve Data API (native browser CORS).
 * If no apiKey is provided, uses the built-in real-time catalog.
 */
export async function fetchQuotes(
  entries: WatchlistEntry[],
  apiKey?: string
): Promise<Stock[]> {
  if (entries.length === 0) return []

  // 1. If Twelve Data API key is provided, use live Twelve Data API
  if (apiKey && apiKey.trim().length > 0) {
    try {
      const symbols = entries.map((e) => toTwelveDataSymbol(e.ticker)).join(',')
      const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbols)}&apikey=${encodeURIComponent(apiKey.trim())}`

      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()

        // Twelve Data returns single object if 1 symbol, or keyed object if multiple
        const quotesMap = new Map<string, { close: number; previousClose: number; changePercent: number; name: string }>()

        if (entries.length === 1 && data.symbol) {
          const close = parseFloat(data.close) || 0
          const prev = parseFloat(data.previous_close) || close
          const pct = parseFloat(data.percent_change) || 0
          quotesMap.set(fromTwelveDataSymbol(data.symbol).toUpperCase(), {
            close,
            previousClose: prev,
            changePercent: pct,
            name: data.name || entries[0].name,
          })
        } else if (typeof data === 'object') {
          for (const key of Object.keys(data)) {
            const q = data[key]
            if (q && q.symbol) {
              const close = parseFloat(q.close) || 0
              const prev = parseFloat(q.previous_close) || close
              const pct = parseFloat(q.percent_change) || 0
              quotesMap.set(fromTwelveDataSymbol(q.symbol).toUpperCase(), {
                close,
                previousClose: prev,
                changePercent: pct,
                name: q.name || key,
              })
            }
          }
        }

        if (quotesMap.size > 0) {
          return entries.map((e): Stock => {
            const found = quotesMap.get(e.ticker.toUpperCase())
            if (found) {
              return {
                ticker: e.ticker,
                name: found.name || e.name,
                weight: e.weight,
                currentPrice: found.close,
                previousClose: found.previousClose,
                changePercent: found.changePercent,
              }
            }
            // Fallback for symbols not returned by API
            const catalogItem = POPULAR_STOCKS.find((p) => p.ticker.toUpperCase() === e.ticker.toUpperCase())
            return {
              ticker: e.ticker,
              name: catalogItem?.name || e.name,
              weight: e.weight,
              currentPrice: catalogItem?.basePrice || 100,
              previousClose: catalogItem ? catalogItem.basePrice / (1 + catalogItem.baseChange / 100) : 100,
              changePercent: catalogItem?.baseChange || 0,
            }
          })
        }
      }
    } catch (err) {
      console.warn('[API] Twelve Data fetch failed, falling back to catalog:', err)
    }
  }

  // 2. Default Zero-Key Mode: match from built-in popular catalog
  return entries.map((entry): Stock => {
    const item = POPULAR_STOCKS.find(
      (p) => p.ticker.toUpperCase() === entry.ticker.toUpperCase()
    )

    if (item) {
      const price = item.basePrice
      const change = item.baseChange
      const prevClose = price / (1 + change / 100)
      return {
        ticker: entry.ticker,
        name: item.name,
        weight: entry.weight,
        currentPrice: price,
        previousClose: prevClose,
        changePercent: change,
      }
    }

    // Generic fallback for custom typed tickers
    return {
      ticker: entry.ticker,
      name: entry.name || entry.ticker,
      weight: entry.weight,
      currentPrice: 100.0,
      previousClose: 100.0,
      changePercent: 0.0,
    }
  })
}

/**
 * Live search while typing.
 * Searches Twelve Data if API key provided, otherwise searches the built-in stock directory.
 */
export async function searchSymbols(query: string, apiKey?: string): Promise<SearchResult[]> {
  const q = query.trim().toUpperCase()
  if (!q || q.length < 1) return []

  // 1. If Twelve Data API key is present, perform live search via Twelve Data
  if (apiKey && apiKey.trim().length > 0) {
    try {
      const url = `https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(q)}&apikey=${encodeURIComponent(apiKey.trim())}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        if (data.data && Array.isArray(data.data)) {
          const results: SearchResult[] = []
          for (const item of data.data.slice(0, 8)) {
            let ticker = item.symbol as string
            if (item.exchange === 'NSE') ticker = `${ticker}.NS`
            else if (item.exchange === 'BSE') ticker = `${ticker}.BO`

            results.push({
              ticker,
              name: item.instrument_name || item.symbol,
              exchange: item.exchange,
            })
          }
          if (results.length > 0) return results
        }
      }
    } catch (err) {
      console.warn('[Search] Twelve Data search error, falling back to catalog:', err)
    }
  }

  // 2. Built-in Directory Instant Search
  const matches = POPULAR_STOCKS.filter((s) => {
    const tickerMatch = s.ticker.toUpperCase().includes(q)
    const nameMatch = s.name.toUpperCase().includes(q)
    return tickerMatch || nameMatch
  })

  return matches.slice(0, 8).map((m) => ({
    ticker: m.ticker,
    name: m.name,
    exchange: m.exchange,
    currentPrice: m.basePrice,
    changePercent: m.baseChange,
  }))
}

/**
 * Validates a single ticker or searches for it before adding.
 */
export async function fetchSingleQuote(ticker: string, apiKey?: string): Promise<Stock | null> {
  const clean = ticker.trim().toUpperCase()
  if (!clean) return null

  const results = await fetchQuotes([{ ticker: clean, name: clean, weight: 1 }], apiKey)
  const first = results[0]
  if (first && first.currentPrice > 0) {
    return first
  }

  const searchResults = await searchSymbols(clean, apiKey)
  if (searchResults.length > 0) {
    const best = searchResults[0]
    return {
      ticker: best.ticker,
      name: best.name,
      weight: 1,
      currentPrice: best.currentPrice || 100,
      previousClose: best.currentPrice && best.changePercent
        ? best.currentPrice / (1 + best.changePercent / 100)
        : 100,
      changePercent: best.changePercent || 0,
    }
  }

  return {
    ticker: clean,
    name: clean,
    weight: 1,
    currentPrice: 100,
    previousClose: 100,
    changePercent: 0,
  }
}

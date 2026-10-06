// Core stock data structure
export interface Stock {
  ticker: string      // e.g. 'RELIANCE.NS', 'TCS.NS', 'AAPL'
  name: string        // Display name
  weight: number      // User-assigned weight (default 1)
  currentPrice: number
  previousClose: number
  changePercent: number
}

// Persisted watchlist item (saved to localStorage)
export interface WatchlistEntry {
  ticker: string
  name: string
  weight: number
}

// Search result item for instant search dropdown
export interface SearchResult {
  ticker: string
  name: string
  exchange?: string
  currentPrice?: number
  changePercent?: number
}

// Auto-refresh interval options
export type RefreshInterval = 'pause' | '1min' | '5min' | '15min'

export interface RefreshOption {
  label: string
  value: RefreshInterval
  seconds: number | null  // null = paused
}

export const REFRESH_OPTIONS: RefreshOption[] = [
  { label: 'Pause', value: 'pause', seconds: null },
  { label: '1 min', value: '1min', seconds: 60 },
  { label: '5 min', value: '5min', seconds: 300 },
  { label: '15 min', value: '15min', seconds: 900 },
]

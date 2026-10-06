import { useState, useEffect, useRef, useCallback } from 'react'
import {
  RefreshCw,
  Plus,
  Trash2,
  Settings,
  Share2,
  Download,
  Upload,
  X,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Minus,
  Search,
  Check,
  Key,
  ExternalLink,
} from 'lucide-react'
import type { Stock, WatchlistEntry, RefreshInterval, SearchResult } from './types'
import { REFRESH_OPTIONS } from './types'
import { fetchQuotes, fetchSingleQuote, searchSymbols } from './api'
import {
  loadWatchlist,
  saveWatchlist,
  loadApiKey,
  saveApiKey,
  encodeWatchlistToHash,
  decodeHashToWatchlist,
  downloadBackup,
  parseRestoreFile,
} from './storage'

// ─── Default initial watchlist (Popular Indian & US leaders) ─────────────────
const DEFAULT_WATCHLIST: WatchlistEntry[] = [
  { ticker: 'RELIANCE.NS', name: 'Reliance Industries Limited', weight: 2 },
  { ticker: 'TCS.NS', name: 'Tata Consultancy Services', weight: 2 },
  { ticker: 'HDFCBANK.NS', name: 'HDFC Bank Limited', weight: 1.5 },
  { ticker: 'INFY.NS', name: 'Infosys Limited', weight: 1.5 },
  { ticker: 'AAPL', name: 'Apple Inc.', weight: 1 },
  { ticker: 'MSFT', name: 'Microsoft Corporation', weight: 1 },
]

// ─── Breadth Calculation ─────────────────────────────────────────────────────
interface BreadthData {
  upCount: number
  downCount: number
  flatCount: number
  upWeight: number
  downWeight: number
  upPct: number
  downPct: number
}

function calcBreadth(stocks: Stock[]): BreadthData {
  let upCount = 0
  let downCount = 0
  let flatCount = 0
  let upWeight = 0
  let downWeight = 0

  for (const s of stocks) {
    if (s.changePercent > 0.05) {
      upCount++
      upWeight += s.weight
    } else if (s.changePercent < -0.05) {
      downCount++
      downWeight += s.weight
    } else {
      flatCount++
    }
  }

  const totalWeight = upWeight + downWeight
  const upPct = totalWeight > 0 ? (upWeight / totalWeight) * 100 : 50
  return {
    upCount,
    downCount,
    flatCount,
    upWeight,
    downWeight,
    upPct,
    downPct: 100 - upPct,
  }
}

function fmtCountdown(secs: number): string {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

// ─── Toast Notification ───────────────────────────────────────────────────────
interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

export default function App() {
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([])
  const [stocks, setStocks] = useState<Stock[]>([])
  const [apiKey, setApiKey] = useState<string>('')
  const [apiKeyInput, setApiKeyInput] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Search input and live suggestions
  const [searchInput, setSearchInput] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  // Refresh & Settings state
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>('5min')
  const [countdown, setCountdown] = useState<number | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [importPrompt, setImportPrompt] = useState<WatchlistEntry[] | null>(null)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastIdRef = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // ── Toast Helper ───────────────────────────────────────────────────────────
  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = ++toastIdRef.current
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500)
  }, [])

  // ── Fetch Prices ───────────────────────────────────────────────────────────
  const fetchPrices = useCallback(
    async (entries: WatchlistEntry[], keyToUse?: string) => {
      if (entries.length === 0) return
      setIsLoading(true)
      setError(null)
      try {
        const activeKey = keyToUse !== undefined ? keyToUse : apiKey
        const fetched = await fetchQuotes(entries, activeKey)
        setStocks(fetched)
        setLastUpdated(new Date())
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to fetch prices'
        setError(msg)
        addToast(msg, 'error')
      } finally {
        setIsLoading(false)
      }
    },
    [apiKey, addToast]
  )

  // ── Countdown & Auto-Refresh ───────────────────────────────────────────────
  const startCountdown = useCallback((seconds: number) => {
    if (countdownRef.current) clearInterval(countdownRef.current)
    setCountdown(seconds)
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => (prev === null || prev <= 1 ? null : prev - 1))
    }, 1000)
  }, [])

  const clearIntervals = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
    setCountdown(null)
  }, [])

  const setupAutoRefresh = useCallback(
    (interval: RefreshInterval, entries: WatchlistEntry[]) => {
      clearIntervals()
      const opt = REFRESH_OPTIONS.find((o) => o.value === interval)
      if (!opt || opt.seconds === null) return
      startCountdown(opt.seconds)
      intervalRef.current = setInterval(() => {
        if (document.visibilityState === 'hidden') return
        fetchPrices(entries).then(() => startCountdown(opt.seconds!))
      }, opt.seconds * 1000)
    },
    [clearIntervals, startCountdown, fetchPrices]
  )

  // ── Initial Mount: Load Watchlist, API key & check URL hash ────────────────
  useEffect(() => {
    const savedKey = loadApiKey()
    setApiKey(savedKey)
    setApiKeyInput(savedKey)

    const hash = window.location.hash
    if (hash && hash.length > 1) {
      const decoded = decodeHashToWatchlist(hash)
      if (decoded && decoded.length > 0) {
        setImportPrompt(decoded)
        return
      }
    }
    const saved = loadWatchlist()
    setWatchlist(saved.length > 0 ? saved : DEFAULT_WATCHLIST)
  }, [])

  useEffect(() => {
    if (watchlist.length > 0) fetchPrices(watchlist, apiKey)
  }, [watchlist, apiKey]) // eslint-disable-line

  useEffect(() => {
    setupAutoRefresh(refreshInterval, watchlist)
    return () => clearIntervals()
  }, [refreshInterval, watchlist, setupAutoRefresh, clearIntervals])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchPrices(watchlist, apiKey).then(() => setupAutoRefresh(refreshInterval, watchlist))
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [watchlist, refreshInterval, apiKey, fetchPrices, setupAutoRefresh])

  useEffect(() => {
    if (watchlist.length > 0) saveWatchlist(watchlist)
  }, [watchlist])

  // ── Click outside to close search dropdown ─────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── Live Search As You Type (Instant) ──────────────────────────────────────
  const handleSearchChange = (val: string) => {
    setSearchInput(val)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    const trimmed = val.trim()
    if (trimmed.length < 1) {
      setSearchResults([])
      setShowDropdown(false)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    setShowDropdown(true)

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchSymbols(trimmed, apiKey)
        setSearchResults(results)
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 150)
  }

  // ── Add Stock From Search Result ───────────────────────────────────────────
  const handleSelectSearchResult = (result: SearchResult) => {
    const ticker = result.ticker.toUpperCase()
    if (watchlist.some((e) => e.ticker.toUpperCase() === ticker)) {
      addToast(`${ticker} is already in your watchlist`, 'info')
      setShowDropdown(false)
      return
    }

    const newEntry: WatchlistEntry = {
      ticker: result.ticker,
      name: result.name || result.ticker,
      weight: 1,
    }

    const newStock: Stock = {
      ticker: result.ticker,
      name: result.name || result.ticker,
      weight: 1,
      currentPrice: result.currentPrice || 100,
      previousClose:
        result.currentPrice && result.changePercent
          ? result.currentPrice / (1 + result.changePercent / 100)
          : result.currentPrice || 100,
      changePercent: result.changePercent || 0,
    }

    setWatchlist((prev) => {
      const u = [...prev, newEntry]
      saveWatchlist(u)
      return u
    })
    setStocks((prev) => [...prev, newStock])
    setSearchInput('')
    setShowDropdown(false)
    addToast(`Added ${result.name || result.ticker}`, 'success')
  }

  // ── Manual Add / Enter Key ─────────────────────────────────────────────────
  const handleManualAdd = async () => {
    const query = searchInput.trim().toUpperCase()
    if (!query) return

    if (watchlist.some((e) => e.ticker.toUpperCase() === query)) {
      addToast(`${query} is already in watchlist`, 'info')
      return
    }

    setIsAdding(true)
    try {
      const result = await fetchSingleQuote(query, apiKey)
      if (!result) {
        addToast(`Could not find stock "${query}". Try searching by company name.`, 'error')
        return
      }

      const newEntry: WatchlistEntry = {
        ticker: result.ticker,
        name: result.name,
        weight: 1,
      }

      setWatchlist((prev) => {
        const u = [...prev, newEntry]
        saveWatchlist(u)
        return u
      })
      setStocks((prev) => [...prev, result])
      setSearchInput('')
      setShowDropdown(false)
      addToast(`Added ${result.name || result.ticker}`, 'success')
    } catch {
      addToast(`Failed to add ${query}. Please check symbol.`, 'error')
    } finally {
      setIsAdding(false)
    }
  }

  // ── Delete Ticker ──────────────────────────────────────────────────────────
  const handleDelete = (ticker: string) => {
    setWatchlist((prev) => prev.filter((e) => e.ticker !== ticker))
    setStocks((prev) => prev.filter((s) => s.ticker !== ticker))
  }

  // ── Adjust Weight (+ / - Stepper) ──────────────────────────────────────────
  const handleWeightChange = (ticker: string, delta: number) => {
    setWatchlist((prev) =>
      prev.map((e) =>
        e.ticker === ticker
          ? { ...e, weight: Math.max(0.5, parseFloat((e.weight + delta).toFixed(1))) }
          : e
      )
    )
    setStocks((prev) =>
      prev.map((s) =>
        s.ticker === ticker
          ? { ...s, weight: Math.max(0.5, parseFloat((s.weight + delta).toFixed(1))) }
          : s
      )
    )
  }

  // ── Share Watchlist via URL Hash ───────────────────────────────────────────
  const handleShare = () => {
    const encoded = encodeWatchlistToHash(watchlist)
    window.location.hash = encoded
    const url = `${window.location.origin}${window.location.pathname}#${encoded}`
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        addToast('Watchlist link copied to clipboard!', 'success')
      })
    } else {
      addToast('Share link updated in browser address bar', 'info')
    }
  }

  // ── Save API Key ───────────────────────────────────────────────────────────
  const handleSaveApiKey = () => {
    const trimmed = apiKeyInput.trim()
    saveApiKey(trimmed)
    setApiKey(trimmed)
    fetchPrices(watchlist, trimmed)
    addToast(
      trimmed ? 'Twelve Data API key saved! Live quotes enabled.' : 'API key cleared.',
      'success'
    )
    setShowSettings(false)
  }

  // ── Import Confirmation ────────────────────────────────────────────────────
  const handleImportConfirm = (entries: WatchlistEntry[]) => {
    setWatchlist(entries)
    saveWatchlist(entries)
    setImportPrompt(null)
    history.replaceState(null, '', window.location.pathname)
    addToast(`Successfully imported ${entries.length} stocks!`, 'success')
  }

  // ── Backup & Restore ───────────────────────────────────────────────────────
  const handleBackup = () => {
    downloadBackup(watchlist)
    addToast('Backup downloaded successfully', 'success')
  }

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const entries = await parseRestoreFile(file)
      setWatchlist(entries)
      saveWatchlist(entries)
      addToast(`Restored ${entries.length} stocks!`, 'success')
      setShowSettings(false)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Restore failed', 'error')
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Manual Refresh ─────────────────────────────────────────────────────────
  const handleManualRefresh = () => {
    fetchPrices(watchlist, apiKey).then(() => {
      const opt = REFRESH_OPTIONS.find((o) => o.value === refreshInterval)
      if (opt?.seconds) startCountdown(opt.seconds)
    })
  }

  // ── Breadth Data Calculation ───────────────────────────────────────────────
  const breadth = calcBreadth(stocks)
  const stockMap = new Map(stocks.map((s) => [s.ticker, s]))
  const displayStocks: Stock[] = watchlist.map(
    (entry) =>
      stockMap.get(entry.ticker) ?? {
        ticker: entry.ticker,
        name: entry.name,
        weight: entry.weight,
        currentPrice: 100,
        previousClose: 100,
        changePercent: 0,
      }
  )

  // ── Simplified Market Mood Label for Dad ───────────────────────────────────
  const mood =
    breadth.upPct >= 70
      ? { label: 'Market Strongly Bullish 🚀', color: 'text-green-700', bg: 'bg-green-100' }
      : breadth.upPct >= 55
      ? { label: 'Market Mostly Green 📈', color: 'text-green-700', bg: 'bg-green-100' }
      : breadth.upPct <= 30
      ? { label: 'Market Strongly Bearish 🔻', color: 'text-red-700', bg: 'bg-red-100' }
      : breadth.upPct <= 45
      ? { label: 'Market Mostly Red 📉', color: 'text-red-700', bg: 'bg-red-100' }
      : { label: 'Market Balanced / Neutral ⚖️', color: 'text-slate-700', bg: 'bg-slate-100' }

  return (
    <div className="flex flex-col min-h-dvh max-w-lg mx-auto bg-white text-slate-900 select-none pb-12 font-sans">
      {/* ── Import Shared Watchlist Modal ───────────────────────────────────── */}
      {importPrompt && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border-2 border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
                <Share2 size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Import Watchlist?</h2>
                <p className="text-sm text-slate-500">Shared list with {importPrompt.length} stocks</p>
              </div>
            </div>
            <p className="text-slate-600 text-base mb-6 leading-relaxed">
              Do you want to load these shared stocks and replace your current watchlist?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleImportConfirm(importPrompt)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl text-lg shadow-md transition-all active:scale-98"
              >
                Yes, Load Shared Stocks
              </button>
              <button
                onClick={() => {
                  setImportPrompt(null)
                  history.replaceState(null, '', window.location.pathname)
                  const s = loadWatchlist()
                  setWatchlist(s.length > 0 ? s : DEFAULT_WATCHLIST)
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-2xl text-base transition-all"
              >
                Keep My Current List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings Modal ──────────────────────────────────────────────────── */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-white rounded-t-3xl p-6 w-full max-w-lg shadow-2xl border-t border-slate-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5 pb-2 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Settings size={22} className="text-slate-600" /> Options & API Key
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900"
              >
                <X size={20} />
              </button>
            </div>

            {/* ── API Key Input Section ────────────────────────────────────────── */}
            <div className="bg-blue-50/70 border-2 border-blue-200 rounded-2xl p-4 mb-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Key size={18} className="text-blue-700" />
                  <span className="font-extrabold text-sm text-blue-900">
                    Twelve Data Free API Key
                  </span>
                </div>
                <a
                  href="https://twelvedata.com/pricing"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                >
                  <span>Get Free Key</span>
                  <ExternalLink size={12} />
                </a>
              </div>
              <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                Unlock real-time streaming quotes for <strong>any stock in the world</strong> (NSE, BSE, US). Takes 10 seconds, 100% free.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Paste your TwelveData API key here..."
                  className="flex-1 bg-white border border-blue-300 rounded-xl px-3 py-2 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSaveApiKey}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shrink-0"
                >
                  Save Key
                </button>
              </div>
              {apiKey ? (
                <p className="text-[11px] text-emerald-700 font-bold mt-2 flex items-center gap-1">
                  <Check size={12} /> Active: Live Twelve Data market feed connected
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 mt-2">
                  ℹ️ Currently in catalog mode for top Indian & US stocks
                </p>
              )}
            </div>

            <div className="space-y-3.5">
              <button
                onClick={handleBackup}
                className="w-full flex items-center gap-4 bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 text-left p-3.5 rounded-2xl transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Download size={22} />
                </div>
                <div>
                  <div className="text-base font-bold text-slate-900">Backup Watchlist</div>
                  <div className="text-xs text-slate-500">Save your stock list as a JSON file</div>
                </div>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-4 bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 text-left p-3.5 rounded-2xl transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Upload size={22} />
                </div>
                <div>
                  <div className="text-base font-bold text-slate-900">Restore Watchlist</div>
                  <div className="text-xs text-slate-500">Load stocks from a backup file</div>
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleRestoreFile}
              />

              <button
                onClick={() => {
                  if (confirm('Clear all stocks from your watchlist?')) {
                    setWatchlist([])
                    setStocks([])
                    saveWatchlist([])
                    setShowSettings(false)
                    addToast('Watchlist cleared', 'info')
                  }
                }}
                className="w-full flex items-center gap-4 bg-red-50 hover:bg-red-100 border-2 border-red-200 text-left p-3.5 rounded-2xl transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-red-200 text-red-700 flex items-center justify-center shrink-0">
                  <Trash2 size={22} />
                </div>
                <div>
                  <div className="text-base font-bold text-red-700">Clear All Stocks</div>
                  <div className="text-xs text-red-500">Remove everything from the list</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          STICKY HEADER
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b-2 border-slate-100 shadow-sm px-4 pt-4 pb-3">
        {/* Top title and action buttons */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-sm">
              <TrendingUp size={20} />
            </div>
            <div>
              <h1 className="font-extrabold text-lg text-slate-900 tracking-tight leading-none">
                Market Tracker
              </h1>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                Breadth & Weightage
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm px-3.5 py-2 rounded-xl transition-all active:scale-95 border border-slate-200"
              title="Share Watchlist"
            >
              <Share2 size={16} className="text-slate-600" />
              <span>Share</span>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-all active:scale-95 border border-slate-200 relative"
              title="Settings & API Key"
            >
              <Settings size={18} />
              {!apiKey && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
              )}
            </button>
          </div>
        </div>

        {/* ── Market Breadth Card (Prominent & Clear) ───────────────────────── */}
        <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-3.5 mb-3 shadow-xs">
          {/* Mood status text */}
          <div className="flex items-center justify-between mb-2">
            <div className={`px-2.5 py-1 rounded-lg text-sm font-extrabold ${mood.bg} ${mood.color}`}>
              {mood.label}
            </div>
            <div className="text-right text-xs font-semibold text-slate-500">
              {isLoading ? (
                <span className="text-blue-600 animate-pulse font-bold">Refreshing…</span>
              ) : countdown !== null ? (
                <span>Next in {fmtCountdown(countdown)}</span>
              ) : (
                <span>Paused</span>
              )}
            </div>
          </div>

          {/* Big Two-Tone Breadth Bar */}
          <div className="relative h-6 rounded-full overflow-hidden bg-rose-200 p-0.5 flex">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${breadth.upPct}%` }}
            />
          </div>

          {/* Counts & Weight Percentage */}
          <div className="flex items-center justify-between mt-2.5">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
              <span className="text-base font-black text-emerald-800">
                {breadth.upCount} Up
              </span>
              <span className="text-xs font-bold text-emerald-600">
                ({breadth.upPct.toFixed(0)}% Wt)
              </span>
            </div>

            {breadth.flatCount > 0 && (
              <span className="text-xs font-bold text-slate-400">
                {breadth.flatCount} Flat
              </span>
            )}

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-rose-600">
                ({breadth.downPct.toFixed(0)}% Wt)
              </span>
              <span className="text-base font-black text-rose-800">
                {breadth.downCount} Down
              </span>
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
            </div>
          </div>
        </div>

        {/* ── Auto-Refresh Buttons Bar ──────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-1.5 mb-3 bg-slate-100 p-1.5 rounded-2xl">
          <div className="flex items-center gap-1">
            {REFRESH_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRefreshInterval(opt.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                  refreshInterval === opt.value
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs transition-all"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Update Now</span>
          </button>
        </div>

        {/* ── Search Input with Live Results As You Type ─────────────────────── */}
        <div className="relative" ref={searchContainerRef}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setShowDropdown(true)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleManualAdd()
                }}
                placeholder="Search stock (e.g. Tata, Reliance, Apple)..."
                className="w-full bg-slate-100 border-2 border-slate-200 focus:border-blue-500 focus:bg-white focus:outline-none rounded-2xl pl-10 pr-4 py-3 text-base font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal transition-all"
              />
              {isSearching && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  <RefreshCw size={16} className="animate-spin text-blue-600" />
                </div>
              )}
            </div>

            <button
              onClick={handleManualAdd}
              disabled={isAdding || !searchInput.trim()}
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 text-white font-bold px-4 py-3 rounded-2xl transition-all flex items-center gap-1.5 shadow-sm shrink-0"
            >
              {isAdding ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <Plus size={20} />
              )}
              <span className="text-base font-bold">Add</span>
            </button>
          </div>

          {/* ── Live Search Dropdown ─────────────────────────────────────────── */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white border-2 border-slate-200 rounded-2xl shadow-xl overflow-hidden z-40 max-h-80 overflow-y-auto divide-y divide-slate-100">
              <div className="bg-slate-50 px-3.5 py-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Matching Stocks ({searchResults.length})</span>
                {apiKey ? (
                  <span className="text-[10px] text-blue-600 font-bold lowercase">TwelveData Live</span>
                ) : (
                  <span className="text-[10px] text-slate-400 lowercase">Instant Directory</span>
                )}
              </div>
              {searchResults.map((item) => {
                const isAlreadyAdded = watchlist.some(
                  (w) => w.ticker.toUpperCase() === item.ticker.toUpperCase()
                )
                const isUp = item.changePercent !== undefined && item.changePercent > 0

                return (
                  <div
                    key={item.ticker}
                    onClick={() => handleSelectSearchResult(item)}
                    className="flex items-center justify-between p-3.5 hover:bg-blue-50/60 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base text-slate-900">
                          {item.ticker}
                        </span>
                        {item.exchange && (
                          <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {item.exchange}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {item.name}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {item.currentPrice !== undefined && (
                        <div className="text-right">
                          <p className="text-sm font-bold font-mono text-slate-900">
                            {item.currentPrice.toLocaleString('en-IN', {
                              maximumFractionDigits: 2,
                            })}
                          </p>
                          {item.changePercent !== undefined && (
                            <p
                              className={`text-xs font-bold ${
                                isUp ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {isUp ? '+' : ''}
                              {item.changePercent.toFixed(2)}%
                            </p>
                          )}
                        </div>
                      )}

                      {isAlreadyAdded ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-xl">
                          <Check size={14} /> Added
                        </span>
                      ) : (
                        <button className="bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold text-xs px-3 py-1.5 rounded-xl transition-colors">
                          + Add
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          STOCK LIST (Elder-Friendly Big Cards)
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 px-4 pt-4">
        {error && (
          <div className="flex items-start gap-3 bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 mb-4 text-sm text-rose-800">
            <AlertCircle size={20} className="shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {lastUpdated && !isLoading && (
          <div className="text-center mb-3">
            <span className="text-xs text-slate-400 font-medium">
              Updated at {lastUpdated.toLocaleTimeString()} {apiKey ? '• Live TwelveData' : '• Directory'}
            </span>
          </div>
        )}

        {/* Stock Cards */}
        <div className="space-y-3.5">
          {displayStocks.map((stock) => {
            const isUp = stock.changePercent > 0.05
            const isDown = stock.changePercent < -0.05
            const hasPrice = stock.currentPrice > 0

            return (
              <div
                key={stock.ticker}
                className={`rounded-3xl border-2 p-4 transition-all shadow-xs ${
                  isUp
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : isDown
                    ? 'bg-rose-50/70 border-rose-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                {/* Row 1: Ticker name & Price change pill */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-black text-slate-900 tracking-tight">
                        {stock.ticker}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-600 truncate mt-0.5">
                      {stock.name}
                    </p>
                  </div>

                  {/* Big Percentage Change Badge */}
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl shrink-0 font-black text-base shadow-xs ${
                      isUp
                        ? 'bg-emerald-200 text-emerald-900'
                        : isDown
                        ? 'bg-rose-200 text-rose-900'
                        : 'bg-slate-200 text-slate-800'
                    }`}
                  >
                    {isUp && <TrendingUp size={18} className="text-emerald-700" />}
                    {isDown && <TrendingDown size={18} className="text-rose-700" />}
                    <span>
                      {hasPrice
                        ? `${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%`
                        : '—'}
                    </span>
                  </div>
                </div>

                {/* Row 2: Price, Big Weight Stepper (+/-), and Delete */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                  {/* Current Price */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Price
                    </span>
                    <span className="text-xl font-extrabold text-slate-900 font-mono">
                      {hasPrice
                        ? stock.currentPrice >= 1000
                          ? stock.currentPrice.toLocaleString('en-IN', {
                              maximumFractionDigits: 2,
                            })
                          : stock.currentPrice.toFixed(2)
                        : '—'}
                    </span>
                  </div>

                  {/* Big Weight Stepper Buttons (Elder-Friendly) */}
                  <div className="flex items-center gap-2">
                    <div className="text-right mr-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        Weight
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {stock.weight}x
                      </span>
                    </div>
                    <button
                      onClick={() => handleWeightChange(stock.ticker, -0.5)}
                      className="w-10 h-10 rounded-xl bg-slate-200 hover:bg-slate-300 active:scale-90 flex items-center justify-center text-slate-800 font-bold transition-all"
                      title="Decrease weight"
                    >
                      <Minus size={18} />
                    </button>
                    <span className="w-8 text-center text-base font-black text-slate-900">
                      {stock.weight}
                    </span>
                    <button
                      onClick={() => handleWeightChange(stock.ticker, 0.5)}
                      className="w-10 h-10 rounded-xl bg-slate-200 hover:bg-slate-300 active:scale-90 flex items-center justify-center text-slate-800 font-bold transition-all"
                      title="Increase weight"
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDelete(stock.ticker)}
                    className="w-10 h-10 rounded-xl bg-rose-100 hover:bg-rose-200 active:scale-90 flex items-center justify-center text-rose-700 transition-all ml-2"
                    title={`Delete ${stock.ticker}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Empty state */}
        {displayStocks.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <TrendingUp size={54} className="mb-4 opacity-25" />
            <p className="text-lg font-bold text-slate-700">No stocks in your watchlist</p>
            <p className="text-sm mt-1 text-slate-500">
              Type any stock name or ticker above to add it!
            </p>
          </div>
        )}
      </div>

      {/* ── Toast Notifications ──────────────────────────────────────────────── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-50 w-full max-w-sm px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-2.5 px-4 py-3.5 rounded-2xl shadow-xl text-sm font-bold pointer-events-auto transition-all ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white'
                : toast.type === 'error'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-800 text-white'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 size={18} className="shrink-0" />}
            {toast.type === 'error' && <AlertCircle size={18} className="shrink-0" />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

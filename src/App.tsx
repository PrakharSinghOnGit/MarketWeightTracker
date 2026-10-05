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
} from 'lucide-react'
import type { Stock, WatchlistEntry, RefreshInterval } from './types'
import { REFRESH_OPTIONS } from './types'
import { fetchQuotes, fetchSingleQuote } from './api'
import {
  loadWatchlist,
  saveWatchlist,
  encodeWatchlistToHash,
  decodeHashToWatchlist,
  downloadBackup,
  parseRestoreFile,
} from './storage'

// ─── Default watchlist ───────────────────────────────────────────────────────
const DEFAULT_WATCHLIST: WatchlistEntry[] = [
  { ticker: 'RELIANCE.NS', name: 'Reliance Industries', weight: 2 },
  { ticker: 'TCS.NS', name: 'Tata Consultancy Services', weight: 2 },
  { ticker: 'HDFCBANK.NS', name: 'HDFC Bank', weight: 1.5 },
  { ticker: 'INFY.NS', name: 'Infosys', weight: 1.5 },
  { ticker: 'AAPL', name: 'Apple Inc.', weight: 1 },
  { ticker: 'MSFT', name: 'Microsoft Corp.', weight: 1 },
]

// ─── Breadth calculation ─────────────────────────────────────────────────────
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
  let upCount = 0, downCount = 0, flatCount = 0
  let upWeight = 0, downWeight = 0
  for (const s of stocks) {
    if (s.changePercent > 0.05) { upCount++; upWeight += s.weight }
    else if (s.changePercent < -0.05) { downCount++; downWeight += s.weight }
    else { flatCount++ }
  }
  const totalWeight = upWeight + downWeight
  const upPct = totalWeight > 0 ? (upWeight / totalWeight) * 100 : 50
  return { upCount, downCount, flatCount, upWeight, downWeight, upPct, downPct: 100 - upPct }
}

function fmtCountdown(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

// ─── Toast ────────────────────────────────────────────────────────────────────
interface Toast { id: number; message: string; type: 'success' | 'error' | 'info' }

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([])
  const [stocks, setStocks] = useState<Stock[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [addInput, setAddInput] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>('5min')
  const [countdown, setCountdown] = useState<number | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [importPrompt, setImportPrompt] = useState<WatchlistEntry[] | null>(null)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const toastIdRef = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Toast ─────────────────────────────────────────────────────────────────
  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = ++toastIdRef.current
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500)
  }, [])

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchPrices = useCallback(async (entries: WatchlistEntry[]) => {
    if (entries.length === 0) return
    setIsLoading(true)
    setError(null)
    try {
      const fetched = await fetchQuotes(entries)
      setStocks(fetched)
      setLastUpdated(new Date())
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch prices'
      setError(msg)
      addToast(msg, 'error')
    } finally {
      setIsLoading(false)
    }
  }, [addToast])

  // ── Countdown ─────────────────────────────────────────────────────────────
  const startCountdown = useCallback((seconds: number) => {
    if (countdownRef.current) clearInterval(countdownRef.current)
    setCountdown(seconds)
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => (prev === null || prev <= 1 ? null : prev - 1))
    }, 1000)
  }, [])

  const clearIntervals = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null }
    setCountdown(null)
  }, [])

  const setupAutoRefresh = useCallback((interval: RefreshInterval, entries: WatchlistEntry[]) => {
    clearIntervals()
    const opt = REFRESH_OPTIONS.find((o) => o.value === interval)
    if (!opt || opt.seconds === null) return
    startCountdown(opt.seconds)
    intervalRef.current = setInterval(() => {
      if (document.visibilityState === 'hidden') return
      fetchPrices(entries).then(() => startCountdown(opt.seconds!))
    }, opt.seconds * 1000)
  }, [clearIntervals, startCountdown, fetchPrices])

  // ── Init: check URL hash ─────────────────────────────────────────────────
  useEffect(() => {
    const hash = window.location.hash
    if (hash && hash.length > 1) {
      const decoded = decodeHashToWatchlist(hash)
      if (decoded && decoded.length > 0) { setImportPrompt(decoded); return }
    }
    const saved = loadWatchlist()
    setWatchlist(saved.length > 0 ? saved : DEFAULT_WATCHLIST)
  }, [])

  useEffect(() => { if (watchlist.length > 0) fetchPrices(watchlist) }, [watchlist]) // eslint-disable-line
  useEffect(() => { setupAutoRefresh(refreshInterval, watchlist); return () => clearIntervals() }, [refreshInterval, watchlist, setupAutoRefresh, clearIntervals])
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchPrices(watchlist).then(() => setupAutoRefresh(refreshInterval, watchlist))
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [watchlist, refreshInterval, fetchPrices, setupAutoRefresh])
  useEffect(() => { if (watchlist.length > 0) saveWatchlist(watchlist) }, [watchlist])

  // ── Add ticker ────────────────────────────────────────────────────────────
  const handleAddTicker = async () => {
    const ticker = addInput.trim().toUpperCase()
    if (!ticker) return
    if (watchlist.some((e) => e.ticker.toUpperCase() === ticker)) {
      addToast(`${ticker} already in watchlist`, 'info'); return
    }
    setIsAdding(true)
    try {
      const result = await fetchSingleQuote(ticker)
      if (!result) { addToast(`Could not find: ${ticker}`, 'error'); return }
      const newEntry: WatchlistEntry = { ticker: result.ticker, name: result.name, weight: 1 }
      setWatchlist((prev) => { const u = [...prev, newEntry]; saveWatchlist(u); return u })
      setStocks((prev) => [...prev, { ...result, weight: 1 }])
      setAddInput('')
      addToast(`Added ${result.name || ticker}`, 'success')
    } catch { addToast(`Failed to add ${ticker}`, 'error') }
    finally { setIsAdding(false) }
  }

  const handleDelete = (ticker: string) => {
    setWatchlist((prev) => prev.filter((e) => e.ticker !== ticker))
    setStocks((prev) => prev.filter((s) => s.ticker !== ticker))
  }

  const handleWeightChange = (ticker: string, delta: number) => {
    setWatchlist((prev) =>
      prev.map((e) => e.ticker === ticker ? { ...e, weight: Math.max(0.5, parseFloat((e.weight + delta).toFixed(1))) } : e)
    )
    setStocks((prev) =>
      prev.map((s) => s.ticker === ticker ? { ...s, weight: Math.max(0.5, parseFloat((s.weight + delta).toFixed(1))) } : s)
    )
  }

  const handleShare = () => {
    const encoded = encodeWatchlistToHash(watchlist)
    window.location.hash = encoded
    const url = `${window.location.origin}${window.location.pathname}#${encoded}`
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => addToast('Share link copied!', 'success'))
    } else { addToast('Share link set in address bar', 'info') }
  }

  const handleImportConfirm = (entries: WatchlistEntry[]) => {
    setWatchlist(entries); saveWatchlist(entries); setImportPrompt(null)
    history.replaceState(null, '', window.location.pathname)
    addToast('Watchlist imported!', 'success')
  }

  const handleBackup = () => { downloadBackup(watchlist); addToast('Backup downloaded', 'success') }

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    try {
      const entries = await parseRestoreFile(file)
      setWatchlist(entries); saveWatchlist(entries)
      addToast(`Restored ${entries.length} stocks`, 'success')
      setShowSettings(false)
    } catch (err) { addToast(err instanceof Error ? err.message : 'Restore failed', 'error') }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleManualRefresh = () => {
    fetchPrices(watchlist).then(() => {
      const opt = REFRESH_OPTIONS.find((o) => o.value === refreshInterval)
      if (opt?.seconds) startCountdown(opt.seconds)
    })
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const breadth = calcBreadth(stocks)
  const stockMap = new Map(stocks.map((s) => [s.ticker, s]))
  const displayStocks: Stock[] = watchlist.map((entry) =>
    stockMap.get(entry.ticker) ?? { ticker: entry.ticker, name: entry.name, weight: entry.weight, currentPrice: 0, previousClose: 0, changePercent: 0 }
  )

  // ── Market mood label ─────────────────────────────────────────────────────
  const mood =
    breadth.upPct >= 70 ? { label: 'Strongly Up 🚀', color: 'text-green-600' } :
    breadth.upPct >= 55 ? { label: 'Mostly Up 📈', color: 'text-green-500' } :
    breadth.upPct <= 30 ? { label: 'Strongly Down 📉', color: 'text-red-600' } :
    breadth.upPct <= 45 ? { label: 'Mostly Down ⚠️', color: 'text-red-500' } :
    { label: 'Mixed / Sideways ↔️', color: 'text-gray-500' }

  return (
    <div className="flex flex-col h-dvh max-w-md mx-auto bg-gray-50 select-none">

      {/* ── Import Prompt ─────────────────────────────────────────────────── */}
      {importPrompt && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl">
            <p className="text-xl font-bold text-gray-900 mb-2">Import Watchlist?</p>
            <p className="text-gray-500 mb-6">
              Someone shared a list of <strong className="text-gray-900">{importPrompt.length} stocks</strong> with you. Replace your current list?
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={() => handleImportConfirm(importPrompt)}
                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-lg font-bold py-4 rounded-2xl transition-all">
                Yes, Import It
              </button>
              <button onClick={() => { setImportPrompt(null); history.replaceState(null, '', window.location.pathname); const s = loadWatchlist(); setWatchlist(s.length > 0 ? s : DEFAULT_WATCHLIST) }}
                className="w-full bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 text-lg font-bold py-4 rounded-2xl transition-all">
                Keep My List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings Modal ────────────────────────────────────────────────── */}
      {showSettings && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-end justify-center" onClick={() => setShowSettings(false)}>
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <p className="text-xl font-bold text-gray-900">Settings</p>
              <button onClick={() => setShowSettings(false)} className="bg-gray-100 p-2 rounded-full">
                <X size={22} className="text-gray-600" />
              </button>
            </div>
            <div className="space-y-3">
              <button onClick={handleBackup}
                className="w-full flex items-center gap-4 bg-gray-50 border-2 border-gray-200 hover:border-green-400 active:scale-95 text-left px-5 py-4 rounded-2xl transition-all">
                <Download size={24} className="text-green-600 shrink-0" />
                <div>
                  <p className="text-base font-bold text-gray-900">Backup List</p>
                  <p className="text-sm text-gray-500">Save as a file on your phone</p>
                </div>
              </button>
              <button onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-4 bg-gray-50 border-2 border-gray-200 hover:border-blue-400 active:scale-95 text-left px-5 py-4 rounded-2xl transition-all">
                <Upload size={24} className="text-blue-600 shrink-0" />
                <div>
                  <p className="text-base font-bold text-gray-900">Restore List</p>
                  <p className="text-sm text-gray-500">Load from a backup file</p>
                </div>
              </button>
              <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleRestoreFile} />
              <button onClick={() => { if (confirm('Remove all stocks from the list?')) { setWatchlist([]); setStocks([]); saveWatchlist([]); setShowSettings(false); addToast('List cleared', 'info') } }}
                className="w-full flex items-center gap-4 bg-gray-50 border-2 border-gray-200 hover:border-red-400 active:scale-95 text-left px-5 py-4 rounded-2xl transition-all">
                <Trash2 size={24} className="text-red-500 shrink-0" />
                <div>
                  <p className="text-base font-bold text-red-500">Clear Everything</p>
                  <p className="text-sm text-gray-500">Remove all stocks from list</p>
                </div>
              </button>
            </div>
            <p className="text-center text-xs text-gray-400 mt-6">Data from Yahoo Finance · No account needed</p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          STICKY HEADER
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-30 bg-white border-b-2 border-gray-100 shadow-sm">

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={22} className="text-green-600" />
            <span className="text-lg font-black text-gray-900 tracking-tight">Market Tracker</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleShare}
              className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 active:scale-95 px-3 py-2 rounded-xl transition-all">
              <Share2 size={16} className="text-gray-600" />
              <span className="text-sm font-semibold text-gray-600">Share</span>
            </button>
            <button onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 active:scale-95 px-3 py-2 rounded-xl transition-all">
              <Settings size={16} className="text-gray-600" />
              <span className="text-sm font-semibold text-gray-600">More</span>
            </button>
          </div>
        </div>

        {/* ── Breadth Bar ─────────────────────────────────────────────────── */}
        <div className="px-4 pb-4">
          {/* Mood label */}
          <div className="flex items-center justify-between mb-2">
            <p className={`text-lg font-black ${mood.color}`}>{mood.label}</p>
            <div className="text-right">
              {isLoading ? (
                <p className="text-sm text-blue-500 font-semibold">Updating…</p>
              ) : countdown !== null ? (
                <p className="text-sm text-gray-400 font-medium">Next in {fmtCountdown(countdown)}</p>
              ) : (
                <p className="text-sm text-gray-400">Paused</p>
              )}
            </div>
          </div>

          {/* Big progress bar */}
          <div className="relative h-6 rounded-full overflow-hidden bg-red-100 mb-2">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-green-400 transition-all duration-700 ease-out rounded-full"
              style={{ width: `${breadth.upPct}%` }}
            />
          </div>

          {/* Counts + weighted % */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="bg-green-100 rounded-full px-3 py-1 flex items-center gap-1">
                <TrendingUp size={14} className="text-green-600" />
                <span className="text-sm font-bold text-green-700">{breadth.upCount} Up</span>
              </div>
              {breadth.flatCount > 0 && (
                <div className="bg-gray-100 rounded-full px-3 py-1">
                  <span className="text-sm font-semibold text-gray-500">{breadth.flatCount} Flat</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="bg-red-100 rounded-full px-3 py-1 flex items-center gap-1">
                <TrendingDown size={14} className="text-red-600" />
                <span className="text-sm font-bold text-red-700">{breadth.downCount} Down</span>
              </div>
            </div>
          </div>

          {/* Weighted % text */}
          <div className="flex justify-between mt-1.5">
            <span className="text-xs font-semibold text-green-600">{breadth.upPct.toFixed(0)}% Bullish Weight</span>
            <span className="text-xs font-semibold text-red-500">{breadth.downPct.toFixed(0)}% Bearish Weight</span>
          </div>
        </div>

        {/* ── Refresh Controls ─────────────────────────────────────────────── */}
        <div className="px-4 pb-3 flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-500 mr-1">Auto-refresh:</p>
          {REFRESH_OPTIONS.map((opt) => (
            <button key={opt.value}
              onClick={() => setRefreshInterval(opt.value)}
              className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                refreshInterval === opt.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {opt.label}
            </button>
          ))}
          <button onClick={handleManualRefresh} disabled={isLoading}
            className="ml-auto flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 active:scale-95 disabled:opacity-50 px-3 py-1.5 rounded-xl transition-all">
            <RefreshCw size={15} className={isLoading ? 'animate-spin text-blue-500' : 'text-blue-500'} />
            <span className="text-sm font-bold text-blue-600">Refresh</span>
          </button>
        </div>

        {/* ── Add Ticker Input ─────────────────────────────────────────────── */}
        <div className="px-4 pb-4 flex gap-2">
          <input
            type="text"
            value={addInput}
            onChange={(e) => setAddInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTicker()}
            placeholder="Type ticker… (e.g. WIPRO.NS)"
            className="flex-1 bg-gray-100 border-2 border-gray-200 focus:border-blue-400 focus:outline-none rounded-2xl px-4 py-3 text-base font-semibold text-gray-900 placeholder:text-gray-400 transition-colors"
          />
          <button onClick={handleAddTicker} disabled={isAdding || !addInput.trim()}
            className="bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 text-white px-4 py-3 rounded-2xl transition-all flex items-center gap-1.5 font-bold">
            {isAdding ? <RefreshCw size={18} className="animate-spin" /> : <Plus size={18} />}
            <span className="text-sm">{isAdding ? 'Adding…' : 'Add'}</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          STOCK LIST
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto px-4 pt-3">

        {error && (
          <div className="flex items-start gap-3 bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-3 text-sm text-red-700">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {lastUpdated && !isLoading && (
          <p className="text-xs text-gray-400 font-medium mb-3 text-center">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}

        <div className="space-y-3 pb-8">
          {displayStocks.map((stock) => {
            const isUp = stock.changePercent > 0.05
            const isDown = stock.changePercent < -0.05
            const hasPrice = stock.currentPrice > 0

            return (
              <div key={stock.ticker}
                className={`rounded-3xl border-2 p-4 transition-all ${
                  isUp ? 'bg-green-50 border-green-200' :
                  isDown ? 'bg-red-50 border-red-200' :
                  'bg-white border-gray-200'
                }`}>

                {/* Row 1: Name + Change pill */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="text-base font-black text-gray-900 leading-tight">{stock.ticker}</p>
                    <p className="text-sm text-gray-500 truncate">{stock.name}</p>
                  </div>
                  <div className={`shrink-0 flex items-center gap-1 rounded-2xl px-3 py-1.5 ${
                    isUp ? 'bg-green-200' : isDown ? 'bg-red-200' : 'bg-gray-100'
                  }`}>
                    {isUp && <TrendingUp size={16} className="text-green-700" />}
                    {isDown && <TrendingDown size={16} className="text-red-700" />}
                    <span className={`text-base font-black ${
                      isUp ? 'text-green-700' : isDown ? 'text-red-700' : 'text-gray-500'
                    }`}>
                      {hasPrice
                        ? `${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%`
                        : '—'}
                    </span>
                  </div>
                </div>

                {/* Row 2: Price + Weight controls + Delete */}
                <div className="flex items-center justify-between gap-2">
                  {/* Price */}
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-0.5">Price</p>
                    <p className="text-xl font-black text-gray-900 font-mono leading-none">
                      {hasPrice
                        ? stock.currentPrice >= 1000
                          ? stock.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 1 })
                          : stock.currentPrice.toFixed(2)
                        : '—'}
                    </p>
                  </div>

                  {/* Weight stepper */}
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-xs text-gray-400 font-medium">Weight</p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleWeightChange(stock.ticker, -0.5)}
                        className="w-9 h-9 rounded-xl bg-gray-200 hover:bg-gray-300 active:scale-90 flex items-center justify-center transition-all">
                        <Minus size={16} className="text-gray-700" />
                      </button>
                      <span className="text-lg font-black text-gray-900 min-w-[2rem] text-center">{stock.weight}</span>
                      <button onClick={() => handleWeightChange(stock.ticker, 0.5)}
                        className="w-9 h-9 rounded-xl bg-gray-200 hover:bg-gray-300 active:scale-90 flex items-center justify-center transition-all">
                        <Plus size={16} className="text-gray-700" />
                      </button>
                    </div>
                  </div>

                  {/* Delete */}
                  <button onClick={() => handleDelete(stock.ticker)}
                    className="w-10 h-10 rounded-2xl bg-red-100 hover:bg-red-200 active:scale-90 flex items-center justify-center transition-all self-end">
                    <Trash2 size={18} className="text-red-600" />
                  </button>
                </div>
              </div>
            )
          })}

          {/* Empty state */}
          {displayStocks.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <TrendingUp size={48} className="mb-4 opacity-20" />
              <p className="text-lg font-bold">No stocks yet</p>
              <p className="text-sm mt-1">Type a ticker above and press Add</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Toast Notifications ──────────────────────────────────────────────── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-50 w-full max-w-xs px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg text-sm font-bold pointer-events-auto ${
              toast.type === 'success' ? 'bg-green-600 text-white' :
              toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-800 text-white'
            }`}>
            {toast.type === 'success' && <CheckCircle2 size={17} className="shrink-0" />}
            {toast.type === 'error' && <AlertCircle size={17} className="shrink-0" />}
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  )
}

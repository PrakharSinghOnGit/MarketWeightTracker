import type { WatchlistEntry } from './types'

const STORAGE_KEY = 'breadth_tracker_watchlist'
const API_KEY_STORAGE = 'breadth_tracker_twelvedata_key'

/** Load watchlist from localStorage. Returns empty array on failure. */
export function loadWatchlist(): WatchlistEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as WatchlistEntry[]
  } catch {
    return []
  }
}

/** Save watchlist to localStorage. */
export function saveWatchlist(entries: WatchlistEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch (e) {
    console.error('[Storage] Failed to save watchlist:', e)
  }
}

/** Load Twelve Data API key from localStorage. */
export function loadApiKey(): string {
  try {
    return localStorage.getItem(API_KEY_STORAGE) || ''
  } catch {
    return ''
  }
}

/** Save Twelve Data API key to localStorage. */
export function saveApiKey(key: string): void {
  try {
    localStorage.setItem(API_KEY_STORAGE, key.trim())
  } catch (e) {
    console.error('[Storage] Failed to save API key:', e)
  }
}

/** Encode watchlist to a Base64 string for URL sharing. */
export function encodeWatchlistToHash(entries: WatchlistEntry[]): string {
  const minimal = entries.map(({ ticker, name, weight }) => ({ ticker, name, weight }))
  return btoa(unescape(encodeURIComponent(JSON.stringify(minimal))))
}

/** Decode a Base64 hash string back to a watchlist. Returns null on error. */
export function decodeHashToWatchlist(hash: string): WatchlistEntry[] | null {
  try {
    const clean = hash.startsWith('#') ? hash.slice(1) : hash
    const json = decodeURIComponent(escape(atob(clean)))
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed)) return null
    // Validate shape
    for (const item of parsed) {
      if (typeof item.ticker !== 'string' || typeof item.weight !== 'number') return null
    }
    return parsed as WatchlistEntry[]
  } catch {
    return null
  }
}

/** Download watchlist as a JSON file. */
export function downloadBackup(entries: WatchlistEntry[]): void {
  const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `breadth-watchlist-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** Parse a JSON file upload and return watchlist entries. */
export function parseRestoreFile(file: File): Promise<WatchlistEntry[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const parsed = JSON.parse(text)
        if (!Array.isArray(parsed)) throw new Error('Invalid format')
        resolve(parsed as WatchlistEntry[])
      } catch {
        reject(new Error('Invalid JSON backup file.'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file.'))
    reader.readAsText(file)
  })
}

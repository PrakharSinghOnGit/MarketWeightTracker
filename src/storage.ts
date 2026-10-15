import type { WatchlistStock } from './types';

const STORAGE_KEY = 'market_weight_tracker_watchlist';

/**
 * Default sample watchlist with 4 stocks:
 * 2 up and 2 down, where 1 up has a weight of 3,
 * yielding the exact 4 : 2 ratio requested in the example!
 */
export const DEFAULT_WATCHLIST: WatchlistStock[] = [
  {
    id: 'RELIANCE.NS',
    symbol: 'RELIANCE.NS',
    fullName: 'Reliance Industries Limited',
    currentPrice: 1214.90,
    changePercent: '+3.43%',
    rawPercent: 3.43,
    weight: 3, // Weight of 3 on an UP stock
    currency: 'INR',
    exchange: 'NSE',
    lastUpdated: Date.now(),
  },
  {
    id: 'TCS.NS',
    symbol: 'TCS.NS',
    fullName: 'Tata Consultancy Services Ltd',
    currentPrice: 2358.20,
    changePercent: '+2.31%',
    rawPercent: 2.31,
    weight: 1, // Weight of 1 on an UP stock -> Total Green = 3 + 1 = 4
    currency: 'INR',
    exchange: 'NSE',
    lastUpdated: Date.now(),
  },
  {
    id: 'NVDA',
    symbol: 'NVDA',
    fullName: 'NVIDIA Corporation',
    currentPrice: 221.30,
    changePercent: '-3.16%',
    rawPercent: -3.16,
    weight: 1, // Weight of 1 on a DOWN stock
    currency: 'USD',
    exchange: 'NASDAQ',
    lastUpdated: Date.now(),
  },
  {
    id: 'TSLA',
    symbol: 'TSLA',
    fullName: 'Tesla, Inc.',
    currentPrice: 367.16,
    changePercent: '-2.15%',
    rawPercent: -2.15,
    weight: 1, // Weight of 1 on a DOWN stock -> Total Red = 1 + 1 = 2 (Ratio: 4 : 2)
    currency: 'USD',
    exchange: 'NASDAQ',
    lastUpdated: Date.now(),
  },
];

/**
 * Loads the watchlist from localStorage.
 * If empty or invalid, falls back to the default sample list.
 */
export function loadWatchlist(): WatchlistStock[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveWatchlist(DEFAULT_WATCHLIST);
      return [...DEFAULT_WATCHLIST];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item) => ({
        ...item,
        weight: typeof item.weight === 'number' && item.weight >= 0 ? item.weight : 1,
      }));
    }
    return [...DEFAULT_WATCHLIST];
  } catch (err) {
    console.warn('[Storage] Failed to load watchlist from localStorage:', err);
    return [...DEFAULT_WATCHLIST];
  }
}

/**
 * Saves the watchlist to localStorage.
 */
export function saveWatchlist(stocks: WatchlistStock[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stocks));
  } catch (err) {
    console.error('[Storage] Failed to save watchlist to localStorage:', err);
  }
}

/**
 * Resets the watchlist back to the default example.
 */
export function resetWatchlist(): WatchlistStock[] {
  saveWatchlist(DEFAULT_WATCHLIST);
  return [...DEFAULT_WATCHLIST];
}

/**
 * Clears the watchlist completely.
 */
export function clearWatchlist(): WatchlistStock[] {
  saveWatchlist([]);
  return [];
}

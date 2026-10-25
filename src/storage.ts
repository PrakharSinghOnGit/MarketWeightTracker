import type { WatchlistStock } from './types';

const STORAGE_KEY = 'market_breadth_watchlist_v3';

/**
 * Default watchlist featuring the 20 required major stocks from the user's portfolio:
 * - Adani Enterprises, Tata Steel, L&T Finance, Tech Mahindra, Tata Power,
 * - Bajaj Finance, Bajaj Finserv, Titan, Hindustan Unilever, Bharat Electronics,
 * - Sun Pharma, ITC, Wipro, Bharti Airtel, Mahindra & Mahindra,
 * - Infosys, HCL Tech, Maruti Suzuki, TCS, Asian Paints.
 *
 * All stocks have equal weight = 1 by default.
 */
export const DEFAULT_WATCHLIST: WatchlistStock[] = [
  {
    id: 'ADANIENT.NS',
    symbol: 'ADANIENT.NS',
    fullName: 'Adani Enterprises Limited',
    currentPrice: 2477.00,
    changePercent: '-2.86%',
    rawPercent: -2.86,
    weight: 1,
    currency: 'INR',
    exchange: 'NSE',
    lastUpdated: Date.now(),
  },
  {
    id: 'TATASTEEL.NS',
    symbol: 'TATASTEEL.NS',
    fullName: 'Tata Steel Limited',
    currentPrice: 167.67,
    changePercent: '-2.70%',
    rawPercent: -2.70,
    weight: 1,
    currency: 'INR',
    exchange: 'NSE',
    lastUpdated: Date.now(),
  },
  {
    id: 'LTF.NS',
    symbol: 'LTF.NS',
    fullName: 'L&T Finance Ltd',
    currentPrice: 237.50,
    changePercent: '-2.70%',
    rawPercent: -2.70,
    weight: 1,
    currency: 'INR',
    exchange: 'NSE',
    lastUpdated: Date.now(),
  },
  {
    id: 'TECHM.NS',
    symbol: 'TECHM.NS',
    fullName: 'Tech Mahindra Limited',
    currentPrice: 1790.00,
    changePercent: '-2.14%',
    rawPercent: -2.14,
    weight: 1,
    currency: 'INR',
    exchange: 'NSE',
    lastUpdated: Date.now(),
  },
  {
    id: 'TATAPOWER.NS',
    symbol: 'TATAPOWER.NS',
    fullName: 'Tata Power Company Limited',
    currentPrice: 348.10,
    changePercent: '-1.53%',
    rawPercent: -1.53,
    weight: 1,
    currency: 'INR',
    exchange: 'NSE',
    lastUpdated: Date.now(),
  },
  {
    id: 'BAJFINANCE.NS',
    symbol: 'BAJFINANCE.NS',
    fullName: 'Bajaj Finance Limited',
    currentPrice: 928.95,
    changePercent: '-1.40%',
    rawPercent: -1.40,
    weight: 1,
    currency: 'INR',
    exchange: 'NSE',
    lastUpdated: Date.now(),
  },
  {
    id: 'BAJAJFINSV.NS',
    symbol: 'BAJAJFINSV.NS',
    fullName: 'Bajaj Finserv Limited',
    currentPrice: 1655.00,
    changePercent: '-1.37%',
    rawPercent: -1.37,
    weight: 1,
    currency: 'INR',
    exchange: 'NSE',
    lastUpdated: Date.now(),
  },
  {
    id: 'TITAN.NS',
    symbol: 'TITAN.NS',
    fullName: 'Titan Company Limited',
    currentPrice: 4299.70,
    changePercent: '-1.16%',
    rawPercent: -1.16,
    weight: 1,
    currency: 'INR',
    exchange: 'NSE',
    lastUpdated: Date.now(),
  },
  {
    id: 'HINDUNILVR.NS',
    symbol: 'HINDUNILVR.NS',
    fullName: 'Hindustan Unilever Limited',
    currentPrice: 1814.70,
    changePercent: '-0.74%',
    rawPercent: -0.74,
    weight: 1,
    currency: 'INR',
    exchange: 'NSE',
    lastUpdated: Date.now(),
  },
  {
    id: 'BEL.NS',
    symbol: 'BEL.NS',
    fullName: 'Bharat Electronics Limited',
    currentPrice: 362.00,
    changePercent: '-0.69%',
    rawPercent: -0.69,
    weight: 1,
    currency: 'INR',
    exchange: 'NSE',
    lastUpdated: Date.now(),
  },
  {
    id: 'SUNPHARMA.NS',
    symbol: 'SUNPHARMA.NS',
    fullName: 'Sun Pharmaceutical Industries Limited',
    currentPrice: 1748.00,
    changePercent: '-0.57%',
    rawPercent: -0.57,
    weight: 1,
    currency: 'INR',
    exchange: 'NSE',
    lastUpdated: Date.now(),
  },
  {
    id: 'ITC.NS',
    symbol: 'ITC.NS',
    fullName: 'ITC Limited',
    currentPrice: 257.90,
    changePercent: '-0.39%',
    rawPercent: -0.39,
    weight: 1,
    currency: 'INR',
    exchange: 'NSE',
    lastUpdated: Date.now(),
  },
  {
    id: 'WIPRO.NS',
    symbol: 'WIPRO.NS',
    fullName: 'Wipro Limited',
    currentPrice: 189.84,
    changePercent: '-0.30%',
    rawPercent: -0.30,
    weight: 1,
    currency: 'INR',
    exchange: 'NSE',
    lastUpdated: Date.now(),
  },
  {
    id: 'BHARTIARTL.NS',
    symbol: 'BHARTIARTL.NS',
    fullName: 'Bharti Airtel Limited',
    currentPrice: 1892.10,
    changePercent: '-0.15%',
    rawPercent: -0.15,
    weight: 1,
    currency: 'INR',
    exchange: 'NSE',
    lastUpdated: Date.now(),
  },
  {
    id: 'M&M.NS',
    symbol: 'M&M.NS',
    fullName: 'Mahindra & Mahindra Ltd.',
    currentPrice: 2861.20,
    changePercent: '-0.10%',
    rawPercent: -0.10,
    weight: 1,
    currency: 'INR',
    exchange: 'NSE',
    lastUpdated: Date.now(),
  },
  {
    id: 'INFY.NS',
    symbol: 'INFY.NS',
    fullName: 'Infosys Limited',
    currentPrice: 1153.80,
    changePercent: '+0.04%',
    rawPercent: 0.04,
    weight: 1,
    currency: 'INR',
    exchange: 'NSE',
    lastUpdated: Date.now(),
  },
  {
    id: 'HCLTECH.NS',
    symbol: 'HCLTECH.NS',
    fullName: 'HCL Technologies Limited',
    currentPrice: 1422.20,
    changePercent: '+0.04%',
    rawPercent: 0.04,
    weight: 1,
    currency: 'INR',
    exchange: 'NSE',
    lastUpdated: Date.now(),
  },
  {
    id: 'MARUTI.NS',
    symbol: 'MARUTI.NS',
    fullName: 'Maruti Suzuki India Limited',
    currentPrice: 11230.00,
    changePercent: '+0.54%',
    rawPercent: 0.54,
    weight: 1,
    currency: 'INR',
    exchange: 'NSE',
    lastUpdated: Date.now(),
  },
  {
    id: 'TCS.NS',
    symbol: 'TCS.NS',
    fullName: 'Tata Consultancy Services Limited',
    currentPrice: 2530.00,
    changePercent: '+0.92%',
    rawPercent: 0.92,
    weight: 1,
    currency: 'INR',
    exchange: 'NSE',
    lastUpdated: Date.now(),
  },
  {
    id: 'ASIANPAINT.NS',
    symbol: 'ASIANPAINT.NS',
    fullName: 'Asian Paints Ltd.',
    currentPrice: 2307.00,
    changePercent: '+0.97%',
    rawPercent: 0.97,
    weight: 1,
    currency: 'INR',
    exchange: 'NSE',
    lastUpdated: Date.now(),
  },
];

/**
 * Loads the watchlist from localStorage.
 * If empty or using an old schema, initializes with the 20 required stocks.
 * Enforces weight = 1 for all items.
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
      // Check if it's the old 4-stock sample (RELIANCE.NS, TCS.NS, NVDA, TSLA)
      const symbols = parsed.map((p) => p.symbol);
      const isOldSample =
        parsed.length === 4 &&
        symbols.includes('RELIANCE.NS') &&
        symbols.includes('NVDA') &&
        symbols.includes('TSLA');

      if (isOldSample) {
        saveWatchlist(DEFAULT_WATCHLIST);
        return [...DEFAULT_WATCHLIST];
      }

      return parsed.map((item) => ({
        ...item,
        weight: 1, // Enforce weight = 1
      }));
    }
    saveWatchlist(DEFAULT_WATCHLIST);
    return [...DEFAULT_WATCHLIST];
  } catch (err) {
    console.warn('[Storage] Failed to load watchlist from localStorage:', err);
    return [...DEFAULT_WATCHLIST];
  }
}

/**
 * Saves the watchlist to localStorage (enforcing weight = 1 for all stocks).
 */
export function saveWatchlist(stocks: WatchlistStock[]): void {
  try {
    const sanitized = stocks.map((s) => ({
      ...s,
      weight: 1,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.error('[Storage] Failed to save watchlist to localStorage:', err);
  }
}

/**
 * Resets the watchlist back to the 20 required stocks.
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

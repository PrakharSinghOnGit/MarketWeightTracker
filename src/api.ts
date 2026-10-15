import type { StockInfo } from './types';

const SCANNER_INDIA = 'https://scanner.tradingview.com/india/scan';
const SCANNER_AMERICA = 'https://scanner.tradingview.com/america/scan';

/**
 * Curated list of popular Indian and Global stocks for instant instant-search
 * and offline/instant suggestions.
 */
export const POPULAR_STOCKS: StockInfo[] = [
  { symbol: 'RELIANCE.NS', fullName: 'Reliance Industries Limited', currentPrice: 1214.60, changePercent: '+3.41%', rawPercent: 3.41, currency: 'INR', exchange: 'NSE' },
  { symbol: 'TCS.NS', fullName: 'Tata Consultancy Services Ltd', currentPrice: 2358.20, changePercent: '+2.31%', rawPercent: 2.31, currency: 'INR', exchange: 'NSE' },
  { symbol: 'INFY.NS', fullName: 'Infosys Limited', currentPrice: 1111.90, changePercent: '+2.20%', rawPercent: 2.20, currency: 'INR', exchange: 'NSE' },
  { symbol: 'HDFCBANK.NS', fullName: 'HDFC Bank Limited', currentPrice: 725.25, changePercent: '+2.05%', rawPercent: 2.05, currency: 'INR', exchange: 'NSE' },
  { symbol: 'ICICIBANK.NS', fullName: 'ICICI Bank Limited', currentPrice: 1245.00, changePercent: '-0.85%', rawPercent: -0.85, currency: 'INR', exchange: 'NSE' },
  { symbol: 'SBIN.NS', fullName: 'State Bank of India', currentPrice: 789.50, changePercent: '-1.12%', rawPercent: -1.12, currency: 'INR', exchange: 'NSE' },
  { symbol: 'TATAMOTORS.NS', fullName: 'Tata Motors Limited', currentPrice: 422.00, changePercent: '+1.69%', rawPercent: 1.69, currency: 'INR', exchange: 'NSE' },
  { symbol: 'ZOMATO.NS', fullName: 'Zomato Limited', currentPrice: 268.40, changePercent: '+4.15%', rawPercent: 4.15, currency: 'INR', exchange: 'NSE' },
  { symbol: 'BHARTIARTL.NS', fullName: 'Bharti Airtel Limited', currentPrice: 1640.00, changePercent: '-0.45%', rawPercent: -0.45, currency: 'INR', exchange: 'NSE' },
  { symbol: 'ITC.NS', fullName: 'ITC Limited', currentPrice: 485.30, changePercent: '-0.30%', rawPercent: -0.30, currency: 'INR', exchange: 'NSE' },
  { symbol: 'AAPL', fullName: 'Apple Inc.', currentPrice: 342.96, changePercent: '+0.50%', rawPercent: 0.50, currency: 'USD', exchange: 'NASDAQ' },
  { symbol: 'NVDA', fullName: 'NVIDIA Corporation', currentPrice: 221.30, changePercent: '-3.16%', rawPercent: -3.16, currency: 'USD', exchange: 'NASDAQ' },
  { symbol: 'MSFT', fullName: 'Microsoft Corporation', currentPrice: 533.69, changePercent: '-1.80%', rawPercent: -1.80, currency: 'USD', exchange: 'NASDAQ' },
  { symbol: 'TSLA', fullName: 'Tesla, Inc.', currentPrice: 367.16, changePercent: '-2.15%', rawPercent: -2.15, currency: 'USD', exchange: 'NASDAQ' },
  { symbol: 'GOOGL', fullName: 'Alphabet Inc.', currentPrice: 198.40, changePercent: '+1.15%', rawPercent: 1.15, currency: 'USD', exchange: 'NASDAQ' },
  { symbol: 'AMZN', fullName: 'Amazon.com, Inc.', currentPrice: 215.70, changePercent: '+0.88%', rawPercent: 0.88, currency: 'USD', exchange: 'NASDAQ' },
];

/**
 * Converts a user ticker string (e.g. RELIANCE.NS, TCS, AAPL) into
 * scanner candidates (e.g. NSE:RELIANCE, NASDAQ:AAPL).
 */
function toScannerCandidates(symbol: string): { ticker: string; market: 'india' | 'america'; userSymbol: string }[] {
  const clean = symbol.trim().toUpperCase();
  if (!clean) return [];

  if (clean.includes(':')) {
    const isIndia = clean.startsWith('NSE:') || clean.startsWith('BSE:');
    return [{ ticker: clean, market: isIndia ? 'india' : 'america', userSymbol: clean }];
  }

  if (clean.endsWith('.NS')) {
    const raw = clean.replace('.NS', '');
    return [{ ticker: `NSE:${raw}`, market: 'india', userSymbol: clean }];
  }

  if (clean.endsWith('.BO')) {
    const raw = clean.replace('.BO', '');
    return [{ ticker: `BSE:${raw}`, market: 'india', userSymbol: clean }];
  }

  // Without suffix: candidate on NSE, BSE, NASDAQ, and NYSE
  return [
    { ticker: `NSE:${clean}`, market: 'india', userSymbol: `${clean}.NS` },
    { ticker: `BSE:${clean}`, market: 'india', userSymbol: `${clean}.BO` },
    { ticker: `NASDAQ:${clean}`, market: 'america', userSymbol: clean },
    { ticker: `NYSE:${clean}`, market: 'america', userSymbol: clean },
  ];
}

/**
 * Format raw percentage number into standard "+X.XX%" or "-X.XX%"
 */
export function formatPercent(raw: number): string {
  if (isNaN(raw)) return '0.00%';
  const fixed = raw.toFixed(2);
  return raw > 0 ? `+${fixed}%` : `${fixed}%`;
}

/**
 * Fetches real-time stock summaries for given symbols.
 * Compatible with the user's interface in api.ts, runs smoothly in browser
 * and static GitHub Pages deployments without CORS errors.
 */
export async function getStockSummaries(symbols: string[]): Promise<StockInfo[]> {
  if (!symbols || symbols.length === 0) return [];

  const indiaTickers: string[] = [];
  const americaTickers: string[] = [];
  const candidateMap = new Map<string, string>(); // scannerTicker -> preferredUserSymbol

  for (const sym of symbols) {
    const candidates = toScannerCandidates(sym);
    for (const c of candidates) {
      if (c.market === 'india') {
        indiaTickers.push(c.ticker);
      } else {
        americaTickers.push(c.ticker);
      }
      if (!candidateMap.has(c.ticker)) {
        candidateMap.set(c.ticker, sym);
      }
    }
  }

  const results: StockInfo[] = [];
  const foundUserSymbols = new Set<string>();

  const scanPromises: Promise<void>[] = [];

  // Query India scanner
  if (indiaTickers.length > 0) {
    scanPromises.push(
      fetch(SCANNER_INDIA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbols: { tickers: Array.from(new Set(indiaTickers)) },
          columns: ['name', 'description', 'close', 'change'],
        }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.data)) {
            for (const item of data.data) {
              const scannerTicker = item.s as string;
              const details = item.d || [];
              const rawName = (details[0] as string) || '';
              const desc = (details[1] as string) || rawName;
              const price = typeof details[2] === 'number' ? details[2] : 0;
              const change = typeof details[3] === 'number' ? details[3] : 0;

              const isBse = scannerTicker.startsWith('BSE:');
              const displaySymbol = isBse ? `${rawName}.BO` : `${rawName}.NS`;
              const matchedRequested = candidateMap.get(scannerTicker) || displaySymbol;

              if (!foundUserSymbols.has(matchedRequested)) {
                foundUserSymbols.add(matchedRequested);
                results.push({
                  symbol: matchedRequested.toUpperCase(),
                  fullName: desc,
                  currentPrice: Math.round(price * 100) / 100,
                  changePercent: formatPercent(change),
                  rawPercent: Math.round(change * 100) / 100,
                  currency: 'INR',
                  exchange: isBse ? 'BSE' : 'NSE',
                });
              }
            }
          }
        })
        .catch((err) => {
          console.warn('[API] India scanner request failed:', err);
        })
    );
  }

  // Query America scanner
  if (americaTickers.length > 0) {
    scanPromises.push(
      fetch(SCANNER_AMERICA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbols: { tickers: Array.from(new Set(americaTickers)) },
          columns: ['name', 'description', 'close', 'change'],
        }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.data)) {
            for (const item of data.data) {
              const scannerTicker = item.s as string;
              const details = item.d || [];
              const rawName = (details[0] as string) || '';
              const desc = (details[1] as string) || rawName;
              const price = typeof details[2] === 'number' ? details[2] : 0;
              const change = typeof details[3] === 'number' ? details[3] : 0;

              const displaySymbol = rawName;
              const matchedRequested = candidateMap.get(scannerTicker) || displaySymbol;

              if (!foundUserSymbols.has(matchedRequested)) {
                foundUserSymbols.add(matchedRequested);
                results.push({
                  symbol: matchedRequested.toUpperCase(),
                  fullName: desc,
                  currentPrice: Math.round(price * 100) / 100,
                  changePercent: formatPercent(change),
                  rawPercent: Math.round(change * 100) / 100,
                  currency: 'USD',
                  exchange: scannerTicker.split(':')[0] || 'US',
                });
              }
            }
          }
        })
        .catch((err) => {
          console.warn('[API] America scanner request failed:', err);
        })
    );
  }

  await Promise.all(scanPromises);

  // For any symbols not returned by scanner, fallback to popular directory or keep safe placeholder
  for (const sym of symbols) {
    const cleanSym = sym.trim().toUpperCase();
    if (!foundUserSymbols.has(cleanSym)) {
      const popular = POPULAR_STOCKS.find(
        (p) => p.symbol.toUpperCase() === cleanSym || p.symbol.replace(/\.(NS|BO)$/, '') === cleanSym
      );
      if (popular) {
        results.push({
          ...popular,
          symbol: cleanSym,
        });
      }
    }
  }

  return results;
}

/**
 * Searches stocks by query string (symbol or company name).
 * Searches Indian exchanges (NSE, BSE), US exchanges, and local catalog.
 */
export async function searchStock(query: string): Promise<StockInfo[]> {
  const clean = query.trim().toUpperCase();
  if (!clean || clean.length < 1) return [];

  const foundMap = new Map<string, StockInfo>();

  // 1. Instant local catalog matches first (zero latency)
  for (const stock of POPULAR_STOCKS) {
    if (stock.symbol.toUpperCase().includes(clean) || stock.fullName.toUpperCase().includes(clean)) {
      foundMap.set(stock.symbol, { ...stock });
    }
  }

  // 2. Fetch live matching stocks from scanners
  try {
    const [indiaRes, americaRes] = await Promise.all([
      fetch(SCANNER_INDIA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filter: [
            {
              left: 'name',
              operation: 'match',
              right: clean,
            },
          ],
          columns: ['name', 'description', 'close', 'change'],
          range: [0, 8],
        }),
      }).then((r) => (r.ok ? r.json() : null)).catch(() => null),

      fetch(SCANNER_AMERICA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filter: [
            {
              left: 'name',
              operation: 'match',
              right: clean,
            },
          ],
          columns: ['name', 'description', 'close', 'change'],
          range: [0, 8],
        }),
      }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);

    if (indiaRes && Array.isArray(indiaRes.data)) {
      for (const item of indiaRes.data) {
        const rawTicker = item.s as string;
        const [ticker, desc, price, change] = item.d || [];
        const isBse = rawTicker.startsWith('BSE:');
        const symbol = isBse ? `${ticker}.BO` : `${ticker}.NS`;

        if (!foundMap.has(symbol)) {
          foundMap.set(symbol, {
            symbol,
            fullName: desc || ticker,
            currentPrice: typeof price === 'number' ? Math.round(price * 100) / 100 : 0,
            changePercent: typeof change === 'number' ? formatPercent(change) : '0.00%',
            rawPercent: typeof change === 'number' ? Math.round(change * 100) / 100 : 0,
            currency: 'INR',
            exchange: isBse ? 'BSE' : 'NSE',
          });
        }
      }
    }

    if (americaRes && Array.isArray(americaRes.data)) {
      for (const item of americaRes.data) {
        const rawTicker = item.s as string;
        const [ticker, desc, price, change] = item.d || [];
        const symbol = ticker as string;

        if (!foundMap.has(symbol)) {
          foundMap.set(symbol, {
            symbol,
            fullName: desc || ticker,
            currentPrice: typeof price === 'number' ? Math.round(price * 100) / 100 : 0,
            changePercent: typeof change === 'number' ? formatPercent(change) : '0.00%',
            rawPercent: typeof change === 'number' ? Math.round(change * 100) / 100 : 0,
            currency: 'USD',
            exchange: rawTicker.split(':')[0] || 'US',
          });
        }
      }
    }
  } catch (err) {
    console.warn('[Search] Scanner search error:', err);
  }

  return Array.from(foundMap.values()).slice(0, 10);
}

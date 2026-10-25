import type { StockInfo } from './types';

const SCANNER_INDIA = 'https://scanner.tradingview.com/india/scan';
const SCANNER_AMERICA = 'https://scanner.tradingview.com/america/scan';

/**
 * Curated list of popular Indian and Global stocks for instant instant-search
 * and offline/instant suggestions. Includes all 20 required major stocks.
 */
export const POPULAR_STOCKS: StockInfo[] = [
  { symbol: 'ADANIENT.NS', fullName: 'Adani Enterprises Limited', currentPrice: 2477.00, changePercent: '-2.86%', rawPercent: -2.86, currency: 'INR', exchange: 'NSE' },
  { symbol: 'TATASTEEL.NS', fullName: 'Tata Steel Limited', currentPrice: 167.67, changePercent: '-2.70%', rawPercent: -2.70, currency: 'INR', exchange: 'NSE' },
  { symbol: 'LTF.NS', fullName: 'L&T Finance Ltd', currentPrice: 237.50, changePercent: '-2.70%', rawPercent: -2.70, currency: 'INR', exchange: 'NSE' },
  { symbol: 'TECHM.NS', fullName: 'Tech Mahindra Limited', currentPrice: 1790.00, changePercent: '-2.14%', rawPercent: -2.14, currency: 'INR', exchange: 'NSE' },
  { symbol: 'TATAPOWER.NS', fullName: 'Tata Power Company Limited', currentPrice: 348.10, changePercent: '-1.53%', rawPercent: -1.53, currency: 'INR', exchange: 'NSE' },
  { symbol: 'BAJFINANCE.NS', fullName: 'Bajaj Finance Limited', currentPrice: 928.95, changePercent: '-1.40%', rawPercent: -1.40, currency: 'INR', exchange: 'NSE' },
  { symbol: 'BAJAJFINSV.NS', fullName: 'Bajaj Finserv Limited', currentPrice: 1655.00, changePercent: '-1.37%', rawPercent: -1.37, currency: 'INR', exchange: 'NSE' },
  { symbol: 'TITAN.NS', fullName: 'Titan Company Limited', currentPrice: 4299.70, changePercent: '-1.16%', rawPercent: -1.16, currency: 'INR', exchange: 'NSE' },
  { symbol: 'HINDUNILVR.NS', fullName: 'Hindustan Unilever Limited', currentPrice: 1814.70, changePercent: '-0.74%', rawPercent: -0.74, currency: 'INR', exchange: 'NSE' },
  { symbol: 'BEL.NS', fullName: 'Bharat Electronics Limited', currentPrice: 362.00, changePercent: '-0.69%', rawPercent: -0.69, currency: 'INR', exchange: 'NSE' },
  { symbol: 'SUNPHARMA.NS', fullName: 'Sun Pharmaceutical Industries Limited', currentPrice: 1748.00, changePercent: '-0.57%', rawPercent: -0.57, currency: 'INR', exchange: 'NSE' },
  { symbol: 'ITC.NS', fullName: 'ITC Limited', currentPrice: 257.90, changePercent: '-0.39%', rawPercent: -0.39, currency: 'INR', exchange: 'NSE' },
  { symbol: 'WIPRO.NS', fullName: 'Wipro Limited', currentPrice: 189.84, changePercent: '-0.30%', rawPercent: -0.30, currency: 'INR', exchange: 'NSE' },
  { symbol: 'BHARTIARTL.NS', fullName: 'Bharti Airtel Limited', currentPrice: 1892.10, changePercent: '-0.15%', rawPercent: -0.15, currency: 'INR', exchange: 'NSE' },
  { symbol: 'M&M.NS', fullName: 'Mahindra & Mahindra Ltd.', currentPrice: 2861.20, changePercent: '-0.10%', rawPercent: -0.10, currency: 'INR', exchange: 'NSE' },
  { symbol: 'INFY.NS', fullName: 'Infosys Limited', currentPrice: 1153.80, changePercent: '+0.04%', rawPercent: 0.04, currency: 'INR', exchange: 'NSE' },
  { symbol: 'HCLTECH.NS', fullName: 'HCL Technologies Limited', currentPrice: 1422.20, changePercent: '+0.04%', rawPercent: 0.04, currency: 'INR', exchange: 'NSE' },
  { symbol: 'MARUTI.NS', fullName: 'Maruti Suzuki India Limited', currentPrice: 11230.00, changePercent: '+0.54%', rawPercent: 0.54, currency: 'INR', exchange: 'NSE' },
  { symbol: 'TCS.NS', fullName: 'Tata Consultancy Services Limited', currentPrice: 2530.00, changePercent: '+0.92%', rawPercent: 0.92, currency: 'INR', exchange: 'NSE' },
  { symbol: 'ASIANPAINT.NS', fullName: 'Asian Paints Ltd.', currentPrice: 2307.00, changePercent: '+0.97%', rawPercent: 0.97, currency: 'INR', exchange: 'NSE' },
  { symbol: 'RELIANCE.NS', fullName: 'Reliance Industries Limited', currentPrice: 1214.60, changePercent: '+3.41%', rawPercent: 3.41, currency: 'INR', exchange: 'NSE' },
  { symbol: 'HDFCBANK.NS', fullName: 'HDFC Bank Limited', currentPrice: 725.25, changePercent: '+2.05%', rawPercent: 2.05, currency: 'INR', exchange: 'NSE' },
  { symbol: 'ICICIBANK.NS', fullName: 'ICICI Bank Limited', currentPrice: 1245.00, changePercent: '-0.85%', rawPercent: -0.85, currency: 'INR', exchange: 'NSE' },
  { symbol: 'SBIN.NS', fullName: 'State Bank of India', currentPrice: 789.50, changePercent: '-1.12%', rawPercent: -1.12, currency: 'INR', exchange: 'NSE' },
  { symbol: 'TATAMOTORS.NS', fullName: 'Tata Motors Limited', currentPrice: 422.00, changePercent: '+1.69%', rawPercent: 1.69, currency: 'INR', exchange: 'NSE' },
  { symbol: 'ZOMATO.NS', fullName: 'Zomato Limited', currentPrice: 268.40, changePercent: '+4.15%', rawPercent: 4.15, currency: 'INR', exchange: 'NSE' },
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

              if (!foundUserSymbols.has(matchedRequested.toUpperCase())) {
                foundUserSymbols.add(matchedRequested.toUpperCase());
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

              if (!foundUserSymbols.has(matchedRequested.toUpperCase())) {
                foundUserSymbols.add(matchedRequested.toUpperCase());
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
 * Searches Indian exchanges (NSE prioritized over BSE), US exchanges, and instant catalog.
 * Supports matching both ticker symbols (e.g. TATASTEEL, ADANIENT) and full company names (e.g. "Tata Steel", "Adani").
 */
export async function searchStock(query: string): Promise<StockInfo[]> {
  const clean = query.trim();
  if (!clean || clean.length < 1) return [];

  const upper = clean.toUpperCase();
  const noSpace = upper.replace(/[\s\-_.]+/g, '');
  const foundMap = new Map<string, StockInfo>();

  // 1. Instant local catalog matches first (0ms latency)
  for (const stock of POPULAR_STOCKS) {
    const sSym = stock.symbol.toUpperCase();
    const sBase = sSym.replace(/\.(NS|BO)$/, '');
    const sName = stock.fullName.toUpperCase();

    if (
      sSym.includes(upper) ||
      sBase.includes(upper) ||
      sBase.replace(/[\s\-_.]+/g, '').includes(noSpace) ||
      sName.includes(upper)
    ) {
      foundMap.set(stock.symbol, { ...stock });
    }
  }

  // 2. Fetch live matching stocks from scanners
  try {
    const scanPromises: Promise<any>[] = [];

    // Query 1: India scanner by ticker name (without spaces, e.g. TATASTEEL)
    scanPromises.push(
      fetch(SCANNER_INDIA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filter: [
            {
              left: 'name',
              operation: 'match',
              right: noSpace,
            },
          ],
          columns: ['name', 'description', 'close', 'change'],
          range: [0, 15],
        }),
      }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    );

    // Query 2: India scanner by company name description (e.g. "Tata Steel", "Adani")
    scanPromises.push(
      fetch(SCANNER_INDIA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filter: [
            {
              left: 'description',
              operation: 'match',
              right: clean,
            },
          ],
          columns: ['name', 'description', 'close', 'change'],
          range: [0, 15],
        }),
      }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    );

    // Query 3: America scanner
    scanPromises.push(
      fetch(SCANNER_AMERICA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filter: [
            {
              left: 'name',
              operation: 'match',
              right: noSpace,
            },
          ],
          columns: ['name', 'description', 'close', 'change'],
          range: [0, 10],
        }),
      }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    );

    const [indiaNameRes, indiaDescRes, americaRes] = await Promise.all(scanPromises);

    // Ingest India results with NSE priority
    const ingestIndia = (data: any) => {
      if (!data || !Array.isArray(data.data)) return;
      // Sort so NSE comes before BSE
      const sorted = [...data.data].sort((a, b) => {
        const aIsNse = (a.s as string).startsWith('NSE:') ? 0 : 1;
        const bIsNse = (b.s as string).startsWith('NSE:') ? 0 : 1;
        return aIsNse - bIsNse;
      });

      for (const item of sorted) {
        const rawTicker = item.s as string;
        const [ticker, desc, price, change] = item.d || [];
        const isBse = rawTicker.startsWith('BSE:');
        const symbol = isBse ? `${ticker}.BO` : `${ticker}.NS`;
        const baseTicker = ticker as string;

        // Skip BSE duplicate if NSE symbol is already present
        if (isBse && foundMap.has(`${baseTicker}.NS`)) {
          continue;
        }

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
    };

    ingestIndia(indiaNameRes);
    ingestIndia(indiaDescRes);

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

  // Sort results: exact symbol match first, then prefix, then rest
  const list = Array.from(foundMap.values());
  list.sort((a, b) => {
    const aSym = a.symbol.replace(/\.(NS|BO)$/, '').toUpperCase();
    const bSym = b.symbol.replace(/\.(NS|BO)$/, '').toUpperCase();
    if (aSym === noSpace) return -1;
    if (bSym === noSpace) return 1;
    if (aSym.startsWith(noSpace) && !bSym.startsWith(noSpace)) return -1;
    if (!aSym.startsWith(noSpace) && bSym.startsWith(noSpace)) return 1;
    return 0;
  });

  return list.slice(0, 15);
}

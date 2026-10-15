import './style.css';
import type { WatchlistStock, StockInfo } from './types';
import { loadWatchlist, saveWatchlist, resetWatchlist, clearWatchlist } from './storage';
import { calculateBreadth, formatPrice } from './utils';
import { getStockSummaries, searchStock, formatPercent } from './api';

// ================= State =================
let watchlist: WatchlistStock[] = loadWatchlist();
let isSearching = false;
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let deferredPrompt: any = null;

// ================= DOM Elements =================
const greenWeightEl = document.getElementById('green-weight-val')!;
const redWeightEl = document.getElementById('red-weight-val')!;
const barGreenEl = document.getElementById('bar-green')!;
const barRedEl = document.getElementById('bar-red')!;
const barGreenText = document.getElementById('bar-green-text')!;
const barRedText = document.getElementById('bar-red-text')!;
const pillGreenText = document.getElementById('pill-green-text')!;
const pillRedText = document.getElementById('pill-red-text')!;
const pillTotalText = document.getElementById('pill-total-text')!;
const stockListContainer = document.getElementById('stock-list-container')!;
const emptyStateEl = document.getElementById('empty-state')!;
const watchlistCountEl = document.getElementById('watchlist-count')!;
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const searchDropdown = document.getElementById('search-dropdown')!;
const btnAddSearch = document.getElementById('btn-add-search')!;
const btnRefresh = document.getElementById('btn-refresh')!;
const refreshText = document.getElementById('refresh-text')!;
const btnResetSample = document.getElementById('btn-reset-sample')!;
const btnClearAll = document.getElementById('btn-clear-all')!;
const btnInstallPwa = document.getElementById('btn-install-pwa')!;
const lastSyncStatus = document.getElementById('last-sync-status')!;

// ================= Rendering Functions =================

/**
 * Updates the Top Breadth Bar with weighted green vs red counts and percentages.
 */
function renderBreadthBar(): void {
  const stats = calculateBreadth(watchlist);

  greenWeightEl.textContent = stats.weightedGreen.toString();
  redWeightEl.textContent = stats.weightedRed.toString();

  const total = stats.weightedGreen + stats.weightedRed;

  if (total === 0) {
    if (watchlist.length > 0) {
      // Stocks exist but all are flat (0.00% change)
      barGreenEl.style.width = '50%';
      barRedEl.style.width = '50%';
      barGreenText.textContent = '0';
      barRedText.textContent = '0';
    } else {
      barGreenEl.style.width = '50%';
      barRedEl.style.width = '50%';
      barGreenText.textContent = '-';
      barRedText.textContent = '-';
    }
  } else if (stats.weightedGreen === 0) {
    barGreenEl.style.width = '0%';
    barRedEl.style.width = '100%';
    barGreenText.textContent = '';
    barRedText.textContent = `${stats.redPercentage}%`;
  } else if (stats.weightedRed === 0) {
    barGreenEl.style.width = '100%';
    barRedEl.style.width = '0%';
    barGreenText.textContent = `${stats.greenPercentage}%`;
    barRedText.textContent = '';
  } else {
    barGreenEl.style.width = `${stats.greenPercentage}%`;
    barRedEl.style.width = `${stats.redPercentage}%`;
    barGreenText.textContent = `${stats.greenPercentage}%`;
    barRedText.textContent = `${stats.redPercentage}%`;
  }

  pillGreenText.textContent = `${stats.weightedGreen} Up (${stats.greenPercentage}%)`;
  pillRedText.textContent = `${stats.weightedRed} Down (${stats.redPercentage}%)`;
  pillTotalText.textContent = `${watchlist.length} Stocks (${total} Weighted)`;
  watchlistCountEl.textContent = watchlist.length.toString();
}

/**
 * Renders the list of watchlist stocks with interactive weight steppers.
 */
function renderWatchlist(): void {
  renderBreadthBar();

  if (watchlist.length === 0) {
    stockListContainer.innerHTML = '';
    emptyStateEl.style.display = 'block';
    return;
  }

  emptyStateEl.style.display = 'none';

  stockListContainer.innerHTML = watchlist
    .map((stock) => {
      const isUp = stock.rawPercent > 0;
      const isDown = stock.rawPercent < 0;
      const changeClass = isUp ? 'up' : isDown ? 'down' : 'neutral';
      const borderClass = isUp ? 'is-up' : isDown ? 'is-down' : 'is-neutral';
      const formattedPrice = formatPrice(stock.currentPrice, stock.currency);

      return `
      <div class="stock-card ${borderClass}" data-id="${stock.id}">
        <div class="stock-info">
          <div class="stock-symbol-row">
            <span class="stock-symbol">${escapeHtml(stock.symbol)}</span>
            ${stock.exchange ? `<span class="stock-badge">${escapeHtml(stock.exchange)}</span>` : ''}
          </div>
          <div class="stock-name" title="${escapeHtml(stock.fullName)}">
            ${escapeHtml(stock.fullName || stock.symbol)}
          </div>
        </div>

        <div class="stock-price-col">
          <div class="stock-price">${formattedPrice}</div>
          <span class="stock-change ${changeClass}">${escapeHtml(stock.changePercent)}</span>
        </div>

        <div class="stock-weight-col">
          <span class="weight-label-tag">Weight:</span>
          <div class="weight-stepper">
            <button class="step-btn btn-dec" data-id="${stock.id}" title="Decrease weight">−</button>
            <input
              type="number"
              class="weight-input"
              data-id="${stock.id}"
              value="${stock.weight}"
              min="0"
              step="1"
              aria-label="Weight for ${escapeHtml(stock.symbol)}"
            />
            <button class="step-btn btn-inc" data-id="${stock.id}" title="Increase weight">+</button>
          </div>
        </div>

        <button class="btn-remove" data-id="${stock.id}" title="Remove ${escapeHtml(stock.symbol)}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
    `;
    })
    .join('');

  attachWatchlistEventListeners();
}

/**
 * Attaches event listeners for weight steppers, numeric inputs, and remove buttons.
 */
function attachWatchlistEventListeners(): void {
  // Stepper increment
  stockListContainer.querySelectorAll('.btn-inc').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      const stock = watchlist.find((s) => s.id === id);
      if (stock) {
        stock.weight = (stock.weight || 0) + 1;
        saveAndSync();
        renderWatchlist();
      }
    });
  });

  // Stepper decrement
  stockListContainer.querySelectorAll('.btn-dec').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      const stock = watchlist.find((s) => s.id === id);
      if (stock && stock.weight > 0) {
        stock.weight = stock.weight - 1;
        saveAndSync();
        renderWatchlist();
      }
    });
  });

  // Direct numeric input change
  stockListContainer.querySelectorAll('.weight-input').forEach((input) => {
    input.addEventListener('change', (e) => {
      const target = e.currentTarget as HTMLInputElement;
      const id = target.getAttribute('data-id');
      const val = parseFloat(target.value);
      const stock = watchlist.find((s) => s.id === id);
      if (stock) {
        stock.weight = isNaN(val) || val < 0 ? 0 : Math.round(val);
        saveAndSync();
        renderWatchlist();
      }
    });

    // Real-time update on typing without losing focus
    input.addEventListener('input', (e) => {
      const target = e.currentTarget as HTMLInputElement;
      const id = target.getAttribute('data-id');
      const val = parseFloat(target.value);
      const stock = watchlist.find((s) => s.id === id);
      if (stock && !isNaN(val) && val >= 0) {
        stock.weight = Math.round(val);
        saveAndSync();
        renderBreadthBar();
      }
    });
  });

  // Remove button
  stockListContainer.querySelectorAll('.btn-remove').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      watchlist = watchlist.filter((s) => s.id !== id);
      saveAndSync();
      renderWatchlist();
    });
  });
}

/**
 * Saves current watchlist to localStorage and flashes saved status.
 */
function saveAndSync(): void {
  saveWatchlist(watchlist);
  if (lastSyncStatus) {
    lastSyncStatus.textContent = 'Saved to memory';
    setTimeout(() => {
      if (lastSyncStatus) lastSyncStatus.textContent = 'All memory saved';
    }, 2000);
  }
}

// ================= Stock Search & Add Logic =================

/**
 * Adds a stock to the watchlist.
 */
async function addStockToWatchlist(symbol: string, initialWeight = 1, knownInfo?: Partial<StockInfo>): Promise<void> {
  const cleanSym = symbol.trim().toUpperCase();
  if (!cleanSym) return;

  // Check if stock already exists in watchlist
  const existing = watchlist.find(
    (s) => s.symbol.toUpperCase() === cleanSym || s.id.toUpperCase() === cleanSym
  );
  if (existing) {
    existing.weight = (existing.weight || 0) + 1;
    saveAndSync();
    renderWatchlist();
    highlightExistingStock(existing.id);
    return;
  }

  // If known info is already provided (e.g. from search selection)
  if (knownInfo && knownInfo.currentPrice !== undefined) {
    const newStock: WatchlistStock = {
      id: cleanSym,
      symbol: cleanSym,
      fullName: knownInfo.fullName || cleanSym,
      currentPrice: knownInfo.currentPrice,
      changePercent: knownInfo.changePercent || '0.00%',
      rawPercent: knownInfo.rawPercent || 0,
      weight: initialWeight,
      currency: knownInfo.currency || 'INR',
      exchange: knownInfo.exchange,
      lastUpdated: Date.now(),
    };
    watchlist.unshift(newStock);
    saveAndSync();
    renderWatchlist();
    return;
  }

  // Otherwise fetch quote from API
  try {
    const quotes = await getStockSummaries([cleanSym]);
    const quote = quotes[0];

    const newStock: WatchlistStock = {
      id: cleanSym,
      symbol: quote ? quote.symbol : cleanSym,
      fullName: quote ? quote.fullName : cleanSym,
      currentPrice: quote ? quote.currentPrice : 100,
      changePercent: quote ? quote.changePercent : '0.00%',
      rawPercent: quote ? quote.rawPercent : 0,
      weight: initialWeight,
      currency: quote ? quote.currency : 'INR',
      exchange: quote ? quote.exchange : undefined,
      lastUpdated: Date.now(),
    };

    watchlist.unshift(newStock);
    saveAndSync();
    renderWatchlist();
  } catch (err) {
    console.error('Failed to add stock:', err);
  }
}

/**
 * Highlights a stock card when user tries to re-add it.
 */
function highlightExistingStock(id: string): void {
  const card = stockListContainer.querySelector(`[data-id="${id}"]`) as HTMLElement;
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    card.style.transition = 'background-color 0.3s ease';
    card.style.backgroundColor = 'var(--pastel-accent-bg)';
    setTimeout(() => {
      card.style.backgroundColor = '#ffffff';
    }, 1000);
  }
}

/**
 * Handles debounced search as user types in search input.
 */
function handleSearchInput(): void {
  const query = searchInput.value.trim();

  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }

  if (query.length < 1) {
    searchDropdown.classList.remove('active');
    searchDropdown.innerHTML = '';
    return;
  }

  searchDebounceTimer = setTimeout(async () => {
    isSearching = true;
    const results = await searchStock(query);
    isSearching = false;

    if (results.length === 0) {
      searchDropdown.innerHTML = `
        <div style="padding: 12px 16px; font-size: 0.8125rem; color: var(--text-muted); text-align: center;">
          No matching stocks found. Press <strong>Add Ticker</strong> to add anyway.
        </div>
      `;
      searchDropdown.classList.add('active');
      return;
    }

    searchDropdown.innerHTML = results
      .map((r) => {
        const isUp = r.rawPercent > 0;
        const isDown = r.rawPercent < 0;
        const changeClass = isUp ? 'up' : isDown ? 'down' : 'neutral';
        const formattedPrice = formatPrice(r.currentPrice, r.currency);

        return `
        <div class="search-result-item" data-sym="${escapeHtml(r.symbol)}" data-name="${escapeHtml(r.fullName)}" data-price="${r.currentPrice}" data-change="${escapeHtml(r.changePercent)}" data-raw="${r.rawPercent}" data-curr="${r.currency || 'INR'}" data-exch="${escapeHtml(r.exchange || '')}">
          <div class="result-info">
            <div class="result-sym-row">
              <span class="result-sym">${escapeHtml(r.symbol)}</span>
              ${r.exchange ? `<span class="result-exch">${escapeHtml(r.exchange)}</span>` : ''}
            </div>
            <span class="result-name">${escapeHtml(r.fullName)}</span>
          </div>
          <div class="result-right">
            <div class="result-price-box">
              <div class="result-price">${formattedPrice}</div>
              <span class="stock-change ${changeClass}">${escapeHtml(r.changePercent)}</span>
            </div>
            <button class="btn-mini-add">Add</button>
          </div>
        </div>
      `;
      })
      .join('');

    searchDropdown.classList.add('active');

    // Attach click events on dropdown items
    searchDropdown.querySelectorAll('.search-result-item').forEach((item) => {
      item.addEventListener('click', () => {
        const sym = item.getAttribute('data-sym')!;
        const fullName = item.getAttribute('data-name')!;
        const currentPrice = parseFloat(item.getAttribute('data-price') || '0');
        const changePercent = item.getAttribute('data-change') || '0.00%';
        const rawPercent = parseFloat(item.getAttribute('data-raw') || '0');
        const currency = item.getAttribute('data-curr') || 'INR';
        const exchange = item.getAttribute('data-exch') || '';

        addStockToWatchlist(sym, 1, {
          symbol: sym,
          fullName,
          currentPrice,
          changePercent,
          rawPercent,
          currency,
          exchange,
        });

        searchInput.value = '';
        searchDropdown.classList.remove('active');
      });
    });
  }, 220);
}

/**
 * Refreshes all quotes in the watchlist with live market data.
 */
async function refreshAllQuotes(): Promise<void> {
  if (watchlist.length === 0) return;

  btnRefresh.classList.add('spinning');
  refreshText.textContent = 'Updating...';

  try {
    const symbols = watchlist.map((s) => s.symbol);
    const updatedData = await getStockSummaries(symbols);

    const dataMap = new Map<string, StockInfo>();
    for (const d of updatedData) {
      dataMap.set(d.symbol.toUpperCase(), d);
    }

    watchlist = watchlist.map((stock) => {
      const fresh = dataMap.get(stock.symbol.toUpperCase());
      if (fresh) {
        return {
          ...stock,
          fullName: fresh.fullName || stock.fullName,
          currentPrice: fresh.currentPrice,
          changePercent: fresh.changePercent,
          rawPercent: fresh.rawPercent,
          currency: fresh.currency || stock.currency,
          exchange: fresh.exchange || stock.exchange,
          lastUpdated: Date.now(),
        };
      }
      return stock;
    });

    saveAndSync();
    renderWatchlist();
  } catch (err) {
    console.error('Failed to refresh quotes:', err);
  } finally {
    setTimeout(() => {
      btnRefresh.classList.remove('spinning');
      refreshText.textContent = 'Refresh';
    }, 400);
  }
}

// ================= Event Listeners =================

// Search input events
searchInput.addEventListener('input', handleSearchInput);
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const val = searchInput.value.trim();
    if (val) {
      addStockToWatchlist(val);
      searchInput.value = '';
      searchDropdown.classList.remove('active');
    }
  } else if (e.key === 'Escape') {
    searchDropdown.classList.remove('active');
  }
});

btnAddSearch.addEventListener('click', () => {
  const val = searchInput.value.trim();
  if (val) {
    addStockToWatchlist(val);
    searchInput.value = '';
    searchDropdown.classList.remove('active');
  }
});

// Close dropdown on outside click
document.addEventListener('click', (e) => {
  if (!searchDropdown.contains(e.target as Node) && e.target !== searchInput) {
    searchDropdown.classList.remove('active');
  }
});

// Quick add chips
document.querySelectorAll('.chip-btn').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    const sym = (e.currentTarget as HTMLElement).getAttribute('data-sym');
    if (sym) {
      addStockToWatchlist(sym);
    }
  });
});

// Header Refresh button
btnRefresh.addEventListener('click', () => {
  refreshAllQuotes();
});

// Reset Sample Watchlist (4:2 example)
btnResetSample.addEventListener('click', () => {
  if (confirm('Restore the default 4:2 sample watchlist (RELIANCE, TCS, NVDA, TSLA)?')) {
    watchlist = resetWatchlist();
    renderWatchlist();
    refreshAllQuotes();
  }
});

// Clear All Watchlist
btnClearAll.addEventListener('click', () => {
  if (confirm('Are you sure you want to clear your entire watchlist?')) {
    watchlist = clearWatchlist();
    renderWatchlist();
  }
});

// ================= PWA Registration =================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        console.log('[PWA] ServiceWorker registered successfully:', reg.scope);
      })
      .catch((err) => {
        console.log('[PWA] ServiceWorker registration failed:', err);
      });
  });
}

// PWA Install prompt handling
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (btnInstallPwa) {
    btnInstallPwa.style.display = 'inline-block';
    btnInstallPwa.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('[PWA] User install choice:', outcome);
        deferredPrompt = null;
        btnInstallPwa.style.display = 'none';
      }
    });
  }
});

// ================= Utility =================
function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ================= Initialization =================
renderWatchlist();

// Background initial refresh of quotes if watchlist exists
if (watchlist.length > 0) {
  setTimeout(() => {
    refreshAllQuotes();
  }, 300);
}

// Auto-refresh every 60 seconds when tab is active
setInterval(() => {
  if (document.visibilityState === 'visible' && watchlist.length > 0) {
    refreshAllQuotes();
  }
}, 60000);

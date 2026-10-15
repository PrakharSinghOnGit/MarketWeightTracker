import './style.css';
import type { WatchlistStock, StockInfo } from './types';
import { loadWatchlist, saveWatchlist, resetWatchlist, clearWatchlist } from './storage';
import { calculateBreadth, formatPrice, formatTimeAgo } from './utils';
import { getStockSummaries, searchStock } from './api';

// ================= State =================
let watchlist: WatchlistStock[] = loadWatchlist();
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let deferredPrompt: any = null;

// ================= DOM Elements =================
const greenWeightEl = document.getElementById('green-weight-val')!;
const redWeightEl = document.getElementById('red-weight-val')!;
const barGreenEl = document.getElementById('bar-green')!;
const barRedEl = document.getElementById('bar-red')!;
const barGreenText = document.getElementById('bar-green-text')!;
const barRedText = document.getElementById('bar-red-text')!;
const stockListContainer = document.getElementById('stock-list-container')!;
const emptyStateEl = document.getElementById('empty-state')!;
const btnRefresh = document.getElementById('btn-refresh')!;
const refreshText = document.getElementById('refresh-text')!;
const btnResetSample = document.getElementById('btn-reset-sample')!;
const btnClearAll = document.getElementById('btn-clear-all')!;
const btnInstallPwa = document.getElementById('btn-install-pwa')!;
const lastSyncStatus = document.getElementById('last-sync-status')!;

// Modal Elements
const btnOpenSearch = document.getElementById('btn-open-search')!;
const searchModal = document.getElementById('search-modal')!;
const btnCloseModal = document.getElementById('btn-close-modal')!;
const modalSearchInput = document.getElementById('modal-search-input') as HTMLInputElement;
const btnClearSearch = document.getElementById('btn-clear-search')!;
const modalSearchResults = document.getElementById('modal-search-results')!;

// ================= Rendering Functions =================

/**
 * Updates the Top Breadth Bar with weighted green vs red ratio.
 */
function renderBreadthBar(): void {
  const stats = calculateBreadth(watchlist);

  greenWeightEl.textContent = stats.weightedGreen.toString();
  redWeightEl.textContent = stats.weightedRed.toString();

  const total = stats.weightedGreen + stats.weightedRed;

  if (total === 0) {
    if (watchlist.length > 0) {
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
}

/**
 * Renders the watchlist items in an un-squeezed, spacious 2-row card layout.
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
      const indicatorClass = isUp ? 'is-up' : isDown ? 'is-down' : 'is-neutral';
      const formattedPrice = formatPrice(stock.currentPrice, stock.currency);
      const timeInfo = formatTimeAgo(stock.lastUpdated);

      return `
      <div class="stock-card" data-id="${stock.id}">
        <!-- Straight vertical indicator strip that stretches 100% of the card height -->
        <div class="card-indicator ${indicatorClass}"></div>

        <div class="card-body">
          <!-- Row 1: Symbol & Exchange on the Left | Price & Change Pill on the Right -->
          <div class="card-row-top">
            <div class="symbol-group">
              <span class="stock-symbol">${escapeHtml(stock.symbol)}</span>
              ${stock.exchange ? `<span class="stock-badge">${escapeHtml(stock.exchange)}</span>` : ''}
            </div>
            <div class="price-change-group">
              <span class="stock-price">${formattedPrice}</span>
              <span class="stock-change ${changeClass}">${escapeHtml(stock.changePercent)}</span>
            </div>
          </div>

          <!-- Row 2: Company Name + Time ago on the Left | Weight Stepper & Delete on the Right -->
          <div class="card-row-bottom">
            <div class="meta-group">
              <span class="stock-name" title="${escapeHtml(stock.fullName)}">${escapeHtml(stock.fullName || stock.symbol)}</span>
              <span class="meta-divider">•</span>
              <span class="time-counter-badge ${timeInfo.freshnessClass}" data-time-id="${stock.id}">
                <span class="time-dot"></span>
                <span class="time-text">${timeInfo.text}</span>
              </span>
            </div>
            <div class="actions-group">
              <div class="weight-control">
                <span class="weight-label">WT</span>
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
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    })
    .join('');

  attachWatchlistEventListeners();
}

/**
 * Updates all time counter badges dynamically without re-rendering the whole list.
 */
function updateAllTimeBadges(): void {
  for (const stock of watchlist) {
    const badge = stockListContainer.querySelector(`[data-time-id="${stock.id}"]`);
    if (badge) {
      const timeInfo = formatTimeAgo(stock.lastUpdated);
      const textSpan = badge.querySelector('.time-text');
      if (textSpan) textSpan.textContent = timeInfo.text;
      badge.className = `time-counter-badge ${timeInfo.freshnessClass}`;
    }
  }
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
 * Adds a selected stock to the watchlist.
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

  // If known info is already provided from search selection
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
 * Highlights a stock card when user re-adds or interacts with it.
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

// ================= Modal Logic =================

function openSearchModal(): void {
  searchModal.classList.add('open');
  searchModal.setAttribute('aria-hidden', 'false');
  modalSearchInput.value = '';
  modalSearchResults.innerHTML = `
    <div class="search-hint-message">
      Type a company name or ticker symbol to search...
    </div>
  `;
  setTimeout(() => {
    modalSearchInput.focus();
  }, 100);
}

function closeSearchModal(): void {
  searchModal.classList.remove('open');
  searchModal.setAttribute('aria-hidden', 'true');
  modalSearchInput.value = '';
}

function handleModalSearchInput(): void {
  const query = modalSearchInput.value.trim();

  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }

  if (query.length < 1) {
    modalSearchResults.innerHTML = `
      <div class="search-hint-message">
        Type a company name or ticker symbol to search...
      </div>
    `;
    return;
  }

  modalSearchResults.innerHTML = `
    <div class="search-hint-message">Searching...</div>
  `;

  searchDebounceTimer = setTimeout(async () => {
    const results = await searchStock(query);

    if (results.length === 0) {
      modalSearchResults.innerHTML = `
        <div class="search-hint-message">
          No matching stocks found for "<strong>${escapeHtml(query)}</strong>".
        </div>
      `;
      return;
    }

    modalSearchResults.innerHTML = results
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

    // Attach click events on dropdown items
    modalSearchResults.querySelectorAll('.search-result-item').forEach((item) => {
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

        closeSearchModal();
      });
    });
  }, 220);
}

/**
 * Refreshes all quotes in the watchlist with live market data and updates timestamps.
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

    const now = Date.now();
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
          lastUpdated: now,
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

// Modal open/close listeners
btnOpenSearch.addEventListener('click', openSearchModal);
btnCloseModal.addEventListener('click', closeSearchModal);

btnClearSearch.addEventListener('click', () => {
  modalSearchInput.value = '';
  modalSearchInput.focus();
  handleModalSearchInput();
});

modalSearchInput.addEventListener('input', handleModalSearchInput);

// Close modal on backdrop click
searchModal.addEventListener('click', (e) => {
  if (e.target === searchModal) {
    closeSearchModal();
  }
});

// ESC key closes modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && searchModal.classList.contains('open')) {
    closeSearchModal();
  }
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

// Check if launched from PWA shortcut (e.g. ?action=search)
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('action') === 'search') {
    setTimeout(openSearchModal, 400);
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

// Live ticker for time counter badges every 5 seconds
setInterval(() => {
  updateAllTimeBadges();
}, 5000);

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

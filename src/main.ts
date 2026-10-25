import './style.css';
import type { WatchlistStock, StockInfo } from './types';
import { loadWatchlist, saveWatchlist, resetWatchlist, clearWatchlist } from './storage';
import { calculateBreadth, formatPrice, formatTimeAgo } from './utils';
import { getStockSummaries, searchStock } from './api';

// ===== Platform Detection =====
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
const isStandalone =
  (window.navigator as any).standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches;

// ===== Application State =====
let watchlist: WatchlistStock[] = loadWatchlist();
let expandedId: string | null = null;
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let deferredPrompt: any = null;

// ===== DOM References =====
const appEl = document.getElementById('app')!;
const searchModal = document.getElementById('search-modal')!;
const modalSearchInput = document.getElementById('modal-search-input') as HTMLInputElement;
const btnCloseModal = document.getElementById('btn-close-modal')!;
const modalSearchResults = document.getElementById('modal-search-results')!;

// iOS Sheet DOM
const iosInstallModal = document.getElementById('ios-install-modal')!;
const btnCloseIosModal = document.getElementById('btn-close-ios-modal')!;

// Prevent iOS double-click zoom on interactive elements
document.addEventListener(
  'dblclick',
  (e) => {
    if ((e.target as HTMLElement).closest('.stock-card, button, input')) {
      e.preventDefault();
    }
  },
  { passive: false }
);

// ===== Helper Functions =====
function esc(s: string): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function tickerInitials(sym: string): string {
  const base = sym.replace(/\.(NS|BO)$/i, '');
  return base.slice(0, 2).toUpperCase();
}

function computeAbsChange(price: number, pct: number): string {
  if (!price || !pct) return '0.00';
  const prevClose = price / (1 + pct / 100);
  const absChange = price - prevClose;
  const sign = absChange >= 0 ? '+' : '';
  return `${sign}${absChange.toFixed(2)}`;
}

function saveAndSync(): void {
  saveWatchlist(watchlist);
}

// ===== Breadth Bar Calculator =====
function getBreadthDetails() {
  const stats = calculateBreadth(watchlist);
  const total = stats.greenCount + stats.redCount;

  let greenBar = 50;
  let redBar = 50;
  let sentimentText = 'Neutral';
  let sentimentClass = 'neutral';

  if (total > 0) {
    greenBar = stats.greenPercentage;
    redBar = stats.redPercentage;
    if (stats.greenCount > stats.redCount) {
      sentimentText = `Bullish (${greenBar}%)`;
      sentimentClass = 'bullish';
    } else if (stats.redCount > stats.greenCount) {
      sentimentText = `Bearish (${redBar}%)`;
      sentimentClass = 'bearish';
    } else {
      sentimentText = 'Balanced (50%)';
      sentimentClass = 'neutral';
    }
  } else if (watchlist.length === 0) {
    greenBar = 0;
    redBar = 0;
    sentimentText = 'Empty';
    sentimentClass = 'neutral';
  }

  return { stats, total, greenBar, redBar, sentimentText, sentimentClass };
}

// ===== Quick Header Breadth Synchronizer (without losing form focus) =====
function syncBreadthUI(): void {
  const { stats, total, greenBar, redBar, sentimentText, sentimentClass } = getBreadthDetails();

  const greenValEl = document.getElementById('green-ratio-val');
  const redValEl = document.getElementById('red-ratio-val');
  const barGreenEl = document.getElementById('bar-green-seg');
  const barRedEl = document.getElementById('bar-red-seg');
  const pillEl = document.getElementById('breadth-sentiment-pill');
  const pctSumEl = document.getElementById('breadth-pct-sum');

  if (greenValEl) greenValEl.textContent = stats.greenCount.toString();
  if (redValEl) redValEl.textContent = stats.redCount.toString();
  if (barGreenEl) barGreenEl.style.width = `${total > 0 ? greenBar : 50}%`;
  if (barRedEl) barRedEl.style.width = `${total > 0 ? redBar : 50}%`;
  if (pillEl) {
    pillEl.textContent = sentimentText;
    pillEl.className = `breadth-sentiment-pill ${sentimentClass}`;
  }
  if (pctSumEl) {
    pctSumEl.innerHTML = `<span class="pct-green-txt">${stats.greenPercentage}%</span> vs <span class="pct-red-txt">${stats.redPercentage}%</span>`;
  }
}

// ===== Main App Renderer =====
function render(): void {
  const { stats, total, greenBar, redBar, sentimentText, sentimentClass } = getBreadthDetails();

  const stocksHtml =
    watchlist.length === 0
      ? `<div class="empty-state">
           <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
             <path d="M3 3v18h18" />
             <path d="m19 9-5 5-4-4-3 3" />
           </svg>
           <div class="empty-state-title">Your watchlist is empty</div>
           <div class="empty-state-subtitle">Search ticker or name above to start tracking.</div>
         </div>`
      : watchlist
          .map((s) => {
            const up = s.rawPercent > 0;
            const down = s.rawPercent < 0;
            const cls = up ? 'up' : down ? 'down' : 'neutral';
            const avatarBg = up ? 'up-bg' : down ? 'down-bg' : 'neutral-bg';
            const isExpanded = expandedId === s.id;
            const price = formatPrice(s.currentPrice, s.currency);
            const absChg = computeAbsChange(s.currentPrice, s.rawPercent);
            const timeInfo = formatTimeAgo(s.lastUpdated);

            return `
        <div class="stock-card ${isExpanded ? 'expanded' : ''}" data-stock-card="${s.id}">
          <div class="stock-row" data-toggle-id="${s.id}">
            <div class="stock-avatar ${avatarBg}">
              ${tickerInitials(s.symbol)}
            </div>

            <div class="stock-details">
              <div class="stock-title-line">
                <span class="stock-ticker">${esc(s.symbol)}</span>
                ${s.exchange ? `<span class="stock-exchange">${esc(s.exchange)}</span>` : ''}
              </div>
              <div class="stock-name" title="${esc(s.fullName)}">${esc(s.fullName)}</div>
            </div>

            <div class="stock-quotes">
              <div class="stock-price">${price}</div>
              <div class="stock-change-row">
                <span class="stock-pct ${cls}">${esc(s.changePercent)}</span>
                <span class="stock-abs">${absChg}</span>
              </div>
            </div>
          </div>

          <div class="stock-drawer" data-drawer-for="${s.id}">
            <div class="drawer-content">
              <div class="time-badge ${timeInfo.freshnessClass}" data-time-id="${s.id}" title="Time elapsed since last quote update">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span class="time-text">${timeInfo.text}</span>
              </div>

              <button class="btn-remove" data-del="${s.id}" title="Remove stock from watchlist" aria-label="Remove stock">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18"/>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                </svg>
                Remove
              </button>
            </div>
          </div>
        </div>`;
          })
          .join('');

  appEl.innerHTML = `
    <div class="app-container">
      <!-- App Header -->
      <header class="app-header">
        <div class="brand">
          <div class="brand-logo" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 64 64" fill="none">
              <!-- Trending up arrow: clean financial trendline with arrowhead -->
              <path d="M 14 36 L 25 27 L 33 32 L 48 18" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M 38 18 L 48 18 L 48 28" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
              <!-- Bottom bar: half green (#10b981), half red (#ef4444), no text -->
              <g transform="translate(10, 48)">
                <clipPath id="logoPill">
                  <rect width="44" height="6" rx="3"/>
                </clipPath>
                <g clip-path="url(#logoPill)">
                  <rect x="0" y="0" width="21.5" height="6" fill="#10b981"/>
                  <rect x="22.5" y="0" width="21.5" height="6" fill="#ef4444"/>
                </g>
              </g>
            </svg>
          </div>
          <div class="brand-info">
            <h1 class="brand-title">Market Breadth Tracker</h1>
            <p class="brand-subtitle">Live stock breadth &amp; sentiment</p>
          </div>
        </div>
      </header>

      <!-- Search Section -->
      <div class="search-section">
        <div class="search-trigger-bar" id="search-trigger" role="button" tabindex="0" aria-label="Search and add stock">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.3-4.3"/>
          </svg>
          <span class="search-placeholder">Search stocks (e.g. Tata Steel, Adani, Reliance)...</span>
          <kbd class="search-kbd">/</kbd>
        </div>
        <button class="btn-refresh" id="btn-refresh" title="Refresh live quotes" aria-label="Refresh quotes">
          <svg class="refresh-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
            <path d="M16 21h5v-5"/>
          </svg>
        </button>
      </div>

      <!-- Top Breadth Bar Card -->
      <div class="breadth-card">
        <div class="breadth-top">
          <div class="breadth-left">
            <div class="breadth-title-row">
              <span class="breadth-tag">Market Breadth</span>
              <span class="breadth-sentiment-pill ${sentimentClass}" id="breadth-sentiment-pill">${sentimentText}</span>
            </div>
            <div class="breadth-ratio-row">
              <span class="ratio-val green" id="green-ratio-val">${stats.greenCount}</span>
              <span class="ratio-label-sm">Up</span>
              <span class="ratio-divider">:</span>
              <span class="ratio-val red" id="red-ratio-val">${stats.redCount}</span>
              <span class="ratio-label-sm">Down</span>
            </div>
          </div>
          <div class="breadth-right">
            <div class="breadth-pct-summary" id="breadth-pct-sum">
              <span class="pct-green-txt">${stats.greenPercentage}%</span> vs <span class="pct-red-txt">${stats.redPercentage}%</span>
            </div>
          </div>
        </div>

        <div class="breadth-bar-track">
          <div class="bar-green" id="bar-green-seg" style="width: ${total > 0 ? greenBar : 50}%"></div>
          <div class="bar-red" id="bar-red-seg" style="width: ${total > 0 ? redBar : 50}%"></div>
        </div>
      </div>

      <!-- Watchlist Section -->
      <section class="watchlist-section">
        <div class="watchlist-header">
          <span class="watchlist-title">Watchlist</span>
          <span class="watchlist-count">${watchlist.length} stock${watchlist.length === 1 ? '' : 's'}</span>
        </div>
        <div class="stock-list" id="stock-list">${stocksHtml}</div>
      </section>

      <!-- Footer Actions -->
      <div class="footer-actions">
        <button class="footer-btn" id="btn-reset">Restore Default</button>
        <span class="footer-sep">|</span>
        <button class="footer-btn danger" id="btn-clear">Clear Watchlist</button>
        <button class="install-btn" id="btn-install">📲 Install App</button>
      </div>
    </div>`;

  bindEvents();
}

// ===== Event Listeners =====
function bindEvents(): void {
  // Search Bar Trigger
  document.getElementById('search-trigger')?.addEventListener('click', openModal);

  // Refresh Button
  document.getElementById('btn-refresh')?.addEventListener('click', refreshAll);

  // Restore Default Sample
  document.getElementById('btn-reset')?.addEventListener('click', () => {
    if (confirm('Restore default watchlist with all 20 required stocks?')) {
      watchlist = resetWatchlist();
      expandedId = null;
      render();
      refreshAll();
    }
  });

  // Clear Watchlist
  document.getElementById('btn-clear')?.addEventListener('click', () => {
    if (confirm('Clear your entire watchlist?')) {
      watchlist = clearWatchlist();
      expandedId = null;
      render();
    }
  });

  // Install Button (Handles both iOS Safari & Android / Chrome PWA)
  const installBtn = document.getElementById('btn-install');
  if (installBtn) {
    if (isIOS && !isStandalone) {
      installBtn.style.display = 'inline-flex';
      installBtn.textContent = '📲 Add to Home Screen';
      installBtn.addEventListener('click', openIosModal);
    } else if (deferredPrompt) {
      installBtn.style.display = 'inline-flex';
      installBtn.textContent = '📲 Install App';
      installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          await deferredPrompt.userChoice;
          deferredPrompt = null;
          installBtn.style.display = 'none';
        }
      });
    }
  }

  // Stock Row Click (Accordion Toggle)
  document.querySelectorAll('[data-toggle-id]').forEach((row) => {
    row.addEventListener('click', (e) => {
      // If clicking inside drawer or delete button, do not toggle
      if ((e.target as HTMLElement).closest('.stock-drawer')) return;

      const id = row.getAttribute('data-toggle-id');
      expandedId = expandedId === id ? null : id;

      document.querySelectorAll('.stock-card').forEach((card) => {
        const cardId = card.getAttribute('data-stock-card');
        if (cardId === expandedId) {
          card.classList.add('expanded');
        } else {
          card.classList.remove('expanded');
        }
      });
    });
  });

  // Delete Stock
  document.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = (btn as HTMLElement).getAttribute('data-del')!;
      watchlist = watchlist.filter((x) => x.id !== id);
      if (expandedId === id) expandedId = null;
      saveAndSync();
      render();
    });
  });
}

// ===== Search Modal Management =====
function openModal(): void {
  searchModal.classList.add('open');
  searchModal.setAttribute('aria-hidden', 'false');
  modalSearchInput.value = '';
  modalSearchResults.innerHTML = `<div class="modal-hint">Type a ticker or company name (e.g. Tata Steel, Adani, Reliance)...</div>`;
  setTimeout(() => modalSearchInput.focus(), 60);
}

function closeModal(): void {
  searchModal.classList.remove('open');
  searchModal.setAttribute('aria-hidden', 'true');
}

function handleModalInput(): void {
  const q = modalSearchInput.value.trim();
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);

  if (q.length < 1) {
    modalSearchResults.innerHTML = `<div class="modal-hint">Type a ticker or company name (e.g. Tata Steel, Adani, Reliance)...</div>`;
    return;
  }

  modalSearchResults.innerHTML = `<div class="modal-hint">Searching markets...</div>`;

  searchDebounceTimer = setTimeout(async () => {
    const results = await searchStock(q);

    if (results.length === 0) {
      modalSearchResults.innerHTML = `<div class="modal-hint">No results found for "<strong>${esc(q)}</strong>"</div>`;
      return;
    }

    modalSearchResults.innerHTML = results
      .map((r) => {
        const cls = r.rawPercent > 0 ? 'up' : r.rawPercent < 0 ? 'down' : 'neutral';
        return `
        <div class="modal-result-row" data-sym="${esc(r.symbol)}" data-name="${esc(r.fullName)}" data-price="${r.currentPrice}" data-change="${esc(r.changePercent)}" data-raw="${r.rawPercent}" data-curr="${r.currency || 'INR'}" data-exch="${esc(r.exchange || '')}">
          <div class="mr-info">
            <div class="mr-title-line">
              <span class="mr-ticker">${esc(r.symbol)}</span>
              ${r.exchange ? `<span class="mr-exch">${esc(r.exchange)}</span>` : ''}
            </div>
            <div class="mr-name">${esc(r.fullName)}</div>
          </div>
          <div class="mr-quotes">
            <div class="mr-price">${formatPrice(r.currentPrice, r.currency)}</div>
            <div class="mr-pct ${cls}">${esc(r.changePercent)}</div>
          </div>
        </div>`;
      })
      .join('');

    // Bind click to add stock
    modalSearchResults.querySelectorAll('.modal-result-row').forEach((row) => {
      row.addEventListener('click', () => {
        addStock(row.getAttribute('data-sym')!, {
          symbol: row.getAttribute('data-sym')!,
          fullName: row.getAttribute('data-name')!,
          currentPrice: parseFloat(row.getAttribute('data-price')!),
          changePercent: row.getAttribute('data-change')!,
          rawPercent: parseFloat(row.getAttribute('data-raw')!),
          currency: row.getAttribute('data-curr')!,
          exchange: row.getAttribute('data-exch')!,
        });
        closeModal();
      });
    });
  }, 200);
}

// Modal event listeners
btnCloseModal.addEventListener('click', closeModal);
modalSearchInput.addEventListener('input', handleModalInput);

searchModal.addEventListener('click', (e) => {
  if (e.target === searchModal) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (searchModal.classList.contains('open')) closeModal();
    if (iosInstallModal?.classList.contains('open')) closeIosModal();
  }
  if (
    (e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) &&
    !searchModal.classList.contains('open') &&
    document.activeElement?.tagName !== 'INPUT'
  ) {
    e.preventDefault();
    openModal();
  }
});

// ===== iOS Install Modal Management =====
function openIosModal(): void {
  if (!iosInstallModal) return;
  iosInstallModal.classList.add('open');
  iosInstallModal.setAttribute('aria-hidden', 'false');
}

function closeIosModal(): void {
  if (!iosInstallModal) return;
  iosInstallModal.classList.remove('open');
  iosInstallModal.setAttribute('aria-hidden', 'true');
}

if (btnCloseIosModal) btnCloseIosModal.addEventListener('click', closeIosModal);
if (iosInstallModal) {
  iosInstallModal.addEventListener('click', (e) => {
    if (e.target === iosInstallModal) closeIosModal();
  });
}

// ===== Stock Addition Logic =====
async function addStock(symbol: string, info?: Partial<StockInfo>): Promise<void> {
  const sym = symbol.trim().toUpperCase();
  if (!sym) return;

  const existing = watchlist.find((s) => s.symbol.toUpperCase() === sym || s.id === sym);
  if (existing) {
    expandedId = existing.id;
    saveAndSync();
    render();
    return;
  }

  if (info && info.currentPrice !== undefined) {
    watchlist.unshift({
      id: sym,
      symbol: sym,
      fullName: info.fullName || sym,
      currentPrice: info.currentPrice,
      changePercent: info.changePercent || '0.00%',
      rawPercent: info.rawPercent || 0,
      weight: 1,
      currency: info.currency || 'INR',
      exchange: info.exchange,
      lastUpdated: Date.now(),
    });
  } else {
    const quotes = await getStockSummaries([sym]);
    const q = quotes[0];
    watchlist.unshift({
      id: sym,
      symbol: q?.symbol || sym,
      fullName: q?.fullName || sym,
      currentPrice: q?.currentPrice || 0,
      changePercent: q?.changePercent || '0.00%',
      rawPercent: q?.rawPercent || 0,
      weight: 1,
      currency: q?.currency || 'INR',
      exchange: q?.exchange,
      lastUpdated: Date.now(),
    });
  }

  expandedId = sym;
  saveAndSync();
  render();
}

// ===== Quotes Refresh Logic =====
async function refreshAll(): Promise<void> {
  if (watchlist.length === 0) return;
  const btn = document.getElementById('btn-refresh');
  btn?.classList.add('spinning');

  try {
    const data = await getStockSummaries(watchlist.map((s) => s.symbol));
    const map = new Map<string, StockInfo>();
    for (const d of data) map.set(d.symbol.toUpperCase(), d);

    const now = Date.now();
    watchlist = watchlist.map((s) => {
      const fresh = map.get(s.symbol.toUpperCase());
      return fresh
        ? {
            ...s,
            fullName: fresh.fullName || s.fullName,
            currentPrice: fresh.currentPrice,
            changePercent: fresh.changePercent,
            rawPercent: fresh.rawPercent,
            currency: fresh.currency || s.currency,
            exchange: fresh.exchange || s.exchange,
            lastUpdated: now,
          }
        : s;
    });

    saveAndSync();
    render();
  } catch (err) {
    console.error('[Refresh] Failed to refresh quotes:', err);
  } finally {
    setTimeout(() => {
      btn?.classList.remove('spinning');
    }, 500);
  }
}

// Update Relative Time Badges
function updateTimeBadges(): void {
  for (const s of watchlist) {
    const el = document.querySelector(`[data-time-id="${s.id}"]`);
    if (el) {
      const t = formatTimeAgo(s.lastUpdated);
      const textEl = el.querySelector('.time-text');
      if (textEl) textEl.textContent = t.text;
      el.className = `time-badge ${t.freshnessClass}`;
    }
  }
}

// ===== Unregister Service Worker to prevent interference with iOS PWA icons =====
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().then(() => {
        console.log('[PWA] ServiceWorker unregistered successfully');
      });
    }
  });
  if ('caches' in window) {
    caches.keys().then((keys) => {
      for (const key of keys) caches.delete(key);
    });
  }
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const installBtn = document.getElementById('btn-install');
  if (installBtn && !isIOS) {
    installBtn.style.display = 'inline-flex';
    installBtn.textContent = '📲 Install App';
  }
});

// ===== App Initialization =====
render();
if (watchlist.length > 0) {
  setTimeout(refreshAll, 300);
}

// Periodic background ticks
setInterval(updateTimeBadges, 5000);
setInterval(() => {
  if (document.visibilityState === 'visible' && watchlist.length > 0) {
    refreshAll();
  }
}, 45000);

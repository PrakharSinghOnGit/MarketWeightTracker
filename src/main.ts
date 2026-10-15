import './style.css';
import type { WatchlistStock, StockInfo } from './types';
import { loadWatchlist, saveWatchlist, resetWatchlist, clearWatchlist } from './storage';
import { calculateBreadth, formatPrice, formatTimeAgo } from './utils';
import { getStockSummaries, searchStock } from './api';

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
  const total = stats.weightedGreen + stats.weightedRed;

  let greenBar = 50;
  let redBar = 50;
  let sentimentText = 'Neutral';
  let sentimentClass = 'neutral';

  if (total > 0) {
    greenBar = stats.greenPercentage;
    redBar = stats.redPercentage;
    if (stats.weightedGreen > stats.weightedRed) {
      sentimentText = `Bullish (${greenBar}%)`;
      sentimentClass = 'bullish';
    } else if (stats.weightedRed > stats.weightedGreen) {
      sentimentText = `Bearish (${redBar}%)`;
      sentimentClass = 'bearish';
    } else {
      sentimentText = 'Balanced';
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

  if (greenValEl) greenValEl.textContent = stats.weightedGreen.toString();
  if (redValEl) redValEl.textContent = stats.weightedRed.toString();
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
                <span class="stock-weight-badge" data-badge-for="${s.id}">${s.weight}× wt</span>
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
              <div class="drawer-left">
                <div class="weight-control-group">
                  <span class="drawer-label">Weight</span>
                  <div class="weight-stepper">
                    <button class="step-btn" data-dec="${s.id}" title="Decrease weight" aria-label="Decrease weight">−</button>
                    <input type="number" class="weight-input" data-weight="${s.id}" value="${s.weight}" min="0" max="999" step="1" aria-label="Stock weight" />
                    <button class="step-btn" data-inc="${s.id}" title="Increase weight" aria-label="Increase weight">+</button>
                  </div>
                </div>

                <div class="time-badge ${timeInfo.freshnessClass}" data-time-id="${s.id}" title="Time elapsed since last quote update">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span class="time-text">${timeInfo.text}</span>
                </div>
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
            <svg width="24" height="24" viewBox="0 0 64 64" fill="none">
              <rect x="12" y="34" width="6" height="14" rx="2" fill="#34d399"/>
              <rect x="22" y="24" width="6" height="24" rx="2" fill="#34d399"/>
              <rect x="32" y="30" width="6" height="18" rx="2" fill="#f87171"/>
              <rect x="42" y="16" width="6" height="32" rx="2" fill="#34d399"/>
              <path d="M 12 36 Q 22 28 32 32 T 48 14" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="48" cy="14" r="3.5" fill="#ffffff"/>
            </svg>
          </div>
          <div class="brand-info">
            <h1 class="brand-title">Market Weight Tracker</h1>
            <p class="brand-subtitle">Live weighted breadth &amp; sentiment</p>
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
          <span class="search-placeholder">Search stocks (e.g. Reliance, TCS, AAPL)...</span>
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
              <span class="breadth-tag">Weighted Breadth</span>
              <span class="breadth-sentiment-pill ${sentimentClass}" id="breadth-sentiment-pill">${sentimentText}</span>
            </div>
            <div class="breadth-ratio-row">
              <span class="ratio-val green" id="green-ratio-val">${stats.weightedGreen}</span>
              <span class="ratio-label-sm">Up</span>
              <span class="ratio-divider">:</span>
              <span class="ratio-val red" id="red-ratio-val">${stats.weightedRed}</span>
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
        <button class="footer-btn" id="btn-reset">Restore Sample</button>
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
    if (confirm('Restore default sample watchlist (4:2 ratio)?')) {
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

  // PWA Install Button
  const installBtn = document.getElementById('btn-install');
  if (installBtn && deferredPrompt) {
    installBtn.style.display = 'inline-flex';
    installBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        installBtn.style.display = 'none';
      }
    });
  }

  // Stock Row Click (Accordion Toggle)
  document.querySelectorAll('[data-toggle-id]').forEach((row) => {
    row.addEventListener('click', (e) => {
      // If clicking inside drawer or buttons, do not toggle
      if ((e.target as HTMLElement).closest('.stock-drawer')) return;

      const id = row.getAttribute('data-toggle-id');
      expandedId = expandedId === id ? null : id;

      // Update expanded styling without tearing down inputs
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

  // Stepper: Increase weight
  document.querySelectorAll('[data-inc]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = (btn as HTMLElement).getAttribute('data-inc')!;
      const s = watchlist.find((x) => x.id === id);
      if (s) {
        s.weight++;
        saveAndSync();
        // Update input and badge directly
        const input = document.querySelector(`input[data-weight="${id}"]`) as HTMLInputElement;
        if (input) input.value = s.weight.toString();
        const badge = document.querySelector(`[data-badge-for="${id}"]`);
        if (badge) badge.textContent = `${s.weight}× wt`;
        syncBreadthUI();
      }
    });
  });

  // Stepper: Decrease weight
  document.querySelectorAll('[data-dec]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = (btn as HTMLElement).getAttribute('data-dec')!;
      const s = watchlist.find((x) => x.id === id);
      if (s && s.weight > 0) {
        s.weight--;
        saveAndSync();
        // Update input and badge directly
        const input = document.querySelector(`input[data-weight="${id}"]`) as HTMLInputElement;
        if (input) input.value = s.weight.toString();
        const badge = document.querySelector(`[data-badge-for="${id}"]`);
        if (badge) badge.textContent = `${s.weight}× wt`;
        syncBreadthUI();
      }
    });
  });

  // Numeric weight input
  document.querySelectorAll('.weight-input').forEach((input) => {
    input.addEventListener('click', (e) => e.stopPropagation());

    input.addEventListener('input', (e) => {
      e.stopPropagation();
      const el = e.target as HTMLInputElement;
      const id = el.getAttribute('data-weight')!;
      const val = parseInt(el.value, 10);
      const s = watchlist.find((x) => x.id === id);
      if (s && !isNaN(val) && val >= 0) {
        s.weight = val;
        saveAndSync();
        const badge = document.querySelector(`[data-badge-for="${id}"]`);
        if (badge) badge.textContent = `${s.weight}× wt`;
        syncBreadthUI();
      }
    });

    input.addEventListener('change', (e) => {
      e.stopPropagation();
      const el = e.target as HTMLInputElement;
      const id = el.getAttribute('data-weight')!;
      const val = parseInt(el.value, 10);
      const s = watchlist.find((x) => x.id === id);
      if (s) {
        s.weight = isNaN(val) || val < 0 ? 0 : val;
        el.value = s.weight.toString();
        saveAndSync();
        const badge = document.querySelector(`[data-badge-for="${id}"]`);
        if (badge) badge.textContent = `${s.weight}× wt`;
        syncBreadthUI();
      }
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
  modalSearchResults.innerHTML = `<div class="modal-hint">Type a ticker or company name to search across India &amp; US markets...</div>`;
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
    modalSearchResults.innerHTML = `<div class="modal-hint">Type a ticker or company name to search across India &amp; US markets...</div>`;
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

    modalSearchResults.querySelectorAll('.modal-result-row').forEach((row) => {
      row.addEventListener('click', () => {
        addStock(row.getAttribute('data-sym')!, 1, {
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
  }, 220);
}

// Modal event listeners
btnCloseModal.addEventListener('click', closeModal);
modalSearchInput.addEventListener('input', handleModalInput);

searchModal.addEventListener('click', (e) => {
  if (e.target === searchModal) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && searchModal.classList.contains('open')) {
    closeModal();
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

// ===== Stock Addition Logic =====
async function addStock(symbol: string, weight = 1, info?: Partial<StockInfo>): Promise<void> {
  const sym = symbol.trim().toUpperCase();
  if (!sym) return;

  const existing = watchlist.find((s) => s.symbol.toUpperCase() === sym || s.id === sym);
  if (existing) {
    existing.weight++;
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
      weight,
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
      weight,
      currency: q?.currency || 'INR',
      exchange: q?.exchange,
      lastUpdated: Date.now(),
    });
  }

  expandedId = sym; // Auto-expand new stock so user can adjust weight immediately
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
    console.error('[Refresh] Failed to update quotes:', err);
  } finally {
    setTimeout(() => document.getElementById('btn-refresh')?.classList.remove('spinning'), 450);
  }
}

// ===== Live Elapsed Time Updater =====
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

// ===== PWA Service Worker Registration =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => console.log('[PWA] ServiceWorker registered with scope:', reg.scope))
      .catch((err) => console.warn('[PWA] ServiceWorker registration failed:', err));
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const installBtn = document.getElementById('btn-install');
  if (installBtn) installBtn.style.display = 'inline-flex';
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
}, 60000);

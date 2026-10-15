# Market Breadth & Weight Tracker 📈

A clean, minimalist, white-theme web application with pastel colors to track live stock market breadth and weighted sentiment across your personal watchlist. Designed to run smoothly in any mobile or desktop browser, installable as a Progressive Web App (PWA), with persistent local memory and automated deployment via GitHub Pages.

**🌐 Live Demo:** [https://prakharsinghongit.github.io/MarketWeightTracker/](https://prakharsinghongit.github.io/MarketWeightTracker/)

---

## ✨ Features

- **📊 Top Weighted Breadth Ratio Bar:**
  - Displays the exact ratio of green (advancing) vs red (declining) stocks multiplied by their assigned weights.
  - *Example:* With 4 stocks (2 up, 2 down) and 1 up stock given a weight of 3 (others weight 1), the bar displays **`4 : 2`** (66.7% Green vs 33.3% Red).
  - Smooth animated pastel green and pastel red split bar.
- **🔍 Watchlist Maker & Instant Search:**
  - Search any ticker symbol or company name (e.g. `RELIANCE`, `TCS`, `INFY`, `HDFCBANK`, `AAPL`, `NVDA`).
  - Real-time dropdown suggestions with live prices, percentage changes, and 1-click addition.
  - Quick-add chips for popular Indian and global stocks.
- **⚖️ Editable Numeric Weight:**
  - Direct numeric input and convenient `+` / `−` steppers for each stock.
  - Changes immediately update the top ratio bar in real time.
- **🎨 Pastel & White Theme:**
  - Crisp pure white background (`#ffffff`) with soft, calming pastel green (`#86efac`) and pastel red (`#fca5a5`) accents.
  - Responsive design optimized for both smartphones and laptops.
- **📱 PWA Compatible:**
  - Offline-ready with Service Worker (`sw.js`).
  - Web App Manifest (`manifest.json`) for standalone mobile installation.
- **💾 Persistent Memory:**
  - Watchlist and customized weights automatically persist to `localStorage`.
  - Your watchlist is never lost when you leave and come back.
  - Background live quote refresh on return.
- **🚀 Automated Deployment:**
  - GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and deploys to GitHub Pages on every push.

---

## 🛠 Tech Stack

- **HTML5 & Vanilla TypeScript** (Fast, zero framework overhead, instant rendering)
- **Vite** (Next-gen frontend tooling)
- **CORS-Friendly Financial Scanner API** (Real-time live prices & changes for Indian & Global markets)
- **GitHub Actions & GitHub Pages** for automated CI/CD

---

## 💻 Local Development

```bash
# Clone the repository
git clone https://github.com/PrakharSinghOnGit/MarketWeightTracker.git
cd MarketWeightTracker

# Install dependencies
npm install --legacy-peer-deps

# Start local development server
npm run dev
```

Visit `http://localhost:3000/` or the URL printed by Vite.

---

## 📦 Building

```bash
# Compile and bundle for production
npm run build

# Preview production build locally
npm run preview
```

---

## 🚀 GitHub Pages Automation

The included GitHub Actions workflow at [`.github/workflows/deploy.yml`](file:///.github/workflows/deploy.yml) automatically triggers on push to `main`:
1. Checks out repository.
2. Installs dependencies via `npm ci --legacy-peer-deps`.
3. Runs `npm run build` to generate the `./dist` folder.
4. Uploads and deploys the static files directly to GitHub Pages.

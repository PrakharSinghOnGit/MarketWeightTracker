# Stock Market Breadth & Weightage Tracker 📈

A clean, fast, elder-friendly single-page React app to track live market breadth and weighted sentiment across your custom stock watchlist. Designed to run purely in the browser with zero backend, installable as a mobile PWA, and hosted for free on GitHub Pages.

**🌐 Live Demo:** [https://prakharsinghongit.github.io/MarketWeightTracker/](https://prakharsinghongit.github.io/MarketWeightTracker/)

---

## ✨ Features

- **👴 Elder-Friendly White UI:** High-contrast text, large readable fonts (18px–24px), comfortable 48px+ tap targets, and big `+` / `−` weight stepper buttons.
- **🔍 Instant Live Search Autocomplete:** Type any company name or ticker (e.g., *Tata*, *Reliance*, *Apple*, *HDFC*, *Nvidia*), and get live suggestions with real-time prices and percentage changes as you type.
- **📊 Real-Time Market Breadth Bar:** Prominent visual bar showing unweighted counts (e.g., 5 Up, 2 Down) and user-weighted percentage bullish/bearish sentiment with clear market mood badges (*"Market Strongly Bullish 🚀"*).
- **⏱ Auto-Refresh Controls:** Choose between [Pause, 1 min, 5 min, 15 min] with a live countdown timer. Automatically pauses when the browser tab is hidden to save network calls.
- **📱 PWA & Mobile-First:** Works cleanly on phones, desktop, or in a 350px Chrome Side Panel. Supports browser installation to iOS/Android home screens.
- **💾 Data Persistence & Portability:**
  - Automatically saves watchlist and weights to `localStorage`.
  - **Share Setup:** One-click button encodes watchlist into a shareable URL hash. Opening the link prompts the recipient to import the watchlist.
  - **Backup & Restore:** Download or upload watchlist as JSON.
- **🚀 Zero Backend:** Runs 100% in the frontend with CORS-friendly, low-latency live financial data for Indian (NSE/BSE) and US (NASDAQ/NYSE/AMEX) markets.

---

## 🛠 Tech Stack

- **React 19** (Functional components & Hooks)
- **Vite** & **TypeScript**
- **Tailwind CSS v4**
- **Lucide React Icons**
- **GitHub Actions & Pages** for CI/CD

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

Visit `http://localhost:5173/` in your browser.

---

## 📦 Building & Deployment

```bash
# Production build
npm run build

# Preview build locally
npm run preview
```

Every push to the `main` branch automatically builds and deploys the latest version to GitHub Pages via the included GitHub Actions workflow.

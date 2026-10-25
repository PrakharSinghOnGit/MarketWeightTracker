import type { WatchlistStock, BreadthStats } from './types';

/**
 * Calculates market breadth statistics (Advances vs Declines).
 * All stocks have equal weight (1).
 */
export function calculateBreadth(stocks: WatchlistStock[]): BreadthStats {
  let greenCount = 0;
  let redCount = 0;
  let neutralCount = 0;

  for (const s of stocks) {
    if (s.rawPercent > 0) {
      greenCount++;
    } else if (s.rawPercent < 0) {
      redCount++;
    } else {
      neutralCount++;
    }
  }

  const totalWeighted = greenCount + redCount;
  let greenPercentage = 50;
  let redPercentage = 50;

  if (totalWeighted > 0) {
    greenPercentage = Math.round((greenCount / totalWeighted) * 1000) / 10;
    redPercentage = Math.round((redCount / totalWeighted) * 1000) / 10;
  } else if (stocks.length > 0) {
    greenPercentage = 50;
    redPercentage = 50;
  } else {
    greenPercentage = 0;
    redPercentage = 0;
  }

  return {
    greenCount,
    redCount,
    neutralCount,
    weightedGreen: greenCount,
    weightedRed: redCount,
    weightedNeutral: neutralCount,
    totalWeighted,
    ratioString: `${greenCount} : ${redCount}`,
    greenPercentage,
    redPercentage,
  };
}

/**
 * Format currency price nicely based on symbol / currency
 */
export function formatPrice(price: number, currency: string = 'INR'): string {
  if (isNaN(price)) return '0.00';
  const symbol = currency === 'USD' ? '$' : '₹';
  return `${symbol}${price.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Formats elapsed time since last stock update.
 * Smart formatting in seconds, minutes, hours, days.
 * Returns a freshness class that progressively transitions to red as time increases.
 */
export function formatTimeAgo(timestamp?: number): { text: string; freshnessClass: string } {
  if (!timestamp || isNaN(timestamp)) {
    return { text: 'never', freshnessClass: 'freshness-old' };
  }

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  if (elapsedSeconds < 5) {
    return { text: 'just now', freshnessClass: 'freshness-fresh' };
  }
  if (elapsedSeconds < 60) {
    return { text: `${elapsedSeconds}s ago`, freshnessClass: 'freshness-fresh' };
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 5) {
    return { text: `${elapsedMinutes}m ago`, freshnessClass: 'freshness-recent' };
  }
  if (elapsedMinutes < 30) {
    return { text: `${elapsedMinutes}m ago`, freshnessClass: 'freshness-warm' };
  }
  if (elapsedMinutes < 60) {
    return { text: `${elapsedMinutes}m ago`, freshnessClass: 'freshness-stale' };
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return { text: `${elapsedHours}h ago`, freshnessClass: 'freshness-stale' };
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  return { text: `${elapsedDays}d ago`, freshnessClass: 'freshness-old' };
}

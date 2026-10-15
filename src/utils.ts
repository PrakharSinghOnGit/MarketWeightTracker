import type { WatchlistStock, BreadthStats } from './types';

/**
 * Calculates weighted green vs red breadth statistics.
 * If 2 stocks are up and 2 are down, and one up has weight 3 (other 1),
 * weightedGreen = 3 + 1 = 4
 * weightedRed = 1 + 1 = 2
 * ratioString = "4 : 2"
 */
export function calculateBreadth(stocks: WatchlistStock[]): BreadthStats {
  let greenCount = 0;
  let redCount = 0;
  let neutralCount = 0;
  let weightedGreen = 0;
  let weightedRed = 0;
  let weightedNeutral = 0;

  for (const s of stocks) {
    const weight = typeof s.weight === 'number' && s.weight >= 0 ? s.weight : 1;
    if (s.rawPercent > 0) {
      greenCount++;
      weightedGreen += weight;
    } else if (s.rawPercent < 0) {
      redCount++;
      weightedRed += weight;
    } else {
      neutralCount++;
      weightedNeutral += weight;
    }
  }

  const totalWeighted = weightedGreen + weightedRed;
  let greenPercentage = 50;
  let redPercentage = 50;

  if (totalWeighted > 0) {
    greenPercentage = Math.round((weightedGreen / totalWeighted) * 1000) / 10;
    redPercentage = Math.round((weightedRed / totalWeighted) * 1000) / 10;
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
    weightedGreen,
    weightedRed,
    weightedNeutral,
    totalWeighted,
    ratioString: `${weightedGreen} : ${weightedRed}`,
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

export interface StockInfo {
  symbol: string;
  fullName: string;
  currentPrice: number;
  changePercent: string;
  rawPercent: number;
  currency?: string;
  exchange?: string;
}

export interface WatchlistStock {
  id: string;
  symbol: string;
  fullName: string;
  currentPrice: number;
  changePercent: string;
  rawPercent: number;
  weight: number;
  currency?: string;
  exchange?: string;
  lastUpdated?: number;
}

export interface BreadthStats {
  greenCount: number;
  redCount: number;
  neutralCount: number;
  weightedGreen: number;
  weightedRed: number;
  weightedNeutral: number;
  totalWeighted: number;
  ratioString: string; // e.g. "4 : 2"
  greenPercentage: number;
  redPercentage: number;
}

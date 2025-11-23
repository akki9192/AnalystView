/**
 * Core market data type definitions
 * These types represent the fundamental data structures for financial markets
 */

/**
 * OHLCV (Open, High, Low, Close, Volume) candlestick data point
 */
export interface Candle {
  timestamp: number; // Unix timestamp in milliseconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Supported timeframe intervals
 */
export const Timeframe = {
  ONE_MINUTE: '1m',
  FIVE_MINUTES: '5m',
  FIFTEEN_MINUTES: '15m',
  THIRTY_MINUTES: '30m',
  ONE_HOUR: '1h',
  FOUR_HOURS: '4h',
  ONE_DAY: '1d',
  ONE_WEEK: '1w',
  ONE_MONTH: '1M',
} as const;

export type Timeframe = typeof Timeframe[keyof typeof Timeframe];

/**
 * Market symbol information
 */
export interface Symbol {
  symbol: string; // e.g., "AAPL", "BTC-USD"
  name: string; // Full name
  exchange: string; // Exchange identifier
  type: 'stock' | 'crypto' | 'forex' | 'commodity' | 'index';
  currency?: string; // Quote currency
}

/**
 * Market data series containing candles and metadata
 */
export interface MarketDataSeries {
  symbol: Symbol;
  timeframe: Timeframe;
  candles: Candle[];
  lastUpdate: number; // Timestamp of last data update
}

/**
 * Price range for a given dataset
 */
export interface PriceRange {
  min: number;
  max: number;
}

/**
 * Time range for chart display
 */
export interface TimeRange {
  start: number; // Unix timestamp
  end: number; // Unix timestamp
}

/**
 * Visible chart range (what's currently displayed)
 */
export interface ChartRange {
  timeRange: TimeRange;
  priceRange: PriceRange;
  startIndex: number; // Index of first visible candle
  endIndex: number; // Index of last visible candle
}

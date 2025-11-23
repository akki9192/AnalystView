/**
 * Chart calculation utilities
 * Mathematical functions for chart rendering and analysis
 */

import type {
  Candle,
  PriceRange,
  TimeRange,
  ChartRange,
  ChartDimensions,
  ChartSettings,
  ChartTransform,
  CoordinateMapper,
} from '../types';

/**
 * Calculate price range from candles
 */
export function calculatePriceRange(
  candles: Candle[],
  startIndex: number,
  endIndex: number,
  padding: number = 0.05
): PriceRange {
  if (candles.length === 0 || startIndex >= candles.length) {
    return { min: 0, max: 100 };
  }

  const validEnd = Math.min(endIndex, candles.length - 1);
  const visibleCandles = candles.slice(startIndex, validEnd + 1);

  let min = Infinity;
  let max = -Infinity;

  visibleCandles.forEach((candle) => {
    min = Math.min(min, candle.low);
    max = Math.max(max, candle.high);
  });

  // Add padding
  const range = max - min;
  const paddingAmount = range * padding;

  return {
    min: min - paddingAmount,
    max: max + paddingAmount,
  };
}

/**
 * Calculate time range from candles
 */
export function calculateTimeRange(
  candles: Candle[],
  startIndex: number,
  endIndex: number
): TimeRange {
  if (candles.length === 0) {
    const now = Date.now();
    return { start: now - 86400000, end: now };
  }

  const validStart = Math.max(0, Math.min(startIndex, candles.length - 1));
  const validEnd = Math.max(0, Math.min(endIndex, candles.length - 1));

  return {
    start: candles[validStart].timestamp,
    end: candles[validEnd].timestamp,
  };
}

/**
 * Calculate visible chart range
 */
export function calculateChartRange(
  candles: Candle[],
  transform: ChartTransform,
  dimensions: ChartDimensions,
  settings: ChartSettings
): ChartRange {
  if (candles.length === 0) {
    return {
      timeRange: { start: 0, end: 0 },
      priceRange: { min: 0, max: 100 },
      startIndex: 0,
      endIndex: 0,
    };
  }

  const candleWidth = settings.candleWidth + settings.candleSpacing;
  const maxVisibleCandles = Math.floor(dimensions.chartWidth / candleWidth);

  // Calculate which candles are visible
  const offsetCandles = Math.floor(transform.offsetX / candleWidth);
  const endIndex = Math.max(0, candles.length - 1 - offsetCandles);
  const startIndex = Math.max(0, endIndex - maxVisibleCandles + 1);

  const timeRange = calculateTimeRange(candles, startIndex, endIndex);
  const priceRange = calculatePriceRange(candles, startIndex, endIndex);

  return {
    timeRange,
    priceRange,
    startIndex,
    endIndex,
  };
}

/**
 * Create coordinate mapper for converting between chart and canvas space
 */
export function createCoordinateMapper(
  candles: Candle[],
  dimensions: ChartDimensions,
  range: ChartRange,
  settings: ChartSettings
): CoordinateMapper {
  const { chartWidth, priceChartHeight } = dimensions;
  const { priceRange, timeRange, startIndex, endIndex: _endIndex } = range;
  const candleWidth = settings.candleWidth + settings.candleSpacing;

  /**
   * Linear interpolation
   */
  const lerp = (value: number, inMin: number, inMax: number, outMin: number, outMax: number): number => {
    return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
  };

  /**
   * Logarithmic scale conversion
   */
  const logScale = (value: number, min: number, max: number, outMin: number, outMax: number): number => {
    const logMin = Math.log(min);
    const logMax = Math.log(max);
    const logValue = Math.log(value);
    return lerp(logValue, logMin, logMax, outMin, outMax);
  };

  return {
    timeToX: (timestamp: number): number => {
      // Find the candle index for this timestamp
      const index = candles.findIndex((c) => c.timestamp >= timestamp);
      if (index === -1) return chartWidth;

      const relativeIndex = index - startIndex;
      return relativeIndex * candleWidth + candleWidth / 2;
    },

    xToTime: (x: number): number => {
      const index = Math.floor(x / candleWidth) + startIndex;
      if (index < 0 || index >= candles.length) {
        return lerp(x, 0, chartWidth, timeRange.start, timeRange.end);
      }
      return candles[index].timestamp;
    },

    priceToY: (price: number): number => {
      if (settings.logScale && priceRange.min > 0) {
        return logScale(price, priceRange.min, priceRange.max, priceChartHeight, 0);
      }
      return lerp(price, priceRange.min, priceRange.max, priceChartHeight, 0);
    },

    yToPrice: (y: number): number => {
      if (settings.logScale && priceRange.min > 0) {
        const logMin = Math.log(priceRange.min);
        const logMax = Math.log(priceRange.max);
        const logValue = lerp(y, priceChartHeight, 0, logMin, logMax);
        return Math.exp(logValue);
      }
      return lerp(y, priceChartHeight, 0, priceRange.min, priceRange.max);
    },

    chartToCanvas: (point) => ({
      x: candles.findIndex((c) => c.timestamp >= point.timestamp) - startIndex * candleWidth,
      y: settings.logScale && priceRange.min > 0
        ? logScale(point.price, priceRange.min, priceRange.max, priceChartHeight, 0)
        : lerp(point.price, priceRange.min, priceRange.max, priceChartHeight, 0),
    }),

    canvasToChart: (point) => {
      const index = Math.floor(point.x / candleWidth) + startIndex;
      const timestamp =
        index >= 0 && index < candles.length
          ? candles[index].timestamp
          : lerp(point.x, 0, chartWidth, timeRange.start, timeRange.end);

      let price: number;
      if (settings.logScale && priceRange.min > 0) {
        const logMin = Math.log(priceRange.min);
        const logMax = Math.log(priceRange.max);
        const logValue = lerp(point.y, priceChartHeight, 0, logMin, logMax);
        price = Math.exp(logValue);
      } else {
        price = lerp(point.y, priceChartHeight, 0, priceRange.min, priceRange.max);
      }

      return { timestamp, price };
    },

    xToCandleIndex: (x: number): number => {
      return Math.floor(x / candleWidth) + startIndex;
    },

    candleIndexToX: (index: number): number => {
      const relativeIndex = index - startIndex;
      return relativeIndex * candleWidth + candleWidth / 2;
    },
  };
}

/**
 * Format price for display
 */
export function formatPrice(price: number, decimals: number = 2): string {
  return price.toFixed(decimals);
}

/**
 * Format volume for display
 */
export function formatVolume(volume: number): string {
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`;
  return volume.toFixed(0);
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: number, timeframe: string): string {
  const date = new Date(timestamp);

  if (timeframe.includes('m') || timeframe.includes('h')) {
    // Intraday: show time
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } else if (timeframe === '1d') {
    // Daily: show date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } else {
    // Weekly/Monthly: show month and year
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  }
}

/**
 * Gann analysis calculation utilities
 * Mathematical functions for Gann angles and time/price squares
 *
 * IMPORTANT: Gann angles are NOT simple geometric angles. They represent
 * price/time relationships and require proper scaling to work correctly.
 */

import { GannRatio } from '../types';
import type { ChartPoint } from '../types';

/**
 * Gann ratio numeric values
 * Represents the slope: price units per time unit
 */
export const GANN_RATIO_VALUES: Record<GannRatio, number> = {
  [GannRatio.EIGHT_BY_ONE]: 8,
  [GannRatio.FOUR_BY_ONE]: 4,
  [GannRatio.THREE_BY_ONE]: 3,
  [GannRatio.TWO_BY_ONE]: 2,
  [GannRatio.ONE_BY_ONE]: 1,
  [GannRatio.ONE_BY_TWO]: 0.5,
  [GannRatio.ONE_BY_THREE]: 1 / 3,
  [GannRatio.ONE_BY_FOUR]: 0.25,
  [GannRatio.ONE_BY_EIGHT]: 0.125,
};

/**
 * Calculate price/time scale for 1x1 angle
 *
 * The 1x1 angle should represent equal price and time units.
 * This is Gann's "square of price and time"
 *
 * Methods:
 * 1. 'price': Base on price range (1 price unit = 1 time unit)
 * 2. 'time': Base on time range
 * 3. 'manual': User-defined scale
 *
 * @param priceRange - Total price range visible
 * @param timeRange - Total time range visible (in milliseconds)
 * @param method - Scaling method
 * @param manualScale - Manual scale value if method is 'manual'
 */
export function calculateGannScale(
  priceRange: number,
  timeRange: number,
  method: 'price' | 'time' | 'manual' = 'price',
  manualScale?: number
): { priceScale: number; timeScale: number } {
  if (method === 'manual' && manualScale) {
    return {
      priceScale: manualScale,
      timeScale: 1,
    };
  }

  // Convert time range from milliseconds to days for more intuitive scaling
  const timeRangeDays = timeRange / (1000 * 60 * 60 * 24);

  if (method === 'price') {
    // Scale based on price range
    // 1 price unit = 1 day
    return {
      priceScale: priceRange / timeRangeDays,
      timeScale: 1,
    };
  } else {
    // Scale based on time range
    // Make the range square
    return {
      priceScale: 1,
      timeScale: timeRangeDays / priceRange,
    };
  }
}

/**
 * Calculate a point on a Gann angle line
 *
 * @param origin - Starting point of the angle
 * @param ratio - Gann ratio (1x1, 2x1, etc.)
 * @param direction - 'up' for rising angle, 'down' for falling angle
 * @param timeOffset - Time offset from origin (in milliseconds)
 * @param priceScale - Price units per time unit for 1x1 angle
 * @param timeScale - Time scale adjustment factor
 */
export function calculateGannPoint(
  origin: ChartPoint,
  ratio: GannRatio,
  direction: 'up' | 'down',
  timeOffset: number,
  priceScale: number,
  timeScale: number = 1
): ChartPoint {
  const slope = GANN_RATIO_VALUES[ratio];

  // Convert time offset to days
  const timeInDays = timeOffset / (1000 * 60 * 60 * 24);

  // Calculate price change
  const priceChange = slope * priceScale * timeInDays * timeScale;

  // Apply direction
  const finalPriceChange = direction === 'up' ? priceChange : -priceChange;

  return {
    timestamp: origin.timestamp + timeOffset,
    price: origin.price + finalPriceChange,
  };
}

/**
 * Calculate all points for a Gann angle across the visible range
 *
 * @param origin - Starting point
 * @param ratio - Gann ratio
 * @param direction - Trend direction
 * @param startTime - Start of visible range
 * @param endTime - End of visible range
 * @param priceScale - Price scale factor
 * @param timeScale - Time scale factor
 * @returns Array of points defining the angle line
 */
export function calculateGannAngleLine(
  origin: ChartPoint,
  ratio: GannRatio,
  direction: 'up' | 'down',
  startTime: number,
  endTime: number,
  priceScale: number,
  timeScale: number = 1
): ChartPoint[] {
  const points: ChartPoint[] = [];

  // Calculate point at start of range
  if (startTime < origin.timestamp) {
    // Extend backward
    const backwardOffset = startTime - origin.timestamp;
    points.push(
      calculateGannPoint(origin, ratio, direction, backwardOffset, priceScale, timeScale)
    );
  } else {
    // Start from a point after origin
    const forwardOffset = startTime - origin.timestamp;
    points.push(
      calculateGannPoint(origin, ratio, direction, forwardOffset, priceScale, timeScale)
    );
  }

  // Add origin if it's in range
  if (origin.timestamp >= startTime && origin.timestamp <= endTime) {
    points.push(origin);
  }

  // Calculate point at end of range
  const endOffset = endTime - origin.timestamp;
  points.push(
    calculateGannPoint(origin, ratio, direction, endOffset, priceScale, timeScale)
  );

  return points.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Calculate Gann square levels
 *
 * Gann squares are price levels based on mathematical relationships
 * with the base price (usually a significant high or low)
 *
 * @param basePrice - Base price level (significant high/low)
 * @param numLevels - Number of levels to calculate
 * @returns Array of price levels
 */
export function calculateGannSquareLevels(
  basePrice: number,
  numLevels: number = 9
): number[] {
  const levels: number[] = [];

  for (let i = 1; i <= numLevels; i++) {
    // Square root method
    const sqrt = Math.sqrt(basePrice);
    levels.push(Math.pow(sqrt + i, 2));
    levels.push(Math.pow(sqrt - i, 2));
  }

  return levels.filter((level) => level > 0).sort((a, b) => a - b);
}

/**
 * Calculate natural price increments for Gann analysis
 *
 * Gann emphasized certain "natural" price increments based on
 * geometric and mathematical principles
 *
 * @param price - Current price
 * @returns Suggested price increment for analysis
 */
export function calculateNaturalIncrement(price: number): number {
  // Use powers of 10 adjusted to price magnitude
  const magnitude = Math.floor(Math.log10(price));
  const baseIncrement = Math.pow(10, magnitude - 1);

  // Common Gann increments: 1, 2, 3, 5
  if (price / baseIncrement < 20) return baseIncrement;
  if (price / baseIncrement < 50) return baseIncrement * 2;
  return baseIncrement * 5;
}

/**
 * Validate if a price/time point creates a proper Gann square
 *
 * A Gann square occurs when price and time are in harmony
 * (equal in terms of the chosen scale)
 *
 * @param origin - Starting point
 * @param point - Point to validate
 * @param priceScale - Price scale factor
 * @param tolerance - Tolerance for "squareness" (0-1, where 0 is perfect)
 */
export function isGannSquare(
  origin: ChartPoint,
  point: ChartPoint,
  priceScale: number,
  tolerance: number = 0.05
): boolean {
  const timeSpan = (point.timestamp - origin.timestamp) / (1000 * 60 * 60 * 24); // in days
  const priceSpan = Math.abs(point.price - origin.price);

  const scaledPriceSpan = priceSpan / priceScale;

  // Check if time and scaled price are approximately equal
  const ratio = Math.min(timeSpan, scaledPriceSpan) / Math.max(timeSpan, scaledPriceSpan);

  return ratio >= (1 - tolerance);
}

/**
 * TODO: Placeholder for advanced Gann cycle calculations
 *
 * These will be implemented in Phase 2:
 * - Gann's 360-degree circle (price/time wheel)
 * - Harmonic price levels
 * - Time cycles and recurring dates
 * - Square of 9 calculations
 */
export function calculateGannCycles(_basePrice: number, _baseDate: Date): any {
  // Placeholder for future implementation
  return {
    priceCycles: [],
    timeCycles: [],
    harmonicLevels: [],
  };
}

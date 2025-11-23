/**
 * Tool Factory
 * Creates new drawing tool instances
 */

import type {
  TrendLine,
  HorizontalLine,
  VerticalLine,
  GannAngles,
  FibonacciRetracement,
  ChartPoint,
  GannAngle,
  FibonacciLevel,
} from '../../types';
import { GannRatio as GannRatioEnum } from '../../types';

/**
 * Generate unique ID for tools
 */
function generateId(): string {
  return `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Default Gann angles configuration
 */
const DEFAULT_GANN_ANGLES: GannAngle[] = [
  {
    ratio: GannRatioEnum.EIGHT_BY_ONE,
    enabled: false,
    style: { color: '#8b5cf6', width: 1, lineStyle: 'solid', opacity: 0.6 },
  },
  {
    ratio: GannRatioEnum.FOUR_BY_ONE,
    enabled: true,
    style: { color: '#3b82f6', width: 1, lineStyle: 'solid', opacity: 0.7 },
  },
  {
    ratio: GannRatioEnum.TWO_BY_ONE,
    enabled: true,
    style: { color: '#10b981', width: 1, lineStyle: 'solid', opacity: 0.8 },
  },
  {
    ratio: GannRatioEnum.ONE_BY_ONE,
    enabled: true,
    style: { color: '#f59e0b', width: 2, lineStyle: 'solid', opacity: 1.0 },
  },
  {
    ratio: GannRatioEnum.ONE_BY_TWO,
    enabled: true,
    style: { color: '#10b981', width: 1, lineStyle: 'solid', opacity: 0.8 },
  },
  {
    ratio: GannRatioEnum.ONE_BY_FOUR,
    enabled: true,
    style: { color: '#3b82f6', width: 1, lineStyle: 'solid', opacity: 0.7 },
  },
  {
    ratio: GannRatioEnum.ONE_BY_EIGHT,
    enabled: false,
    style: { color: '#8b5cf6', width: 1, lineStyle: 'solid', opacity: 0.6 },
  },
];

/**
 * Default Fibonacci levels
 */
const DEFAULT_FIBONACCI_LEVELS: FibonacciLevel[] = [
  {
    ratio: 0.0,
    enabled: true,
    style: { color: '#6b7280', width: 1, lineStyle: 'solid', opacity: 0.8 },
    label: '0.0%',
  },
  {
    ratio: 0.236,
    enabled: true,
    style: { color: '#f59e0b', width: 1, lineStyle: 'solid', opacity: 0.8 },
    label: '23.6%',
  },
  {
    ratio: 0.382,
    enabled: true,
    style: { color: '#10b981', width: 1, lineStyle: 'solid', opacity: 0.8 },
    label: '38.2%',
  },
  {
    ratio: 0.5,
    enabled: true,
    style: { color: '#3b82f6', width: 2, lineStyle: 'solid', opacity: 1.0 },
    label: '50.0%',
  },
  {
    ratio: 0.618,
    enabled: true,
    style: { color: '#10b981', width: 1, lineStyle: 'solid', opacity: 0.8 },
    label: '61.8%',
  },
  {
    ratio: 0.786,
    enabled: true,
    style: { color: '#f59e0b', width: 1, lineStyle: 'solid', opacity: 0.8 },
    label: '78.6%',
  },
  {
    ratio: 1.0,
    enabled: true,
    style: { color: '#6b7280', width: 1, lineStyle: 'solid', opacity: 0.8 },
    label: '100.0%',
  },
];

export class ToolFactory {
  /**
   * Create a trendline
   */
  static createTrendLine(start: ChartPoint, end: ChartPoint): TrendLine {
    return {
      id: generateId(),
      type: 'trendline',
      points: [start, end],
      extend: false,
      style: { color: '#3b82f6', width: 2, lineStyle: 'solid' },
      locked: false,
      visible: true,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };
  }

  /**
   * Create a horizontal line
   */
  static createHorizontalLine(price: number, timestamp: number): HorizontalLine {
    return {
      id: generateId(),
      type: 'horizontal_line',
      points: [{ price, timestamp }],
      style: { color: '#ef4444', width: 1, lineStyle: 'dashed' },
      locked: false,
      visible: true,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };
  }

  /**
   * Create a vertical line
   */
  static createVerticalLine(timestamp: number, price: number): VerticalLine {
    return {
      id: generateId(),
      type: 'vertical_line',
      points: [{ timestamp, price }],
      style: { color: '#8b5cf6', width: 1, lineStyle: 'dashed' },
      locked: false,
      visible: true,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };
  }

  /**
   * Create Gann angles
   */
  static createGannAngles(
    origin: ChartPoint,
    direction: 'up' | 'down' = 'up',
    priceScale: number = 1.0
  ): GannAngles {
    return {
      id: generateId(),
      type: 'gann_angles',
      points: [origin],
      direction,
      angles: JSON.parse(JSON.stringify(DEFAULT_GANN_ANGLES)), // Deep copy
      priceScale,
      timeScale: 1.0,
      squareMode: 'price',
      style: { color: '#f59e0b', width: 1, lineStyle: 'solid' },
      locked: false,
      visible: true,
      name: 'Gann Fan',
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };
  }

  /**
   * Create Fibonacci retracement
   */
  static createFibonacciRetracement(
    start: ChartPoint,
    end: ChartPoint
  ): FibonacciRetracement {
    return {
      id: generateId(),
      type: 'fibonacci_retracement',
      points: [start, end],
      levels: JSON.parse(JSON.stringify(DEFAULT_FIBONACCI_LEVELS)), // Deep copy
      showLabels: true,
      extendLines: false,
      style: { color: '#3b82f6', width: 1, lineStyle: 'solid' },
      locked: false,
      visible: true,
      name: 'Fibonacci Retracement',
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };
  }
}

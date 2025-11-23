/**
 * Tool Factory
 * Creates new drawing tool instances
 */

import type {
  TrendLine,
  HorizontalLine,
  VerticalLine,
  GannAngles,
  ChartPoint,
  GannAngle,
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
}

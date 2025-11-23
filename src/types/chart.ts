/**
 * Chart display and rendering type definitions
 */

import type { Candle, ChartRange } from './market';
import type { CanvasPoint, ChartPoint } from './tools';

/**
 * Chart theme configuration
 */
export interface ChartTheme {
  mode: 'light' | 'dark';
  background: string;
  gridColor: string;
  textColor: string;
  crosshairColor: string;
  candleUp: string;
  candleDown: string;
  volumeUp: string;
  volumeDown: string;
  wickColor: string;
}

/**
 * Chart display settings
 */
export interface ChartSettings {
  showVolume: boolean;
  showGrid: boolean;
  showCrosshair: boolean;
  candleWidth: number; // Width in pixels
  candleSpacing: number; // Space between candles in pixels
  priceAxisWidth: number; // Width of price axis in pixels
  timeAxisHeight: number; // Height of time axis in pixels
  volumeHeightRatio: number; // Volume panel height as ratio of chart height (0-1)
  autoScale: boolean; // Auto-scale price axis to visible data
  logScale: boolean; // Logarithmic price scale
}

/**
 * Chart viewport dimensions
 */
export interface ChartDimensions {
  width: number;
  height: number;
  chartWidth: number; // Width excluding price axis
  chartHeight: number; // Height excluding time axis
  volumeHeight: number; // Height of volume panel
  priceChartHeight: number; // Height of main price chart
  priceAxisWidth: number; // Width of price axis
  timeAxisHeight: number; // Height of time axis
}

/**
 * Chart zoom and pan state
 */
export interface ChartTransform {
  scale: number; // Zoom level (1.0 = default)
  offsetX: number; // Horizontal pan offset in pixels
  candlesVisible: number; // Number of candles visible on screen
}

/**
 * Crosshair information display
 */
export interface CrosshairData {
  candle: Candle | null;
  price: number;
  timestamp: number;
  canvasPoint: CanvasPoint;
  chartPoint: ChartPoint;
}

/**
 * Coordinate transformation functions
 * These convert between chart space (price/time) and canvas space (pixels)
 */
export interface CoordinateMapper {
  /**
   * Convert timestamp to x-coordinate on canvas
   */
  timeToX: (timestamp: number) => number;

  /**
   * Convert x-coordinate to timestamp
   */
  xToTime: (x: number) => number;

  /**
   * Convert price to y-coordinate on canvas
   */
  priceToY: (price: number) => number;

  /**
   * Convert y-coordinate to price
   */
  yToPrice: (y: number) => number;

  /**
   * Convert chart point to canvas point
   */
  chartToCanvas: (point: ChartPoint) => CanvasPoint;

  /**
   * Convert canvas point to chart point
   */
  canvasToChart: (point: CanvasPoint) => ChartPoint;

  /**
   * Get the candle index at a given x-coordinate
   */
  xToCandleIndex: (x: number) => number;

  /**
   * Get the x-coordinate for a candle index
   */
  candleIndexToX: (index: number) => number;
}

/**
 * Chart render context
 * Contains all information needed to render the chart
 */
export interface ChartRenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  dimensions: ChartDimensions;
  range: ChartRange;
  mapper: CoordinateMapper;
  theme: ChartTheme;
  settings: ChartSettings;
}

/**
 * Chart event handlers
 */
export interface ChartEventHandlers {
  onCandleClick?: (candle: Candle, index: number) => void;
  onCandleHover?: (candle: Candle | null, index: number) => void;
  onZoom?: (scale: number) => void;
  onPan?: (offset: number) => void;
  onRangeChange?: (range: ChartRange) => void;
}

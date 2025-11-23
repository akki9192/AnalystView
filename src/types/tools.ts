/**
 * Drawing tools and Gann analysis type definitions
 * These types define the structure for interactive drawing tools on the chart
 */

/**
 * Point in chart space (price and time)
 */
export interface ChartPoint {
  timestamp: number; // Unix timestamp
  price: number;
}

/**
 * Point in canvas/screen space (pixels)
 */
export interface CanvasPoint {
  x: number;
  y: number;
}

/**
 * Available drawing tool types
 */
export const ToolType = {
  NONE: 'none',
  CURSOR: 'cursor',
  CROSSHAIR: 'crosshair',
  TRENDLINE: 'trendline',
  HORIZONTAL_LINE: 'horizontal_line',
  VERTICAL_LINE: 'vertical_line',
  GANN_ANGLES: 'gann_angles',
  GANN_FAN: 'gann_fan',
  GANN_SQUARE: 'gann_square',
  FIBONACCI_RETRACEMENT: 'fibonacci_retracement',
} as const;

export type ToolType = typeof ToolType[keyof typeof ToolType];

/**
 * Style properties for drawing tools
 */
export interface DrawingStyle {
  color: string;
  width: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  opacity?: number;
}

/**
 * Base interface for all drawing tools
 */
export interface BaseTool {
  id: string;
  type: ToolType;
  points: ChartPoint[];
  style: DrawingStyle;
  locked: boolean; // If true, tool cannot be moved/edited
  visible: boolean;
  name?: string; // Optional label
  createdAt: number;
  modifiedAt: number;
}

/**
 * Trendline tool
 */
export interface TrendLine extends BaseTool {
  type: 'trendline';
  points: [ChartPoint, ChartPoint]; // Start and end points
  extend: boolean; // Extend line beyond points
}

/**
 * Horizontal line (support/resistance)
 */
export interface HorizontalLine extends BaseTool {
  type: 'horizontal_line';
  points: [ChartPoint]; // Only needs price level
}

/**
 * Vertical line (time marker)
 */
export interface VerticalLine extends BaseTool {
  type: 'vertical_line';
  points: [ChartPoint]; // Only needs timestamp
}

/**
 * Gann angle ratios
 * Represents price/time relationships
 */
export const GannRatio = {
  EIGHT_BY_ONE: '8x1',
  FOUR_BY_ONE: '4x1',
  THREE_BY_ONE: '3x1',
  TWO_BY_ONE: '2x1',
  ONE_BY_ONE: '1x1', // The main 45-degree angle
  ONE_BY_TWO: '1x2',
  ONE_BY_THREE: '1x3',
  ONE_BY_FOUR: '1x4',
  ONE_BY_EIGHT: '1x8',
} as const;

export type GannRatio = typeof GannRatio[keyof typeof GannRatio];

/**
 * Individual Gann angle configuration
 */
export interface GannAngle {
  ratio: GannRatio;
  enabled: boolean;
  style: DrawingStyle;
}

/**
 * Gann angles tool
 * Draws multiple angles from a single point
 */
export interface GannAngles extends BaseTool {
  type: 'gann_angles';
  points: [ChartPoint]; // Origin point (swing high/low)
  direction: 'up' | 'down'; // Trend direction
  angles: GannAngle[]; // Array of angles to draw
  priceScale: number; // Price units per time unit for 1x1 angle
  timeScale: number; // Time units scaling factor
  squareMode: 'price' | 'time' | 'manual'; // How to calculate square
}

/**
 * Gann fan (simpler version with preset angles)
 */
export interface GannFan extends BaseTool {
  type: 'gann_fan';
  points: [ChartPoint, ChartPoint]; // Start and end for direction
  angles: GannAngle[];
}

/**
 * Fibonacci level configuration
 */
export interface FibonacciLevel {
  ratio: number; // 0.236, 0.382, 0.5, 0.618, 0.786, etc.
  enabled: boolean;
  style: DrawingStyle;
  label?: string;
}

/**
 * Fibonacci retracement tool
 * Draws horizontal levels based on Fibonacci ratios
 */
export interface FibonacciRetracement extends BaseTool {
  type: 'fibonacci_retracement';
  points: [ChartPoint, ChartPoint]; // Start (swing low/high) and end (swing high/low)
  levels: FibonacciLevel[];
  showLabels: boolean;
  extendLines: boolean;
}

/**
 * Union type of all drawing tools
 */
export type DrawingTool =
  | TrendLine
  | HorizontalLine
  | VerticalLine
  | GannAngles
  | GannFan
  | FibonacciRetracement;

/**
 * Tool interaction state
 */
export interface ToolInteraction {
  activeTool: ToolType;
  selectedToolId: string | null;
  isDrawing: boolean;
  isDragging: boolean;
  hoverToolId: string | null;
  tempPoints: ChartPoint[]; // Temporary points while drawing
}

/**
 * Zustand store state type definitions
 */

import { Timeframe, ToolType } from './index';
import type {
  MarketDataSeries,
  ChartRange,
  ChartSettings,
  ChartTheme,
  ChartTransform,
  Symbol,
} from './index';
import type { DrawingTool, ToolInteraction } from './tools';

/**
 * Chart state slice
 */
export interface ChartState {
  // Data
  currentSymbol: Symbol | null;
  currentTimeframe: Timeframe;
  marketData: MarketDataSeries | null;
  isLoading: boolean;
  error: string | null;

  // Display
  settings: ChartSettings;
  transform: ChartTransform;
  range: ChartRange | null;

  // Actions
  setSymbol: (symbol: Symbol) => void;
  setTimeframe: (timeframe: Timeframe) => void;
  setMarketData: (data: MarketDataSeries) => void;
  updateSettings: (settings: Partial<ChartSettings>) => void;
  updateTransform: (transform: Partial<ChartTransform>) => void;
  updateRange: (range: ChartRange) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

/**
 * Drawing tools state slice
 */
export interface ToolState {
  // Tools
  tools: DrawingTool[];
  interaction: ToolInteraction;

  // Actions
  addTool: (tool: DrawingTool) => void;
  updateTool: (id: string, updates: Partial<DrawingTool>) => void;
  deleteTool: (id: string) => void;
  clearTools: () => void;
  setActiveTool: (type: ToolType) => void;
  setSelectedTool: (id: string | null) => void;
  setIsDrawing: (drawing: boolean) => void;
  setIsDragging: (dragging: boolean) => void;
  setHoverTool: (id: string | null) => void;
  updateTempPoints: (points: any[]) => void;
}

/**
 * Theme state slice
 */
export interface ThemeState {
  theme: ChartTheme;
  mode: 'light' | 'dark';

  // Actions
  setMode: (mode: 'light' | 'dark') => void;
  toggleMode: () => void;
  updateTheme: (theme: Partial<ChartTheme>) => void;
}

/**
 * Combined application state
 */
export interface AppState extends ChartState, ToolState, ThemeState {}

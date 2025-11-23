/**
 * Chart state slice
 * Manages market data, symbol selection, and chart display settings
 */

import type { StateCreator } from 'zustand';
import { Timeframe } from '../types';
import type {
  AppState,
  ChartState,
  Symbol,
  MarketDataSeries,
  ChartSettings,
  ChartTransform,
  ChartRange,
} from '../types';

/**
 * Default chart settings
 */
const defaultSettings: ChartSettings = {
  showVolume: true,
  showGrid: true,
  showCrosshair: true,
  candleWidth: 8,
  candleSpacing: 2,
  priceAxisWidth: 80,
  timeAxisHeight: 30,
  volumeHeightRatio: 0.2,
  autoScale: true,
  logScale: false,
};

/**
 * Default chart transform
 */
const defaultTransform: ChartTransform = {
  scale: 1.0,
  offsetX: 0,
  candlesVisible: 100,
};

/**
 * Create chart state slice
 */
export const createChartSlice: StateCreator<
  AppState,
  [],
  [],
  ChartState
> = (set) => ({
  // Initial state
  currentSymbol: null,
  currentTimeframe: Timeframe.ONE_DAY,
  marketData: null,
  isLoading: false,
  error: null,
  settings: defaultSettings,
  transform: defaultTransform,
  range: null,

  // Actions
  setSymbol: (symbol: Symbol) =>
    set({ currentSymbol: symbol, error: null }),

  setTimeframe: (timeframe: Timeframe) =>
    set({ currentTimeframe: timeframe, error: null }),

  setMarketData: (data: MarketDataSeries) =>
    set({ marketData: data, isLoading: false, error: null }),

  updateSettings: (newSettings: Partial<ChartSettings>) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    })),

  updateTransform: (newTransform: Partial<ChartTransform>) =>
    set((state) => ({
      transform: { ...state.transform, ...newTransform },
    })),

  updateRange: (range: ChartRange) =>
    set({ range }),

  setLoading: (loading: boolean) =>
    set({ isLoading: loading }),

  setError: (error: string | null) =>
    set({ error, isLoading: false }),
});

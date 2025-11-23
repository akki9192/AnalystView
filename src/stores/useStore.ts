/**
 * Main application store
 * Combines all state slices into a single store using Zustand
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { AppState } from '../types';
import { createChartSlice } from './chartSlice';
import { createToolSlice } from './toolSlice';
import { createThemeSlice } from './themeSlice';

/**
 * Combined store with all slices
 * Uses devtools for debugging and persist for localStorage persistence
 */
export const useStore = create<AppState>()(
  devtools(
    persist(
      (...a) => ({
        ...createChartSlice(...a),
        ...createToolSlice(...a),
        ...createThemeSlice(...a),
      }),
      {
        name: 'analyst-view-storage',
        // Only persist certain parts of the state
        partialize: (state) => ({
          // Persist theme preference
          mode: state.mode,
          // Persist chart settings
          settings: state.settings,
          // Persist drawing tools
          tools: state.tools,
          // Persist last selected symbol and timeframe
          currentSymbol: state.currentSymbol,
          currentTimeframe: state.currentTimeframe,
        }),
      }
    ),
    {
      name: 'AnalystView Store',
    }
  )
);

/**
 * Selector hooks for optimized re-renders
 */

// Chart selectors
export const useSymbol = () => useStore((state) => state.currentSymbol);
export const useTimeframe = () => useStore((state) => state.currentTimeframe);
export const useMarketData = () => useStore((state) => state.marketData);
export const useChartSettings = () => useStore((state) => state.settings);
export const useChartTransform = () => useStore((state) => state.transform);
export const useChartRange = () => useStore((state) => state.range);
export const useIsLoading = () => useStore((state) => state.isLoading);
export const useError = () => useStore((state) => state.error);

// Tool selectors
export const useTools = () => useStore((state) => state.tools);
export const useToolInteraction = () => useStore((state) => state.interaction);
export const useActiveTool = () => useStore((state) => state.interaction.activeTool);
export const useSelectedTool = () => useStore((state) => state.interaction.selectedToolId);

// Theme selectors
export const useTheme = () => useStore((state) => state.theme);
export const useThemeMode = () => useStore((state) => state.mode);

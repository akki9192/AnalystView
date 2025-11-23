/**
 * Theme state slice
 * Manages light/dark mode and chart color schemes
 */

import type { StateCreator } from 'zustand';
import type { AppState, ThemeState, ChartTheme } from '../types';

/**
 * Light theme colors
 */
const lightTheme: ChartTheme = {
  mode: 'light',
  background: '#ffffff',
  gridColor: '#e5e7eb',
  textColor: '#1f2937',
  crosshairColor: '#6b7280',
  candleUp: '#10b981',
  candleDown: '#ef4444',
  volumeUp: 'rgba(16, 185, 129, 0.5)',
  volumeDown: 'rgba(239, 68, 68, 0.5)',
  wickColor: '#4b5563',
};

/**
 * Dark theme colors
 */
const darkTheme: ChartTheme = {
  mode: 'dark',
  background: '#1a1a1a',
  gridColor: '#374151',
  textColor: '#f9fafb',
  crosshairColor: '#9ca3af',
  candleUp: '#10b981',
  candleDown: '#ef4444',
  volumeUp: 'rgba(16, 185, 129, 0.5)',
  volumeDown: 'rgba(239, 68, 68, 0.5)',
  wickColor: '#9ca3af',
};

/**
 * Create theme state slice
 */
export const createThemeSlice: StateCreator<
  AppState,
  [],
  [],
  ThemeState
> = (set) => ({
  // Initial state - check system preference
  mode:
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light',
  theme:
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
      ? darkTheme
      : lightTheme,

  // Actions
  setMode: (mode: 'light' | 'dark') =>
    set({
      mode,
      theme: mode === 'dark' ? darkTheme : lightTheme,
    }),

  toggleMode: () =>
    set((state) => {
      const newMode = state.mode === 'light' ? 'dark' : 'light';
      return {
        mode: newMode,
        theme: newMode === 'dark' ? darkTheme : lightTheme,
      };
    }),

  updateTheme: (themeUpdates: Partial<ChartTheme>) =>
    set((state) => ({
      theme: {
        ...state.theme,
        ...themeUpdates,
      },
    })),
});

/**
 * Main Layout Component
 * Defines the overall application layout structure
 */

import React from 'react';
import { Chart } from '../Chart';
import { SymbolSelector, TimeframeSelector, ThemeToggle, Toolbar } from '../UI';
import { useIsLoading, useError } from '../../stores/useStore';

export const MainLayout: React.FC = () => {
  const isLoading = useIsLoading();
  const error = useError();

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            AnalystView
          </h1>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Professional Gann & Astro Trading Platform
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <SymbolSelector />
          <TimeframeSelector />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Tools */}
        <aside className="flex-shrink-0">
          <Toolbar />
        </aside>

        {/* Chart Area */}
        <main className="flex-1 relative">
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="text-gray-900 dark:text-white font-medium">
                    Loading market data...
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40">
              <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg shadow-lg">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-medium">{error}</span>
                </div>
              </div>
            </div>
          )}

          {/* Chart */}
          <Chart />
        </main>

        {/* Right Sidebar - Settings Panel (Placeholder) */}
        <aside className="flex-shrink-0 w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Chart Settings
              </h3>
              <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center justify-between">
                  <span>Show Grid</span>
                  <input type="checkbox" defaultChecked className="rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <span>Show Volume</span>
                  <input type="checkbox" defaultChecked className="rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <span>Auto Scale</span>
                  <input type="checkbox" defaultChecked className="rounded" />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Drawing Tools
              </h3>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                <p className="mb-2">
                  Select a tool from the left sidebar to start drawing on the
                  chart.
                </p>
                <p className="text-gray-500 dark:text-gray-500">
                  Gann angles and advanced tools coming soon...
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Instructions
              </h3>
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <p>• Search and select a symbol</p>
                <p>• Choose timeframe</p>
                <p>• Use mouse wheel to zoom</p>
                <p>• Click and drag to pan</p>
                <p>• Hover to see OHLCV data</p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Status Bar */}
      <footer className="px-4 py-2 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center space-x-4">
            <span>Phase 1: Foundation</span>
            <span>•</span>
            <span>Core chart engine operational</span>
          </div>
          <div>
            <span>Gann & Astro Trading Platform v0.1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

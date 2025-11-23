/**
 * Symbol Selector Component
 * Allows users to search and select trading symbols
 */

import React, { useState, useEffect } from 'react';
import { useStore, useSymbol } from '../../stores/useStore';
import { marketDataService } from '../../services/marketData';
import type { Symbol } from '../../types';

export const SymbolSelector: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Symbol[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [_isLoading, _setIsLoading] = useState(false);

  const currentSymbol = useSymbol();
  const setSymbol = useStore((state) => state.setSymbol);
  const setMarketData = useStore((state) => state.setMarketData);
  const setLoadingState = useStore((state) => state.setLoading);
  const setError = useStore((state) => state.setError);
  const timeframe = useStore((state) => state.currentTimeframe);

  /**
   * Search symbols on query change
   */
  useEffect(() => {
    const searchSymbols = async () => {
      if (query.length < 1) {
        setResults([]);
        return;
      }

      try {
        const symbols = await marketDataService.searchSymbols(query);
        setResults(symbols);
      } catch (error) {
        console.error('Error searching symbols:', error);
      }
    };

    const debounce = setTimeout(searchSymbols, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  /**
   * Load market data when symbol is selected
   */
  const handleSelectSymbol = async (symbol: Symbol) => {
    setSymbol(symbol);
    setQuery('');
    setIsOpen(false);
    setLoadingState(true);

    try {
      const data = await marketDataService.fetchMarketData(symbol, timeframe);
      setMarketData(data);
      setError(null);
    } catch (error) {
      console.error('Error loading market data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoadingState(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={query || currentSymbol?.symbol || ''}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search symbol..."
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
        />
        {currentSymbol && (
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {currentSymbol.name}
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
          {results.map((symbol) => (
            <button
              key={symbol.symbol}
              onClick={() => handleSelectSymbol(symbol)}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-between items-center"
            >
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {symbol.symbol}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {symbol.name}
                </div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                {symbol.exchange}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

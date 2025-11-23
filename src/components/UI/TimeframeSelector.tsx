/**
 * Timeframe Selector Component
 * Allows users to switch between different chart timeframes
 */

import React from 'react';
import { useStore, useTimeframe, useSymbol } from '../../stores/useStore';
import { Timeframe } from '../../types';
import { marketDataService } from '../../services/marketData';
import clsx from 'clsx';

const TIMEFRAMES = [
  { value: Timeframe.ONE_MINUTE, label: '1m' },
  { value: Timeframe.FIVE_MINUTES, label: '5m' },
  { value: Timeframe.FIFTEEN_MINUTES, label: '15m' },
  { value: Timeframe.ONE_HOUR, label: '1h' },
  { value: Timeframe.FOUR_HOURS, label: '4h' },
  { value: Timeframe.ONE_DAY, label: '1D' },
  { value: Timeframe.ONE_WEEK, label: '1W' },
  { value: Timeframe.ONE_MONTH, label: '1M' },
];

export const TimeframeSelector: React.FC = () => {
  const currentTimeframe = useTimeframe();
  const currentSymbol = useSymbol();
  const setTimeframe = useStore((state) => state.setTimeframe);
  const setMarketData = useStore((state) => state.setMarketData);
  const setLoading = useStore((state) => state.setLoading);
  const setError = useStore((state) => state.setError);

  const handleTimeframeChange = async (timeframe: Timeframe) => {
    if (timeframe === currentTimeframe) return;

    setTimeframe(timeframe);

    if (currentSymbol) {
      setLoading(true);
      try {
        const data = await marketDataService.fetchMarketData(
          currentSymbol,
          timeframe
        );
        setMarketData(data);
        setError(null);
      } catch (error) {
        console.error('Error loading market data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-md p-1">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf.value}
          onClick={() => handleTimeframeChange(tf.value)}
          className={clsx(
            'px-3 py-1 text-xs font-medium rounded transition-colors',
            currentTimeframe === tf.value
              ? 'bg-blue-500 text-white'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          )}
        >
          {tf.label}
        </button>
      ))}
    </div>
  );
};

/**
 * Market data service
 * Fetches OHLCV data from external sources
 *
 * Current implementation uses Yahoo Finance API
 * Can be extended to support multiple data providers (Polygon, Alpha Vantage, etc.)
 */

import axios from 'axios';
import { Timeframe } from '../types';
import type { Candle, MarketDataSeries, Symbol } from '../types';

/**
 * Data provider interface
 * Allows for easy switching between different data sources
 */
interface DataProvider {
  fetchOHLCV(
    symbol: string,
    timeframe: Timeframe,
    startDate?: Date,
    endDate?: Date
  ): Promise<Candle[]>;

  searchSymbols(query: string): Promise<Symbol[]>;
}

/**
 * Yahoo Finance data provider
 * Uses unofficial Yahoo Finance API
 */
class YahooFinanceProvider implements DataProvider {
  private baseUrl = 'https://query1.finance.yahoo.com/v8/finance/chart';

  /**
   * Convert Timeframe enum to Yahoo Finance interval string
   */
  private getInterval(timeframe: Timeframe): string {
    const intervalMap: Record<Timeframe, string> = {
      [Timeframe.ONE_MINUTE]: '1m',
      [Timeframe.FIVE_MINUTES]: '5m',
      [Timeframe.FIFTEEN_MINUTES]: '15m',
      [Timeframe.THIRTY_MINUTES]: '30m',
      [Timeframe.ONE_HOUR]: '1h',
      [Timeframe.FOUR_HOURS]: '4h',
      [Timeframe.ONE_DAY]: '1d',
      [Timeframe.ONE_WEEK]: '1wk',
      [Timeframe.ONE_MONTH]: '1mo',
    };
    return intervalMap[timeframe];
  }

  /**
   * Fetch OHLCV data from Yahoo Finance
   */
  async fetchOHLCV(
    symbol: string,
    timeframe: Timeframe,
    startDate?: Date,
    endDate?: Date
  ): Promise<Candle[]> {
    try {
      const interval = this.getInterval(timeframe);
      const period1 = startDate
        ? Math.floor(startDate.getTime() / 1000)
        : Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60; // Default: 1 year ago
      const period2 = endDate
        ? Math.floor(endDate.getTime() / 1000)
        : Math.floor(Date.now() / 1000);

      const url = `${this.baseUrl}/${symbol}`;
      const params = {
        interval,
        period1,
        period2,
        includePrePost: false,
      };

      const response = await axios.get(url, { params });
      const result = response.data.chart.result[0];

      if (!result || !result.timestamp) {
        throw new Error('No data available for this symbol');
      }

      const timestamps = result.timestamp;
      const quote = result.indicators.quote[0];

      // Convert to Candle array
      const candles: Candle[] = timestamps.map((timestamp: number, index: number) => ({
        timestamp: timestamp * 1000, // Convert to milliseconds
        open: quote.open[index] || 0,
        high: quote.high[index] || 0,
        low: quote.low[index] || 0,
        close: quote.close[index] || 0,
        volume: quote.volume[index] || 0,
      }));

      // Filter out invalid candles
      return candles.filter(
        (candle) =>
          candle.open > 0 &&
          candle.high > 0 &&
          candle.low > 0 &&
          candle.close > 0
      );
    } catch (error) {
      console.error('Error fetching data from Yahoo Finance:', error);
      throw new Error(`Failed to fetch data for ${symbol}`);
    }
  }

  /**
   * Search for symbols (simplified implementation)
   * In production, use Yahoo Finance search API or a dedicated search service
   */
  async searchSymbols(query: string): Promise<Symbol[]> {
    // Placeholder: return some common symbols
    // TODO: Implement proper symbol search using Yahoo Finance API
    const commonSymbols: Symbol[] = [
      { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', type: 'stock' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', type: 'stock' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ', type: 'stock' },
      { symbol: 'TSLA', name: 'Tesla, Inc.', exchange: 'NASDAQ', type: 'stock' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', type: 'stock' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', type: 'stock' },
      { symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ', type: 'stock' },
      { symbol: 'SPY', name: 'S&P 500 ETF', exchange: 'NYSE', type: 'stock' },
    ];

    return commonSymbols.filter((s) =>
      s.symbol.toLowerCase().includes(query.toLowerCase()) ||
      s.name.toLowerCase().includes(query.toLowerCase())
    );
  }
}

/**
 * Market data service class
 * Manages data fetching and caching
 */
class MarketDataService {
  private provider: DataProvider;
  private cache: Map<string, { data: MarketDataSeries; timestamp: number }>;
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.provider = new YahooFinanceProvider();
    this.cache = new Map();
  }

  /**
   * Generate cache key
   */
  private getCacheKey(symbol: string, timeframe: Timeframe): string {
    return `${symbol}_${timeframe}`;
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.cacheTimeout;
  }

  /**
   * Fetch market data with caching
   */
  async fetchMarketData(
    symbol: Symbol,
    timeframe: Timeframe,
    startDate?: Date,
    endDate?: Date
  ): Promise<MarketDataSeries> {
    const cacheKey = this.getCacheKey(symbol.symbol, timeframe);
    const cached = this.cache.get(cacheKey);

    // Return cached data if valid
    if (cached && this.isCacheValid(cached.timestamp)) {
      console.log(`Using cached data for ${symbol.symbol}`);
      return cached.data;
    }

    // Fetch fresh data
    console.log(`Fetching fresh data for ${symbol.symbol}`);
    const candles = await this.provider.fetchOHLCV(
      symbol.symbol,
      timeframe,
      startDate,
      endDate
    );

    const marketData: MarketDataSeries = {
      symbol,
      timeframe,
      candles,
      lastUpdate: Date.now(),
    };

    // Update cache
    this.cache.set(cacheKey, {
      data: marketData,
      timestamp: Date.now(),
    });

    return marketData;
  }

  /**
   * Search for symbols
   */
  async searchSymbols(query: string): Promise<Symbol[]> {
    return this.provider.searchSymbols(query);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear cache for specific symbol
   */
  clearSymbolCache(symbol: string): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.startsWith(symbol)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.cache.delete(key));
  }
}

/**
 * Export singleton instance
 */
export const marketDataService = new MarketDataService();

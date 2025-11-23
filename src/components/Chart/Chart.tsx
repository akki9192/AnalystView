/**
 * Chart Component - Main charting component
 * Manages canvas rendering, user interactions, and state
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ChartRenderer } from './ChartRenderer';
import {
  useMarketData,
  useChartSettings,
  useTheme,
  useStore,
  useChartTransform,
  useChartRange,
} from '../../stores/useStore';
import {
  calculateChartRange,
  createCoordinateMapper,
} from '../../utils/chartCalculations';
import type { ChartDimensions, CanvasPoint } from '../../types';

interface ChartProps {
  width?: number;
  height?: number;
}

export const Chart: React.FC<ChartProps> = ({ width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderer, setRenderer] = useState<ChartRenderer | null>(null);
  const [crosshair, setCrosshair] = useState<CanvasPoint | null>(null);
  const [hoveredCandleIndex, setHoveredCandleIndex] = useState<number | null>(null);

  // Store state
  const marketData = useMarketData();
  const settings = useChartSettings();
  const theme = useTheme();
  const transform = useChartTransform();
  const range = useChartRange();
  const updateRange = useStore((state) => state.updateRange);
  const updateTransform = useStore((state) => state.updateTransform);

  // Calculate dimensions
  const getDimensions = useCallback((): ChartDimensions => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return {
        width: 800,
        height: 600,
        chartWidth: 720,
        chartHeight: 570,
        volumeHeight: 100,
        priceChartHeight: 470,
        priceAxisWidth: 80,
        timeAxisHeight: 30,
      };
    }

    const w = width || canvas.width;
    const h = height || canvas.height;
    const chartWidth = w - settings.priceAxisWidth;
    const chartHeight = h - settings.timeAxisHeight;
    const volumeHeight = settings.showVolume
      ? chartHeight * settings.volumeHeightRatio
      : 0;
    const priceChartHeight = chartHeight - volumeHeight;

    return {
      width: w,
      height: h,
      chartWidth,
      chartHeight,
      volumeHeight,
      priceChartHeight,
      priceAxisWidth: settings.priceAxisWidth,
      timeAxisHeight: settings.timeAxisHeight,
    };
  }, [width, height, settings]);

  /**
   * Initialize canvas and renderer
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Set canvas size
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Scale for high DPI displays
    ctx.scale(dpr, dpr);

    // Create renderer
    const chartRenderer = new ChartRenderer(ctx, theme);
    setRenderer(chartRenderer);

    return () => {
      setRenderer(null);
    };
  }, [theme]);

  /**
   * Update chart range when data or transform changes
   */
  useEffect(() => {
    if (!marketData || !marketData.candles.length) return;

    const dimensions = getDimensions();
    const newRange = calculateChartRange(
      marketData.candles,
      transform,
      dimensions,
      settings
    );
    updateRange(newRange);
  }, [marketData, transform, settings, getDimensions, updateRange]);

  /**
   * Main render function
   */
  const render = useCallback(() => {
    if (!renderer || !marketData || !range) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const dimensions = getDimensions();
    const mapper = createCoordinateMapper(
      marketData.candles,
      dimensions,
      range,
      settings
    );

    // Clear canvas
    renderer.clear(dimensions.width, dimensions.height);

    // Update theme
    renderer.setTheme(theme);

    // Draw grid
    renderer.drawGrid(dimensions, mapper, settings);

    // Draw candles
    renderer.drawCandles(
      marketData.candles,
      range.startIndex,
      range.endIndex,
      mapper,
      settings
    );

    // Draw volume
    renderer.drawVolume(
      marketData.candles,
      range.startIndex,
      range.endIndex,
      dimensions,
      mapper,
      settings
    );

    // Draw axes
    renderer.drawPriceAxis(dimensions, mapper, settings);
    renderer.drawTimeAxis(
      marketData.candles,
      dimensions,
      mapper,
      settings,
      range.startIndex,
      range.endIndex,
      marketData.timeframe
    );

    // Draw crosshair
    if (crosshair) {
      renderer.drawCrosshair(
        crosshair.x,
        crosshair.y,
        dimensions,
        settings
      );

      const price = mapper.yToPrice(crosshair.y);
      renderer.drawPriceLabel(price, crosshair.y, dimensions);

      // Draw candle info if hovering over a candle
      if (hoveredCandleIndex !== null) {
        const candle = marketData.candles[hoveredCandleIndex];
        if (candle) {
          renderer.drawCandleInfo(candle, 10, 10);
        }
      }
    }
  }, [
    renderer,
    marketData,
    range,
    settings,
    theme,
    crosshair,
    hoveredCandleIndex,
    getDimensions,
  ]);

  /**
   * Render on data/state changes
   */
  useEffect(() => {
    render();
  }, [render]);

  /**
   * Handle mouse move
   */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!range || !marketData) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setCrosshair({ x, y });

      // Find hovered candle
      const dimensions = getDimensions();
      const mapper = createCoordinateMapper(
        marketData.candles,
        dimensions,
        range,
        settings
      );
      const candleIndex = mapper.xToCandleIndex(x);

      if (
        candleIndex >= range.startIndex &&
        candleIndex <= range.endIndex &&
        candleIndex < marketData.candles.length
      ) {
        setHoveredCandleIndex(candleIndex);
      } else {
        setHoveredCandleIndex(null);
      }
    },
    [range, marketData, settings, getDimensions]
  );

  /**
   * Handle mouse leave
   */
  const handleMouseLeave = useCallback(() => {
    setCrosshair(null);
    setHoveredCandleIndex(null);
  }, []);

  /**
   * Handle mouse wheel (zoom)
   */
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();

      const zoomFactor = 1.1;
      const delta = e.deltaY > 0 ? 1 / zoomFactor : zoomFactor;

      updateTransform({
        scale: transform.scale * delta,
      });
    },
    [transform, updateTransform]
  );

  /**
   * Handle mouse drag (pan)
   */
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<CanvasPoint | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDragging(true);
    setDragStart({ x, y });
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  const handleMouseMoveWhileDragging = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      handleMouseMove(e);

      if (!isDragging || !dragStart) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;

      const deltaX = x - dragStart.x;

      updateTransform({
        offsetX: Math.max(0, transform.offsetX - deltaX),
      });

      setDragStart({ x, y: dragStart.y });
    },
    [isDragging, dragStart, transform, updateTransform, handleMouseMove]
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-white dark:bg-gray-900"
    >
      <canvas
        ref={canvasRef}
        className="chart-canvas w-full h-full"
        onMouseMove={handleMouseMoveWhileDragging}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      />
      {!marketData && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400">
          Select a symbol to view chart
        </div>
      )}
    </div>
  );
};

/**
 * Chart Component - Main charting component
 * Manages canvas rendering, user interactions, and state
 *
 * TradingView-style interactions:
 * - Mouse wheel: Zoom in/out (centered on cursor)
 * - Click & drag: Pan chart
 * - Double-click: Auto-scale/fit view
 * - Keyboard: +/- for zoom, Home for reset, A for auto-scale
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ChartRenderer } from './ChartRenderer';
import { ToolManager, ToolFactory } from '../Tools';
import {
  useMarketData,
  useChartSettings,
  useTheme,
  useStore,
  useChartTransform,
  useChartRange,
  useTools,
  useActiveTool,
  useSelectedTool,
  useToolInteraction,
} from '../../stores/useStore';
import {
  createCoordinateMapper,
} from '../../utils/chartCalculations';
import { ToolType } from '../../types';
import type { ChartDimensions, CanvasPoint, ChartPoint } from '../../types';

interface ChartProps {
  width?: number;
  height?: number;
}

export const Chart: React.FC<ChartProps> = ({ width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderer, setRenderer] = useState<ChartRenderer | null>(null);
  const [toolManager, setToolManager] = useState<ToolManager | null>(null);
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

  // Tool state
  const tools = useTools();
  const activeTool = useActiveTool();
  const selectedTool = useSelectedTool();
  const toolInteraction = useToolInteraction();
  const addTool = useStore((state) => state.addTool);
  const updateTool = useStore((state) => state.updateTool);
  const setActiveTool = useStore((state) => state.setActiveTool);
  const setSelectedTool = useStore((state) => state.setSelectedTool);
  const setIsDrawing = useStore((state) => state.setIsDrawing);
  const updateTempPoints = useStore((state) => state.updateTempPoints);

  // Constants for zoom limits
  const MIN_CANDLES_VISIBLE = 10;
  const MAX_CANDLES_VISIBLE = 500;
  const DEFAULT_CANDLES_VISIBLE = 100;

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

    // Create renderer and tool manager
    const chartRenderer = new ChartRenderer(ctx, theme);
    const toolMgr = new ToolManager(ctx);
    setRenderer(chartRenderer);
    setToolManager(toolMgr);

    return () => {
      setRenderer(null);
      setToolManager(null);
    };
  }, [theme]);

  /**
   * Initialize default transform when data loads
   */
  useEffect(() => {
    if (!marketData || !marketData.candles.length) return;

    // Set initial view to show last 100 candles
    if (transform.candlesVisible === 0) {
      const initialOffset = 0; // Start at the end (most recent data)
      updateTransform({
        candlesVisible: DEFAULT_CANDLES_VISIBLE,
        offsetX: initialOffset,
        scale: 1.0,
      });
    }
  }, [marketData, transform.candlesVisible, updateTransform]);

  /**
   * Update chart range when data or transform changes
   */
  useEffect(() => {
    if (!marketData || !marketData.candles.length) return;
    if (transform.candlesVisible === 0) return;

    // Calculate visible range based on candlesVisible and offsetX
    const totalCandles = marketData.candles.length;
    const visibleCandles = Math.min(transform.candlesVisible, totalCandles);

    // offsetX represents how many candles we're panned from the right edge
    const rightOffset = Math.floor(transform.offsetX);
    const endIndex = Math.max(0, Math.min(totalCandles - 1, totalCandles - 1 - rightOffset));
    const startIndex = Math.max(0, endIndex - visibleCandles + 1);

    const newRange = {
      startIndex,
      endIndex,
      timeRange: {
        start: marketData.candles[startIndex]?.timestamp || 0,
        end: marketData.candles[endIndex]?.timestamp || 0,
      },
      priceRange: calculatePriceRange(marketData.candles, startIndex, endIndex),
    };

    updateRange(newRange);
  }, [marketData, transform, updateRange]);

  /**
   * Calculate price range helper
   */
  const calculatePriceRange = (candles: any[], start: number, end: number) => {
    if (!candles || candles.length === 0) {
      return { min: 0, max: 100 };
    }

    let min = Infinity;
    let max = -Infinity;

    for (let i = start; i <= end && i < candles.length; i++) {
      const candle = candles[i];
      min = Math.min(min, candle.low);
      max = Math.max(max, candle.high);
    }

    // Add 5% padding
    const padding = (max - min) * 0.05;
    return {
      min: min - padding,
      max: max + padding,
    };
  };

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

    // Draw tools
    if (toolManager && tools.length > 0) {
      toolManager.renderTools(tools, mapper, selectedTool || null);
    }

    // Draw temporary tool being created (e.g., trendline in progress)
    if (toolInteraction.isDrawing && toolInteraction.tempPoints.length > 0 && crosshair) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        const startPoint = toolInteraction.tempPoints[0];
        const startCanvas = mapper.chartToCanvas(startPoint);

        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(startCanvas.x, startCanvas.y);
        ctx.lineTo(crosshair.x, crosshair.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw start point
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(startCanvas.x, startCanvas.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

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
    toolManager,
    marketData,
    range,
    settings,
    theme,
    crosshair,
    hoveredCandleIndex,
    tools,
    selectedTool,
    toolInteraction,
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
   * Zoom function - TradingView style
   * Zooms centered on the mouse position
   */
  const zoom = useCallback(
    (delta: number, mouseX?: number) => {
      if (!marketData || !range) return;

      const zoomFactor = 1.1;
      const zoomMultiplier = delta > 0 ? 1 / zoomFactor : zoomFactor;

      // Calculate new number of visible candles
      const currentVisible = transform.candlesVisible;
      const newVisible = Math.round(currentVisible * zoomMultiplier);

      // Clamp to limits
      const clampedVisible = Math.max(
        MIN_CANDLES_VISIBLE,
        Math.min(MAX_CANDLES_VISIBLE, newVisible)
      );

      if (clampedVisible === currentVisible) return;

      // Calculate zoom point (0 = left edge, 1 = right edge)
      let zoomPoint = 0.8; // Default: zoom near right edge (recent data)

      if (mouseX !== undefined) {
        const dimensions = getDimensions();
        zoomPoint = Math.max(0, Math.min(1, mouseX / dimensions.chartWidth));
      }

      // Calculate how many candles to shift the offset to keep zoom centered
      const candlesDiff = clampedVisible - currentVisible;
      const offsetAdjustment = candlesDiff * (1 - zoomPoint);

      // Update transform
      const newOffsetX = Math.max(0, transform.offsetX + offsetAdjustment);

      updateTransform({
        candlesVisible: clampedVisible,
        offsetX: newOffsetX,
      });
    },
    [marketData, range, transform, getDimensions, updateTransform]
  );

  /**
   * Auto-scale / Fit view - shows all available data
   */
  const autoScale = useCallback(() => {
    if (!marketData || !marketData.candles.length) return;

    const totalCandles = marketData.candles.length;
    const visibleCandles = Math.min(totalCandles, DEFAULT_CANDLES_VISIBLE);

    updateTransform({
      candlesVisible: visibleCandles,
      offsetX: 0, // Show most recent data
      scale: 1.0,
    });
  }, [marketData, updateTransform]);

  /**
   * Reset view - back to default
   */
  const resetView = useCallback(() => {
    updateTransform({
      candlesVisible: DEFAULT_CANDLES_VISIBLE,
      offsetX: 0,
      scale: 1.0,
    });
  }, [updateTransform]);

  /**
   * Attach wheel listener manually to support non-passive events
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;

      zoom(e.deltaY, mouseX);
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [zoom]);

  /**
   * Keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if chart is focused or no input is focused
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      switch (e.key) {
        case '+':
        case '=':
          e.preventDefault();
          zoom(-1); // Zoom in
          break;
        case '-':
        case '_':
          e.preventDefault();
          zoom(1); // Zoom out
          break;
        case 'Home':
          e.preventDefault();
          resetView();
          break;
        case 'a':
        case 'A':
          e.preventDefault();
          autoScale();
          break;
        case 'Escape':
          e.preventDefault();
          // Cancel drawing mode and reset to cursor
          if (toolInteraction.isDrawing) {
            setIsDrawing(false);
            updateTempPoints([]);
          }
          setActiveTool(ToolType.CURSOR);
          setSelectedTool(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [zoom, resetView, autoScale, toolInteraction, setIsDrawing, updateTempPoints, setActiveTool, setSelectedTool]);

  /**
   * Handle mouse drag (pan)
   */
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<CanvasPoint | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !marketData || !range) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dimensions = getDimensions();
    const mapper = createCoordinateMapper(
      marketData.candles,
      dimensions,
      range,
      settings
    );

    const price = mapper.yToPrice(y);
    const timestamp = mapper.xToTime(x);
    const chartPoint: ChartPoint = { price, timestamp };

    // Handle CROSSHAIR - just for viewing, no tool placement
    if (activeTool === ToolType.CROSSHAIR) {
      return; // Crosshair is just a view mode
    }

    // Handle tool interactions for drawing tools
    if (activeTool !== ToolType.NONE && activeTool !== ToolType.CURSOR) {
      // TRENDLINE requires two clicks (start and end points)
      if (activeTool === ToolType.TRENDLINE) {
        if (!toolInteraction.isDrawing) {
          // First click - start drawing
          setIsDrawing(true);
          updateTempPoints([chartPoint]);
          return;
        } else {
          // Second click - finish drawing
          const startPoint = toolInteraction.tempPoints[0];
          const newTool = ToolFactory.createTrendLine(startPoint, chartPoint);
          addTool(newTool);
          setSelectedTool(newTool.id);
          setIsDrawing(false);
          updateTempPoints([]);
          setActiveTool(ToolType.CURSOR);
          return;
        }
      }

      // Single-click tools (Gann angles, horizontal/vertical lines)
      let newTool;
      if (activeTool === ToolType.GANN_ANGLES) {
        // Calculate price scale for Gann angles
        const priceRange = range.priceRange.max - range.priceRange.min;
        const priceScale = priceRange / dimensions.priceChartHeight;
        newTool = ToolFactory.createGannAngles(chartPoint, 'up', priceScale);
      } else if (activeTool === ToolType.HORIZONTAL_LINE) {
        newTool = ToolFactory.createHorizontalLine(price, timestamp);
      } else if (activeTool === ToolType.VERTICAL_LINE) {
        newTool = ToolFactory.createVerticalLine(timestamp, price);
      }

      if (newTool) {
        addTool(newTool);
        setSelectedTool(newTool.id);
        // Don't reset to cursor - let user place multiple tools
        // setActiveTool(ToolType.CURSOR);
      }
      return;
    }

    // Handle tool selection with cursor
    if (activeTool === ToolType.CURSOR && toolManager) {
      const clickedTool = toolManager.findToolAtPoint(
        tools,
        { x, y },
        mapper
      );

      if (clickedTool) {
        setSelectedTool(clickedTool.id);
        return; // Don't start dragging if we clicked a tool
      } else {
        setSelectedTool(null); // Deselect if clicking empty space
      }
    }

    // Start pan dragging
    setIsDragging(true);
    setDragStart({ x, y });
    setDragOffset(transform.offsetX);
  }, [
    marketData,
    range,
    activeTool,
    toolInteraction,
    tools,
    toolManager,
    transform.offsetX,
    settings,
    getDimensions,
    addTool,
    updateTool,
    setActiveTool,
    setSelectedTool,
    setIsDrawing,
    updateTempPoints,
  ]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  const handleMouseMoveWhileDragging = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      handleMouseMove(e);

      if (!isDragging || !dragStart || !marketData) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;

      // Calculate how many candles were dragged
      const candleWidth = settings.candleWidth + settings.candleSpacing;
      const pixelsDragged = dragStart.x - x; // Reversed: drag right = pan left
      const candlesDragged = pixelsDragged / candleWidth;

      // Update offset with bounds checking
      const totalCandles = marketData.candles.length;
      const maxOffset = Math.max(0, totalCandles - transform.candlesVisible);
      const newOffsetX = Math.max(0, Math.min(maxOffset, dragOffset + candlesDragged));

      updateTransform({
        offsetX: newOffsetX,
      });
    },
    [isDragging, dragStart, dragOffset, marketData, transform.candlesVisible, settings, getDimensions, handleMouseMove, updateTransform]
  );

  /**
   * Double-click to auto-scale
   */
  const handleDoubleClick = useCallback(() => {
    autoScale();
  }, [autoScale]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-white dark:bg-gray-900"
    >
      {/* Chart Controls */}
      {marketData && (
        <div className="absolute top-2 right-2 z-10 flex gap-1 bg-white dark:bg-gray-800 rounded shadow-md border border-gray-200 dark:border-gray-700 p-1">
          <button
            onClick={() => zoom(-1)}
            className="px-2 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Zoom In (+)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
            </svg>
          </button>
          <button
            onClick={() => zoom(1)}
            className="px-2 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Zoom Out (-)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
            </svg>
          </button>
          <button
            onClick={autoScale}
            className="px-2 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Auto Scale (A)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
          <button
            onClick={resetView}
            className="px-2 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Reset View (Home)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
        </div>
      )}

      {/* Help text */}
      {marketData && (
        <div className="absolute bottom-2 left-2 z-10 text-xs text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-gray-800/80 px-2 py-1 rounded max-w-md">
          {toolInteraction.isDrawing ? (
            <span className="text-blue-600 dark:text-blue-400 font-semibold">
              Click to place second point | ESC: Cancel
            </span>
          ) : (
            <>
              Scroll: Zoom | Drag: Pan | Double-click: Fit | +/-: Zoom | Home: Reset | A: Auto-scale | ESC: Exit tool
            </>
          )}
        </div>
      )}

      <canvas
        ref={canvasRef}
        className={`chart-canvas w-full h-full ${
          isDragging
            ? 'cursor-grabbing'
            : activeTool !== ToolType.NONE && activeTool !== ToolType.CURSOR
            ? 'cursor-crosshair'
            : 'cursor-grab'
        }`}
        onMouseMove={handleMouseMoveWhileDragging}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      />
      {!marketData && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400">
          Select a symbol to view chart
        </div>
      )}
    </div>
  );
};

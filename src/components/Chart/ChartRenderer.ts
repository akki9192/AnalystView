/**
 * ChartRenderer - Core canvas rendering engine
 * Handles all drawing operations for the chart
 *
 * This class is responsible for:
 * - Drawing candlesticks
 * - Rendering volume bars
 * - Drawing grid and axes
 * - Rendering crosshair
 */

import type {
  Candle,
  ChartTheme,
  CoordinateMapper,
  ChartDimensions,
  ChartSettings,
} from '../../types';
import { formatPrice, formatVolume, formatTimestamp } from '../../utils/chartCalculations';

export class ChartRenderer {
  private ctx: CanvasRenderingContext2D;
  private theme: ChartTheme;

  constructor(ctx: CanvasRenderingContext2D, theme: ChartTheme) {
    this.ctx = ctx;
    this.theme = theme;
  }

  /**
   * Update theme
   */
  setTheme(theme: ChartTheme): void {
    this.theme = theme;
  }

  /**
   * Clear the entire canvas
   */
  clear(width: number, height: number): void {
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = this.theme.background;
    this.ctx.fillRect(0, 0, width, height);
  }

  /**
   * Draw grid lines
   */
  drawGrid(
    dimensions: ChartDimensions,
    _mapper: CoordinateMapper,
    settings: ChartSettings
  ): void {
    if (!settings.showGrid) return;

    this.ctx.strokeStyle = this.theme.gridColor;
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([2, 2]);

    const { chartWidth, priceChartHeight } = dimensions;

    // Horizontal price grid lines (approximately every 50px)
    const numHorizontalLines = Math.floor(priceChartHeight / 50);
    for (let i = 0; i <= numHorizontalLines; i++) {
      const y = (priceChartHeight / numHorizontalLines) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(chartWidth, y);
      this.ctx.stroke();
    }

    // Vertical time grid lines (approximately every 80px)
    const numVerticalLines = Math.floor(chartWidth / 80);
    for (let i = 0; i <= numVerticalLines; i++) {
      const x = (chartWidth / numVerticalLines) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, priceChartHeight);
      this.ctx.stroke();
    }

    this.ctx.setLineDash([]);
  }

  /**
   * Draw price axis (right side of chart)
   */
  drawPriceAxis(
    dimensions: ChartDimensions,
    mapper: CoordinateMapper,
    _settings: ChartSettings
  ): void {
    const { chartWidth, priceChartHeight, priceAxisWidth } = dimensions;

    // Background
    this.ctx.fillStyle = this.theme.background;
    this.ctx.fillRect(chartWidth, 0, priceAxisWidth, priceChartHeight);

    // Price labels
    this.ctx.fillStyle = this.theme.textColor;
    this.ctx.font = '11px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';

    const numLabels = Math.floor(priceChartHeight / 50);
    for (let i = 0; i <= numLabels; i++) {
      const y = (priceChartHeight / numLabels) * i;
      const price = mapper.yToPrice(y);
      const label = formatPrice(price);

      this.ctx.fillText(label, chartWidth + 5, y);

      // Tick mark
      this.ctx.strokeStyle = this.theme.gridColor;
      this.ctx.beginPath();
      this.ctx.moveTo(chartWidth, y);
      this.ctx.lineTo(chartWidth + 5, y);
      this.ctx.stroke();
    }
  }

  /**
   * Draw time axis (bottom of chart)
   */
  drawTimeAxis(
    candles: Candle[],
    dimensions: ChartDimensions,
    mapper: CoordinateMapper,
    _settings: ChartSettings,
    startIndex: number,
    endIndex: number,
    timeframe: string
  ): void {
    const { chartWidth, priceChartHeight, timeAxisHeight } = dimensions;

    // Background
    this.ctx.fillStyle = this.theme.background;
    this.ctx.fillRect(0, priceChartHeight, chartWidth, timeAxisHeight);

    // Time labels
    this.ctx.fillStyle = this.theme.textColor;
    this.ctx.font = '11px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';

    const numLabels = Math.min(8, Math.floor(chartWidth / 100));
    const step = Math.max(1, Math.floor((endIndex - startIndex) / numLabels));

    for (let i = startIndex; i <= endIndex; i += step) {
      if (i >= candles.length) break;

      const candle = candles[i];
      const x = mapper.candleIndexToX(i);
      const label = formatTimestamp(candle.timestamp, timeframe);

      this.ctx.fillText(label, x, priceChartHeight + 5);

      // Tick mark
      this.ctx.strokeStyle = this.theme.gridColor;
      this.ctx.beginPath();
      this.ctx.moveTo(x, priceChartHeight);
      this.ctx.lineTo(x, priceChartHeight + 5);
      this.ctx.stroke();
    }
  }

  /**
   * Draw a single candlestick
   */
  drawCandle(
    candle: Candle,
    index: number,
    mapper: CoordinateMapper,
    settings: ChartSettings
  ): void {
    const x = mapper.candleIndexToX(index);
    const openY = mapper.priceToY(candle.open);
    const closeY = mapper.priceToY(candle.close);
    const highY = mapper.priceToY(candle.high);
    const lowY = mapper.priceToY(candle.low);

    const isUp = candle.close >= candle.open;
    const color = isUp ? this.theme.candleUp : this.theme.candleDown;

    // Draw wick
    this.ctx.strokeStyle = this.theme.wickColor;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(x, highY);
    this.ctx.lineTo(x, lowY);
    this.ctx.stroke();

    // Draw body
    const bodyHeight = Math.abs(closeY - openY);
    const bodyY = Math.min(openY, closeY);

    if (bodyHeight < 1) {
      // Doji - draw a line
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(x - settings.candleWidth / 2, openY);
      this.ctx.lineTo(x + settings.candleWidth / 2, openY);
      this.ctx.stroke();
    } else {
      // Normal candle
      this.ctx.fillStyle = color;
      this.ctx.fillRect(
        x - settings.candleWidth / 2,
        bodyY,
        settings.candleWidth,
        bodyHeight
      );
    }
  }

  /**
   * Draw all candlesticks in visible range
   */
  drawCandles(
    candles: Candle[],
    startIndex: number,
    endIndex: number,
    mapper: CoordinateMapper,
    settings: ChartSettings
  ): void {
    for (let i = startIndex; i <= endIndex && i < candles.length; i++) {
      this.drawCandle(candles[i], i, mapper, settings);
    }
  }

  /**
   * Draw volume bars
   */
  drawVolume(
    candles: Candle[],
    startIndex: number,
    endIndex: number,
    dimensions: ChartDimensions,
    mapper: CoordinateMapper,
    settings: ChartSettings
  ): void {
    if (!settings.showVolume) return;

    const { volumeHeight, priceChartHeight, chartWidth: _chartWidth } = dimensions;
    const volumeY = priceChartHeight;

    // Find max volume in visible range for scaling
    let maxVolume = 0;
    for (let i = startIndex; i <= endIndex && i < candles.length; i++) {
      maxVolume = Math.max(maxVolume, candles[i].volume);
    }

    if (maxVolume === 0) return;

    // Draw volume bars
    for (let i = startIndex; i <= endIndex && i < candles.length; i++) {
      const candle = candles[i];
      const x = mapper.candleIndexToX(i);
      const volumeRatio = candle.volume / maxVolume;
      const barHeight = volumeRatio * volumeHeight * 0.9; // 90% of available height

      const isUp = candle.close >= candle.open;
      this.ctx.fillStyle = isUp ? this.theme.volumeUp : this.theme.volumeDown;

      this.ctx.fillRect(
        x - settings.candleWidth / 2,
        volumeY + volumeHeight - barHeight,
        settings.candleWidth,
        barHeight
      );
    }
  }

  /**
   * Draw crosshair
   */
  drawCrosshair(
    x: number,
    y: number,
    dimensions: ChartDimensions,
    settings: ChartSettings
  ): void {
    if (!settings.showCrosshair) return;

    const { chartWidth, priceChartHeight } = dimensions;

    this.ctx.strokeStyle = this.theme.crosshairColor;
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([5, 5]);

    // Vertical line
    this.ctx.beginPath();
    this.ctx.moveTo(x, 0);
    this.ctx.lineTo(x, priceChartHeight);
    this.ctx.stroke();

    // Horizontal line
    this.ctx.beginPath();
    this.ctx.moveTo(0, y);
    this.ctx.lineTo(chartWidth, y);
    this.ctx.stroke();

    this.ctx.setLineDash([]);
  }

  /**
   * Draw price label at crosshair position
   */
  drawPriceLabel(
    price: number,
    y: number,
    dimensions: ChartDimensions
  ): void {
    const { chartWidth, priceAxisWidth } = dimensions;
    const label = formatPrice(price);

    // Background
    this.ctx.fillStyle = this.theme.crosshairColor;
    this.ctx.fillRect(chartWidth, y - 10, priceAxisWidth, 20);

    // Text
    this.ctx.fillStyle = this.theme.background;
    this.ctx.font = 'bold 11px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(label, chartWidth + priceAxisWidth / 2, y);
  }

  /**
   * Draw candle info panel (OHLCV data)
   */
  drawCandleInfo(
    candle: Candle,
    x: number,
    y: number
  ): void {
    const padding = 10;
    const lineHeight = 16;

    const lines = [
      `O: ${formatPrice(candle.open)}`,
      `H: ${formatPrice(candle.high)}`,
      `L: ${formatPrice(candle.low)}`,
      `C: ${formatPrice(candle.close)}`,
      `V: ${formatVolume(candle.volume)}`,
    ];

    const maxWidth = Math.max(
      ...lines.map((line) => this.ctx.measureText(line).width)
    );
    const boxWidth = maxWidth + padding * 2;
    const boxHeight = lines.length * lineHeight + padding * 2;

    // Background
    this.ctx.fillStyle = this.theme.background;
    this.ctx.globalAlpha = 0.9;
    this.ctx.fillRect(x, y, boxWidth, boxHeight);
    this.ctx.globalAlpha = 1.0;

    // Border
    this.ctx.strokeStyle = this.theme.gridColor;
    this.ctx.strokeRect(x, y, boxWidth, boxHeight);

    // Text
    this.ctx.fillStyle = this.theme.textColor;
    this.ctx.font = '12px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';

    lines.forEach((line, index) => {
      this.ctx.fillText(line, x + padding, y + padding + index * lineHeight);
    });
  }
}

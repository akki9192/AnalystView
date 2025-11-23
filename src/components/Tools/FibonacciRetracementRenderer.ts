/**
 * Fibonacci Retracement Renderer
 * Renders Fibonacci retracement levels
 */

import { ToolRenderer } from './ToolRenderer';
import type {
  DrawingTool,
  FibonacciRetracement,
  CoordinateMapper,
  CanvasPoint,
} from '../../types';

export class FibonacciRetracementRenderer extends ToolRenderer {
  /**
   * Render Fibonacci retracement levels on the chart
   */
  render(tool: DrawingTool, mapper: CoordinateMapper, isSelected: boolean): void {
    const fib = tool as FibonacciRetracement;

    if (!fib.points || fib.points.length < 2) return;
    if (!fib.visible) return;

    const [start, end] = fib.points;
    const startCanvas = mapper.chartToCanvas(start);
    const endCanvas = mapper.chartToCanvas(end);

    // Calculate price range
    const priceDiff = end.price - start.price;

    // Draw each enabled level
    fib.levels.forEach((level) => {
      if (!level.enabled) return;

      // Calculate level price
      const levelPrice = start.price + priceDiff * level.ratio;
      const y = mapper.priceToY(levelPrice);

      this.applyStyle(level.style);

      // Draw horizontal line
      this.ctx.beginPath();
      if (fib.extendLines) {
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(2000, y);
      } else {
        const minX = Math.min(startCanvas.x, endCanvas.x);
        const maxX = Math.max(startCanvas.x, endCanvas.x);
        this.ctx.moveTo(minX, y);
        this.ctx.lineTo(maxX, y);
      }
      this.ctx.stroke();

      // Draw label if enabled
      if (fib.showLabels) {
        const labelText = level.label || `${(level.ratio * 100).toFixed(1)}% (${levelPrice.toFixed(2)})`;
        const labelX = fib.extendLines ? 10 : Math.min(startCanvas.x, endCanvas.x) + 5;
        this.drawLabel(labelText, { x: labelX, y }, { x: 5, y: -5 });
      }

      this.resetStyle();
    });

    // Draw start and end points
    this.ctx.fillStyle = fib.style.color;
    this.ctx.strokeStyle = fib.style.color;
    this.drawPoint(startCanvas, isSelected ? 6 : 4);
    this.drawPoint(endCanvas, isSelected ? 6 : 4);

    // Draw connecting line
    this.applyStyle(fib.style);
    this.drawLine(startCanvas, endCanvas);
    this.resetStyle();

    // Draw selection highlight
    if (isSelected) {
      this.ctx.strokeStyle = '#3b82f6';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();
      this.ctx.arc(startCanvas.x, startCanvas.y, 12, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.arc(endCanvas.x, endCanvas.y, 12, 0, Math.PI * 2);
      this.ctx.stroke();
      this.resetStyle();
    }
  }

  /**
   * Hit test for selection
   */
  hitTest(
    tool: DrawingTool,
    point: CanvasPoint,
    mapper: CoordinateMapper,
    threshold: number = 10
  ): boolean {
    const fib = tool as FibonacciRetracement;

    if (!fib.points || fib.points.length < 2) return false;

    // Check if clicking near start or end point
    const [start, end] = fib.points;
    const startCanvas = mapper.chartToCanvas(start);
    const endCanvas = mapper.chartToCanvas(end);

    const distToStart = Math.sqrt(
      Math.pow(point.x - startCanvas.x, 2) + Math.pow(point.y - startCanvas.y, 2)
    );
    const distToEnd = Math.sqrt(
      Math.pow(point.x - endCanvas.x, 2) + Math.pow(point.y - endCanvas.y, 2)
    );

    if (distToStart <= threshold || distToEnd <= threshold) {
      return true;
    }

    // Check if clicking near any level line
    const priceDiff = end.price - start.price;
    for (const level of fib.levels) {
      if (!level.enabled) continue;

      const levelPrice = start.price + priceDiff * level.ratio;
      const y = mapper.priceToY(levelPrice);

      if (Math.abs(point.y - y) <= threshold) {
        return true;
      }
    }

    return false;
  }
}

/**
 * Horizontal Line Renderer
 * Renders horizontal lines (support/resistance levels)
 */

import { ToolRenderer } from './ToolRenderer';
import type {
  DrawingTool,
  HorizontalLine,
  CoordinateMapper,
  CanvasPoint,
} from '../../types';

export class HorizontalLineRenderer extends ToolRenderer {
  /**
   * Render horizontal line on the chart
   */
  render(tool: DrawingTool, mapper: CoordinateMapper, isSelected: boolean): void {
    const hLine = tool as HorizontalLine;

    if (!hLine.points || hLine.points.length < 1) return;
    if (!hLine.visible) return;

    this.applyStyle(hLine.style);

    const priceLevel = hLine.points[0].price;
    const y = mapper.priceToY(priceLevel);

    // Draw horizontal line across entire chart
    this.ctx.beginPath();
    this.ctx.moveTo(0, y);
    this.ctx.lineTo(2000, y); // Extend beyond visible area
    this.ctx.stroke();

    this.resetStyle();

    // Draw price label
    const labelX = 10;
    this.ctx.fillStyle = hLine.style.color;
    this.ctx.strokeStyle = hLine.style.color;

    if (hLine.name) {
      this.drawLabel(`${hLine.name}: ${priceLevel.toFixed(2)}`, { x: labelX, y }, { x: 5, y: -5 });
    } else {
      this.drawLabel(priceLevel.toFixed(2), { x: labelX, y }, { x: 5, y: -5 });
    }

    // Draw selection highlight
    if (isSelected) {
      this.ctx.strokeStyle = '#3b82f6';
      this.ctx.lineWidth = 3;
      this.ctx.setLineDash([10, 5]);
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(2000, y);
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
    const hLine = tool as HorizontalLine;

    if (!hLine.points || hLine.points.length < 1) return false;

    const priceLevel = hLine.points[0].price;
    const y = mapper.priceToY(priceLevel);

    return Math.abs(point.y - y) <= threshold;
  }
}

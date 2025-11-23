/**
 * Vertical Line Renderer
 * Renders vertical lines (time markers)
 */

import { ToolRenderer } from './ToolRenderer';
import type {
  DrawingTool,
  VerticalLine,
  CoordinateMapper,
  CanvasPoint,
} from '../../types';

export class VerticalLineRenderer extends ToolRenderer {
  /**
   * Render vertical line on the chart
   */
  render(tool: DrawingTool, mapper: CoordinateMapper, isSelected: boolean): void {
    const vLine = tool as VerticalLine;

    if (!vLine.points || vLine.points.length < 1) return;
    if (!vLine.visible) return;

    this.applyStyle(vLine.style);

    const timestamp = vLine.points[0].timestamp;
    const x = mapper.timeToX(timestamp);

    // Draw vertical line across entire chart
    this.ctx.beginPath();
    this.ctx.moveTo(x, 0);
    this.ctx.lineTo(x, 2000); // Extend beyond visible area
    this.ctx.stroke();

    this.resetStyle();

    // Draw timestamp label
    const labelY = 20;
    this.ctx.fillStyle = vLine.style.color;
    this.ctx.strokeStyle = vLine.style.color;

    const date = new Date(timestamp);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (vLine.name) {
      this.drawLabel(`${vLine.name}: ${dateStr}`, { x, y: labelY }, { x: 5, y: 0 });
    } else {
      this.drawLabel(dateStr, { x, y: labelY }, { x: 5, y: 0 });
    }

    // Draw selection highlight
    if (isSelected) {
      this.ctx.strokeStyle = '#3b82f6';
      this.ctx.lineWidth = 3;
      this.ctx.setLineDash([10, 5]);
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, 2000);
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
    const vLine = tool as VerticalLine;

    if (!vLine.points || vLine.points.length < 1) return false;

    const timestamp = vLine.points[0].timestamp;
    const x = mapper.timeToX(timestamp);

    return Math.abs(point.x - x) <= threshold;
  }
}

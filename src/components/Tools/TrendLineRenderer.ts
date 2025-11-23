/**
 * Trend Line Renderer
 * Renders simple trendlines between two points
 */

import { ToolRenderer } from './ToolRenderer';
import type {
  DrawingTool,
  TrendLine,
  CoordinateMapper,
  CanvasPoint,
} from '../../types';

export class TrendLineRenderer extends ToolRenderer {
  /**
   * Render trendline on the chart
   */
  render(tool: DrawingTool, mapper: CoordinateMapper, isSelected: boolean): void {
    const trendLine = tool as TrendLine;

    if (!trendLine.points || trendLine.points.length < 2) return;
    if (!trendLine.visible) return;

    this.applyStyle(trendLine.style);

    const start = mapper.chartToCanvas(trendLine.points[0]);
    const end = mapper.chartToCanvas(trendLine.points[1]);

    // Draw the line
    if (trendLine.extend) {
      // Extend line beyond endpoints
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const unitX = dx / length;
      const unitY = dy / length;

      const extendDistance = 2000; // Extend far beyond visible area

      const extendedStart = {
        x: start.x - unitX * extendDistance,
        y: start.y - unitY * extendDistance,
      };
      const extendedEnd = {
        x: end.x + unitX * extendDistance,
        y: end.y + unitY * extendDistance,
      };

      this.drawLine(extendedStart, extendedEnd);
    } else {
      this.drawLine(start, end);
    }

    this.resetStyle();

    // Draw endpoints
    this.ctx.fillStyle = trendLine.style.color;
    this.ctx.strokeStyle = trendLine.style.color;
    this.drawPoint(start, isSelected ? 5 : 3);
    this.drawPoint(end, isSelected ? 5 : 3);

    // Draw label
    if (trendLine.name) {
      const midPoint = {
        x: (start.x + end.x) / 2,
        y: (start.y + end.y) / 2,
      };
      this.drawLabel(trendLine.name, midPoint, { x: 5, y: -5 });
    }

    // Draw selection highlight
    if (isSelected) {
      this.ctx.strokeStyle = '#3b82f6';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);
      this.drawLine(start, end);
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
    const trendLine = tool as TrendLine;

    if (!trendLine.points || trendLine.points.length < 2) return false;

    const start = mapper.chartToCanvas(trendLine.points[0]);
    const end = mapper.chartToCanvas(trendLine.points[1]);

    // Check distance from point to line segment
    const distance = this.distanceToLineSegment(point, start, end);

    return distance <= threshold;
  }

  /**
   * Calculate distance from point to line segment
   */
  private distanceToLineSegment(
    point: CanvasPoint,
    start: CanvasPoint,
    end: CanvasPoint
  ): number {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
      // Start and end are the same point
      const distX = point.x - start.x;
      const distY = point.y - start.y;
      return Math.sqrt(distX * distX + distY * distY);
    }

    // Calculate projection of point onto line
    let t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t));

    const projectionX = start.x + t * dx;
    const projectionY = start.y + t * dy;

    const distX = point.x - projectionX;
    const distY = point.y - projectionY;

    return Math.sqrt(distX * distX + distY * distY);
  }
}

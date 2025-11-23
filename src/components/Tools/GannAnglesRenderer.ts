/**
 * Gann Angles Renderer
 * Renders Gann angles with proper price/time scaling
 */

import { ToolRenderer } from './ToolRenderer';
import type {
  DrawingTool,
  GannAngles,
  CoordinateMapper,
  CanvasPoint,
} from '../../types';
import { calculateGannAngleLine } from '../../utils/gannCalculations';

export class GannAnglesRenderer extends ToolRenderer {
  /**
   * Render Gann angles on the chart
   */
  render(tool: DrawingTool, mapper: CoordinateMapper, isSelected: boolean): void {
    const gannTool = tool as GannAngles;

    if (!gannTool.points || gannTool.points.length < 1) return;
    if (!gannTool.visible) return;

    const origin = gannTool.points[0];
    const originCanvas = mapper.chartToCanvas(origin);

    // Get visible time range from the mapper to extend lines
    const chartWidth = 2000; // Extend lines beyond visible area
    const leftTime = mapper.xToTime(-chartWidth);
    const rightTime = mapper.xToTime(chartWidth);

    // Draw each enabled angle
    gannTool.angles.forEach((angle) => {
      if (!angle.enabled) return;

      this.applyStyle(angle.style);

      // Calculate angle line points
      const linePoints = calculateGannAngleLine(
        origin,
        angle.ratio,
        gannTool.direction,
        leftTime,
        rightTime,
        gannTool.priceScale,
        gannTool.timeScale
      );

      if (linePoints.length < 2) return;

      // Convert to canvas coordinates and draw
      const canvasPoints = linePoints.map((p) => mapper.chartToCanvas(p));

      this.ctx.beginPath();
      this.ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y);
      for (let i = 1; i < canvasPoints.length; i++) {
        this.ctx.lineTo(canvasPoints[i].x, canvasPoints[i].y);
      }
      this.ctx.stroke();

      // Draw label at the end of the line
      const lastPoint = canvasPoints[canvasPoints.length - 1];
      this.drawLabel(`${angle.ratio}`, lastPoint, { x: 5, y: 0 });

      this.resetStyle();
    });

    // Draw origin point
    this.ctx.fillStyle = gannTool.style.color;
    this.ctx.strokeStyle = gannTool.style.color;
    this.drawPoint(originCanvas, isSelected ? 6 : 4);

    // Draw origin label
    if (gannTool.name) {
      this.drawLabel(gannTool.name, originCanvas, { x: 8, y: -8 });
    }

    // Draw selection highlight
    if (isSelected) {
      this.ctx.strokeStyle = '#3b82f6';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();
      this.ctx.arc(originCanvas.x, originCanvas.y, 12, 0, Math.PI * 2);
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
    const gannTool = tool as GannAngles;

    if (!gannTool.points || gannTool.points.length < 1) return false;

    // Check if clicking near origin point
    const origin = gannTool.points[0];
    const originCanvas = mapper.chartToCanvas(origin);

    const dx = point.x - originCanvas.x;
    const dy = point.y - originCanvas.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance <= threshold;
  }
}

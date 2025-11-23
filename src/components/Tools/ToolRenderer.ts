/**
 * Tool Renderer Base Class
 * Handles rendering of drawing tools on the chart canvas
 */

import type {
  DrawingTool,
  CanvasPoint,
  CoordinateMapper,
  DrawingStyle,
} from '../../types';

/**
 * Base class for all tool renderers
 */
export abstract class ToolRenderer {
  protected ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /**
   * Apply drawing style to context
   */
  protected applyStyle(style: DrawingStyle): void {
    this.ctx.strokeStyle = style.color;
    this.ctx.lineWidth = style.width;
    this.ctx.globalAlpha = style.opacity ?? 1.0;

    switch (style.lineStyle) {
      case 'dashed':
        this.ctx.setLineDash([5, 5]);
        break;
      case 'dotted':
        this.ctx.setLineDash([2, 2]);
        break;
      default:
        this.ctx.setLineDash([]);
    }
  }

  /**
   * Reset context to defaults
   */
  protected resetStyle(): void {
    this.ctx.setLineDash([]);
    this.ctx.globalAlpha = 1.0;
  }

  /**
   * Draw a line between two canvas points
   */
  protected drawLine(from: CanvasPoint, to: CanvasPoint): void {
    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.stroke();
  }

  /**
   * Draw a point/marker at a location
   */
  protected drawPoint(point: CanvasPoint, radius: number = 4): void {
    this.ctx.beginPath();
    this.ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();
  }

  /**
   * Draw text label
   */
  protected drawLabel(
    text: string,
    point: CanvasPoint,
    offset: { x: number; y: number } = { x: 5, y: -5 }
  ): void {
    this.ctx.fillStyle = this.ctx.strokeStyle;
    this.ctx.font = '11px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'bottom';
    this.ctx.fillText(text, point.x + offset.x, point.y + offset.y);
  }

  /**
   * Abstract render method - must be implemented by subclasses
   */
  abstract render(tool: DrawingTool, mapper: CoordinateMapper, isSelected: boolean): void;

  /**
   * Check if a point is near the tool (for selection/interaction)
   */
  abstract hitTest(
    tool: DrawingTool,
    point: CanvasPoint,
    mapper: CoordinateMapper,
    threshold: number
  ): boolean;
}

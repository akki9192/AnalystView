/**
 * Tool Manager
 * Manages rendering and interaction with all drawing tools
 */

import { ToolRenderer } from './ToolRenderer';
import { GannAnglesRenderer } from './GannAnglesRenderer';
import { TrendLineRenderer } from './TrendLineRenderer';
import { HorizontalLineRenderer } from './HorizontalLineRenderer';
import { VerticalLineRenderer } from './VerticalLineRenderer';
import { FibonacciRetracementRenderer } from './FibonacciRetracementRenderer';
import type { DrawingTool, CoordinateMapper, CanvasPoint } from '../../types';

export class ToolManager {
  private renderers: Map<string, ToolRenderer>;

  constructor(ctx: CanvasRenderingContext2D) {
    this.renderers = new Map();

    // Register tool renderers
    this.renderers.set('gann_angles', new GannAnglesRenderer(ctx));
    this.renderers.set('trendline', new TrendLineRenderer(ctx));
    this.renderers.set('horizontal_line', new HorizontalLineRenderer(ctx));
    this.renderers.set('vertical_line', new VerticalLineRenderer(ctx));
    this.renderers.set('fibonacci_retracement', new FibonacciRetracementRenderer(ctx));
  }

  /**
   * Render all tools
   */
  renderTools(
    tools: DrawingTool[],
    mapper: CoordinateMapper,
    selectedToolId: string | null
  ): void {
    // Render in order (bottom to top)
    tools.forEach((tool) => {
      if (!tool.visible) return;

      const renderer = this.renderers.get(tool.type);
      if (!renderer) {
        console.warn(`No renderer found for tool type: ${tool.type}`);
        return;
      }

      const isSelected = tool.id === selectedToolId;
      renderer.render(tool, mapper, isSelected);
    });
  }

  /**
   * Find tool at given point (for selection)
   */
  findToolAtPoint(
    tools: DrawingTool[],
    point: CanvasPoint,
    mapper: CoordinateMapper,
    threshold: number = 10
  ): DrawingTool | null {
    // Search in reverse order (top to bottom)
    for (let i = tools.length - 1; i >= 0; i--) {
      const tool = tools[i];
      if (!tool.visible) continue;

      const renderer = this.renderers.get(tool.type);
      if (!renderer) continue;

      if (renderer.hitTest(tool, point, mapper, threshold)) {
        return tool;
      }
    }

    return null;
  }

  /**
   * Update context (for theme changes)
   */
  updateContext(ctx: CanvasRenderingContext2D): void {
    this.renderers.forEach((renderer) => {
      (renderer as any).ctx = ctx;
    });
  }
}

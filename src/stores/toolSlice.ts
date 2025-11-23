/**
 * Tool state slice
 * Manages drawing tools and user interactions
 */

import type { StateCreator } from 'zustand';
import { ToolType } from '../types';
import type { AppState, ToolState, DrawingTool, ToolInteraction } from '../types';

/**
 * Default tool interaction state
 */
const defaultInteraction: ToolInteraction = {
  activeTool: ToolType.CURSOR,
  selectedToolId: null,
  isDrawing: false,
  isDragging: false,
  hoverToolId: null,
  tempPoints: [],
};

/**
 * Create tool state slice
 */
export const createToolSlice: StateCreator<
  AppState,
  [],
  [],
  ToolState
> = (set) => ({
  // Initial state
  tools: [],
  interaction: defaultInteraction,

  // Actions
  addTool: (tool: DrawingTool) =>
    set((state) => ({
      tools: [...state.tools, tool],
    })),

  updateTool: (id: string, updates: Partial<DrawingTool>) =>
    set((state) => ({
      tools: state.tools.map((tool) =>
        tool.id === id
          ? ({ ...tool, ...updates, modifiedAt: Date.now() } as DrawingTool)
          : tool
      ),
    })),

  deleteTool: (id: string) =>
    set((state) => ({
      tools: state.tools.filter((tool) => tool.id !== id),
      interaction: {
        ...state.interaction,
        selectedToolId:
          state.interaction.selectedToolId === id
            ? null
            : state.interaction.selectedToolId,
      },
    })),

  clearTools: () =>
    set({
      tools: [],
      interaction: defaultInteraction,
    }),

  setActiveTool: (type: ToolType) =>
    set((state) => ({
      interaction: {
        ...state.interaction,
        activeTool: type,
        isDrawing: false,
        tempPoints: [],
      },
    })),

  setSelectedTool: (id: string | null) =>
    set((state) => ({
      interaction: {
        ...state.interaction,
        selectedToolId: id,
      },
    })),

  setIsDrawing: (drawing: boolean) =>
    set((state) => ({
      interaction: {
        ...state.interaction,
        isDrawing: drawing,
      },
    })),

  setIsDragging: (dragging: boolean) =>
    set((state) => ({
      interaction: {
        ...state.interaction,
        isDragging: dragging,
      },
    })),

  setHoverTool: (id: string | null) =>
    set((state) => ({
      interaction: {
        ...state.interaction,
        hoverToolId: id,
      },
    })),

  updateTempPoints: (points: any[]) =>
    set((state) => ({
      interaction: {
        ...state.interaction,
        tempPoints: points,
      },
    })),
});

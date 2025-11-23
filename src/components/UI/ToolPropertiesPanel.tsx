/**
 * Tool Properties Panel
 * Displays and allows editing of selected tool properties
 */

import React from 'react';
import { useStore, useTools, useSelectedTool } from '../../stores/useStore';
import type { GannAngles, TrendLine } from '../../types';

export const ToolPropertiesPanel: React.FC = () => {
  const tools = useTools();
  const selectedToolId = useSelectedTool();
  const updateTool = useStore((state) => state.updateTool);
  const deleteTool = useStore((state) => state.deleteTool);
  const setSelectedTool = useStore((state) => state.setSelectedTool);

  // Find the selected tool
  const selectedTool = tools.find((t) => t.id === selectedToolId);

  if (!selectedTool) {
    return null;
  }

  const handleColorChange = (color: string) => {
    updateTool(selectedTool.id, {
      style: { ...selectedTool.style, color },
    });
  };

  const handleWidthChange = (width: number) => {
    updateTool(selectedTool.id, {
      style: { ...selectedTool.style, width },
    });
  };

  const handleLineStyleChange = (lineStyle: 'solid' | 'dashed' | 'dotted') => {
    updateTool(selectedTool.id, {
      style: { ...selectedTool.style, lineStyle },
    });
  };

  const handleVisibilityToggle = () => {
    updateTool(selectedTool.id, {
      visible: !selectedTool.visible,
    });
  };

  const handleLockToggle = () => {
    updateTool(selectedTool.id, {
      locked: !selectedTool.locked,
    });
  };

  const handleDelete = () => {
    deleteTool(selectedTool.id);
    setSelectedTool(null);
  };

  const handleNameChange = (name: string) => {
    updateTool(selectedTool.id, { name });
  };

  // Render type-specific properties
  const renderTypeSpecificProps = () => {
    switch (selectedTool.type) {
      case 'gann_angles': {
        const gann = selectedTool as GannAngles;
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1">Direction</label>
              <select
                value={gann.direction}
                onChange={(e) =>
                  updateTool(selectedTool.id, {
                    direction: e.target.value as 'up' | 'down',
                  })
                }
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              >
                <option value="up">Up</option>
                <option value="down">Down</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Square Mode</label>
              <select
                value={gann.squareMode}
                onChange={(e) =>
                  updateTool(selectedTool.id, {
                    squareMode: e.target.value as 'price' | 'time' | 'manual',
                  })
                }
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              >
                <option value="price">Price</option>
                <option value="time">Time</option>
                <option value="manual">Manual</option>
              </select>
            </div>
          </div>
        );
      }
      case 'trendline': {
        const trend = selectedTool as TrendLine;
        return (
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={trend.extend}
                onChange={(e) =>
                  updateTool(selectedTool.id, { extend: e.target.checked })
                }
                className="rounded"
              />
              <span className="text-sm">Extend Line</span>
            </label>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="absolute top-16 right-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Tool Properties</h3>
        <button
          onClick={() => setSelectedTool(null)}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          title="Close"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        {/* Tool Type */}
        <div>
          <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
            Type
          </label>
          <div className="text-sm font-medium capitalize">
            {selectedTool.type.replace(/_/g, ' ')}
          </div>
        </div>

        {/* Name */}
        {('name' in selectedTool) && (
          <div>
            <label className="block text-xs font-medium mb-1">Name</label>
            <input
              type="text"
              value={(selectedTool as any).name || ''}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Tool name"
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
            />
          </div>
        )}

        {/* Color */}
        <div>
          <label className="block text-xs font-medium mb-1">Color</label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={selectedTool.style.color}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-12 h-8 rounded cursor-pointer"
            />
            <input
              type="text"
              value={selectedTool.style.color}
              onChange={(e) => handleColorChange(e.target.value)}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
            />
          </div>
        </div>

        {/* Line Width */}
        <div>
          <label className="block text-xs font-medium mb-1">
            Line Width: {selectedTool.style.width}px
          </label>
          <input
            type="range"
            min="1"
            max="5"
            value={selectedTool.style.width}
            onChange={(e) => handleWidthChange(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Line Style */}
        <div>
          <label className="block text-xs font-medium mb-1">Line Style</label>
          <select
            value={selectedTool.style.lineStyle}
            onChange={(e) =>
              handleLineStyleChange(e.target.value as 'solid' | 'dashed' | 'dotted')
            }
            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
          >
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
            <option value="dotted">Dotted</option>
          </select>
        </div>

        {/* Type-specific properties */}
        {renderTypeSpecificProps()}

        {/* Visibility & Lock */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedTool.visible}
              onChange={handleVisibilityToggle}
              className="rounded"
            />
            <span className="text-sm">Visible</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedTool.locked}
              onChange={handleLockToggle}
              className="rounded"
            />
            <span className="text-sm">Locked</span>
          </label>
        </div>

        {/* Delete Button */}
        <button
          onClick={handleDelete}
          className="w-full px-3 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
        >
          Delete Tool
        </button>
      </div>
    </div>
  );
};

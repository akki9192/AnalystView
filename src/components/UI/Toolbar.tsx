/**
 * Toolbar Component
 * Drawing tools selection toolbar
 */

import React from 'react';
import { useStore, useActiveTool } from '../../stores/useStore';
import { ToolType } from '../../types';
import clsx from 'clsx';

interface ToolButton {
  type: ToolType;
  label: string;
  icon: string;
}

const TOOLS: ToolButton[] = [
  { type: ToolType.CURSOR, label: 'Cursor', icon: '↖' },
  { type: ToolType.CROSSHAIR, label: 'Crosshair', icon: '✛' },
  { type: ToolType.TRENDLINE, label: 'Trendline', icon: '⟋' },
  { type: ToolType.HORIZONTAL_LINE, label: 'Horizontal', icon: '─' },
  { type: ToolType.VERTICAL_LINE, label: 'Vertical', icon: '│' },
  { type: ToolType.GANN_ANGLES, label: 'Gann Angles', icon: '⦨' },
];

export const Toolbar: React.FC = () => {
  const activeTool = useActiveTool();
  const setActiveTool = useStore((state) => state.setActiveTool);

  return (
    <div className="flex flex-col space-y-1 p-2 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      {TOOLS.map((tool) => (
        <button
          key={tool.type}
          onClick={() => setActiveTool(tool.type)}
          className={clsx(
            'p-2 rounded text-center transition-colors',
            activeTool === tool.type
              ? 'bg-blue-500 text-white'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          )}
          title={tool.label}
        >
          <span className="text-xl">{tool.icon}</span>
        </button>
      ))}
    </div>
  );
};

'use client';

import { memo } from 'react';
import { Square, Move, Type, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { ToolMode, ApartmentTemplate, UtilityTemplate } from '../svg-builder.types';
import {
  APARTMENT_TEMPLATES,
  COMPLEX_APARTMENT_TEMPLATES,
  UTILITY_TEMPLATES,
} from '../svg-builder.constants';

// =============================================================================
// Templates Panel
// =============================================================================

interface TemplatesPanelProps {
  onAddTemplate: (template: ApartmentTemplate) => void;
  onAddUtility: (template: UtilityTemplate) => void;
}

export const TemplatesPanel = memo(function TemplatesPanel({
  onAddTemplate,
  onAddUtility,
}: TemplatesPanelProps) {
  return (
    <div className="space-y-4">
      {/* Basic Apartments */}
      <div>
        <h3 className="text-sm font-medium mb-3">Basic Apartments</h3>
        <div className="grid grid-cols-2 gap-2">
          {APARTMENT_TEMPLATES.map((template) => (
            <Button
              key={template.id}
              variant="outline"
              className="h-20 flex-col cursor-grab active:cursor-grabbing"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  'application/svg-template',
                  JSON.stringify({ kind: 'apartment', template })
                );
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => onAddTemplate(template)}
            >
              <template.icon className="h-6 w-6 mb-1" />
              <span className="text-xs">{template.name}</span>
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Complex Shapes */}
      <div>
        <h3 className="text-sm font-medium mb-3">Complex Shapes</h3>
        <div className="grid grid-cols-2 gap-2">
          {COMPLEX_APARTMENT_TEMPLATES.map((template) => (
            <Button
              key={template.id}
              variant="outline"
              className="h-20 flex-col p-2 cursor-grab active:cursor-grabbing"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  'application/svg-template',
                  JSON.stringify({ kind: 'apartment', template })
                );
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => onAddTemplate(template)}
            >
              <svg
                viewBox={`0 0 ${template.width} ${template.height}`}
                className="w-8 h-8 mb-1"
              >
                <polygon
                  points={template.points}
                  fill="currentColor"
                  opacity="0.3"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
              <span className="text-xs">{template.name}</span>
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Utility Rooms */}
      <div>
        <h3 className="text-sm font-medium mb-3">Utility Rooms</h3>
        <div className="grid grid-cols-2 gap-2">
          {UTILITY_TEMPLATES.map((template) => (
            <Button
              key={template.id}
              variant="outline"
              className="h-20 flex-col gap-1 cursor-grab active:cursor-grabbing"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  'application/svg-template',
                  JSON.stringify({ kind: 'utility', template })
                );
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => onAddUtility(template)}
            >
              <template.icon
                className="h-5 w-5"
                style={{ color: template.iconColor }}
              />
              <span className="text-xs">{template.name}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
});

// =============================================================================
// Tools Panel
// =============================================================================

interface ToolsPanelProps {
  activeTool: ToolMode;
  snapToGrid: boolean;
  hasSelection: boolean;
  onSetActiveTool: (tool: ToolMode) => void;
  onToggleSnapToGrid: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export const ToolsPanel = memo(function ToolsPanel({
  activeTool,
  snapToGrid,
  hasSelection,
  onSetActiveTool,
  onToggleSnapToGrid,
  onDuplicate,
  onDelete,
}: ToolsPanelProps) {
  return (
    <div className="space-y-4">
      {/* Drawing Tools */}
      <div>
        <h3 className="text-sm font-medium mb-3">Drawing Tools</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={activeTool === 'select' ? 'secondary' : 'outline'}
            onClick={() => onSetActiveTool('select')}
          >
            <Move className="h-4 w-4 mr-1" />
            Select
          </Button>
          <Button
            variant={activeTool === 'rect' ? 'secondary' : 'outline'}
            onClick={() => onSetActiveTool('rect')}
          >
            <Square className="h-4 w-4 mr-1" />
            Rectangle
          </Button>
          <Button
            variant={activeTool === 'text' ? 'secondary' : 'outline'}
            onClick={() => onSetActiveTool('text')}
          >
            <Type className="h-4 w-4 mr-1" />
            Text
          </Button>
        </div>
      </div>

      <Separator />

      {/* Actions */}
      <div>
        <h3 className="text-sm font-medium mb-3">Actions</h3>
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={onDuplicate}
            disabled={!hasSelection}
          >
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start text-destructive"
            onClick={onDelete}
            disabled={!hasSelection}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <Separator />

      {/* Settings */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Snap to Grid</Label>
          <Button
            variant={snapToGrid ? 'secondary' : 'outline'}
            size="sm"
            onClick={onToggleSnapToGrid}
          >
            {snapToGrid ? 'On' : 'Off'}
          </Button>
        </div>
      </div>
    </div>
  );
});

'use client';

import { memo } from 'react';
import {
  Undo,
  Redo,
  ZoomOut,
  ZoomIn,
  Grid3x3,
  Move,
  Download,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { ToolbarProps } from '../svg-builder.types';

export const SvgToolbar = memo(function SvgToolbar({
  historyIndex,
  historyLength,
  zoom,
  showGrid,
  panMode,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onToggleGrid,
  onTogglePan,
  onDownload,
  onSave,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Undo/Redo */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onUndo}
        disabled={historyIndex === 0}
      >
        <Undo className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRedo}
        disabled={historyIndex === historyLength - 1}
      >
        <Redo className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Zoom */}
      <Button variant="ghost" size="sm" onClick={onZoomOut}>
        <ZoomOut className="h-4 w-4" />
      </Button>
      <span className="text-sm min-w-[50px] text-center">
        {Math.round(zoom * 100)}%
      </span>
      <Button variant="ghost" size="sm" onClick={onZoomIn}>
        <ZoomIn className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Grid */}
      <Button
        variant={showGrid ? 'secondary' : 'ghost'}
        size="sm"
        onClick={onToggleGrid}
      >
        <Grid3x3 className="h-4 w-4" />
      </Button>

      {/* Pan Mode */}
      <Button
        variant={panMode ? 'secondary' : 'ghost'}
        size="sm"
        onClick={onTogglePan}
        title="Pan Mode (move camera instead of elements)"
      >
        <Move className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Download */}
      <Button variant="outline" size="sm" onClick={onDownload}>
        <Download className="h-4 w-4 mr-1" />
        Download
      </Button>

      {onSave && (
        <Button size="sm" onClick={onSave}>
          <Upload className="h-4 w-4 mr-1" />
          Save
        </Button>
      )}
    </div>
  );
});

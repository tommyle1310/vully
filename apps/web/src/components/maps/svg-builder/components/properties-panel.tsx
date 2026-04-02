'use client';

import { memo } from 'react';
import { Move, RotateCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { PropertiesPanelProps } from '../svg-builder.types';
import { SCALE_FACTOR } from '../svg-builder.constants';

export const PropertiesPanel = memo(function PropertiesPanel({
  selectedElement,
  floorHeight,
  onSetFloorHeight,
  onUpdateElement,
  onSubRectChange,
  checkOverlaps,
}: PropertiesPanelProps) {
  return (
    <div className="space-y-4">
      {/* Global Floor Properties */}
      <FloorProperties floorHeight={floorHeight} onSetFloorHeight={onSetFloorHeight} />

      <Separator />

      {selectedElement ? (
        <ElementProperties
          element={selectedElement}
          onUpdateElement={onUpdateElement}
          onSubRectChange={onSubRectChange}
          checkOverlaps={checkOverlaps}
        />
      ) : (
        <EmptyState />
      )}
    </div>
  );
});

// =============================================================================
// Floor Properties
// =============================================================================

interface FloorPropertiesProps {
  floorHeight: number;
  onSetFloorHeight: (height: number) => void;
}

const FloorProperties = memo(function FloorProperties({
  floorHeight,
  onSetFloorHeight,
}: FloorPropertiesProps) {
  return (
    <div>
      <h3 className="text-sm font-medium mb-3">Floor Properties</h3>
      <div className="space-y-3">
        <div>
          <Label className="text-xs">Floor Height (meters)</Label>
          <Input
            type="number"
            step="0.1"
            min="2"
            max="10"
            value={floorHeight}
            onChange={(e) => onSetFloorHeight(Number(e.target.value))}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Default: 3.0m. Used for 3D rendering.
          </p>
        </div>
      </div>
    </div>
  );
});

// =============================================================================
// Element Properties
// =============================================================================

interface ElementPropertiesProps {
  element: NonNullable<PropertiesPanelProps['selectedElement']>;
  onUpdateElement: PropertiesPanelProps['onUpdateElement'];
  onSubRectChange: PropertiesPanelProps['onSubRectChange'];
  checkOverlaps: PropertiesPanelProps['checkOverlaps'];
}

const ElementProperties = memo(function ElementProperties({
  element,
  onUpdateElement,
  onSubRectChange,
  checkOverlaps,
}: ElementPropertiesProps) {
  const hasOverlap = checkOverlaps(element.id);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium mb-3">Element Properties</h3>

      <div className="space-y-3">
        {/* Apartment ID */}
        {element.apartmentId && (
          <div>
            <Label className="text-xs text-muted-foreground">Apartment ID (auto)</Label>
            <div className="mt-1 px-3 py-2 border rounded-md bg-muted text-sm text-muted-foreground font-mono">
              {element.apartmentId}
            </div>
          </div>
        )}

        {/* Utility Type */}
        {element.utilityType && (
          <div>
            <Label className="text-xs text-muted-foreground">Utility Type</Label>
            <div className="mt-1 px-3 py-2 border rounded-md bg-muted text-sm capitalize">
              {element.utilityType}
            </div>
          </div>
        )}

        {/* Apartment Type */}
        {element.apartmentType && (
          <div>
            <Label className="text-xs">Type</Label>
            <div className="mt-1 px-3 py-2 border rounded-md bg-muted text-sm">
              {element.apartmentType}
            </div>
          </div>
        )}

        {/* Apartment Name */}
        <div>
          <Label className="text-xs">Apartment Name</Label>
          <Input
            value={element.apartmentName || ''}
            onChange={(e) => onUpdateElement(element.id, { apartmentName: e.target.value })}
            placeholder="Sunset View"
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Optional custom name for this apartment
          </p>
        </div>

        {/* Label */}
        <div>
          <Label className="text-xs">Label (Unit Number)</Label>
          <Input
            value={element.label || ''}
            onChange={(e) => onUpdateElement(element.id, { label: e.target.value })}
            placeholder="101"
            className="mt-1"
          />
        </div>

        {/* Position */}
        <PositionInputs element={element} onUpdateElement={onUpdateElement} />

        {/* Size (for rectangles) */}
        {element.type === 'rect' && (
          <SizeInputs element={element} onUpdateElement={onUpdateElement} />
        )}

        {/* Sub-rect editing for polygons */}
        {element.type === 'polygon' && element.subRects && (
          <SubRectEditor
            element={element}
            onSubRectChange={onSubRectChange}
          />
        )}

        {/* Rotation */}
        <RotationControls element={element} onUpdateElement={onUpdateElement} />

        {/* Interior Details — apartments only */}
        {element.apartmentId && (
          <InteriorDetails element={element} onUpdateElement={onUpdateElement} />
        )}

        {/* Colors */}
        <ColorInputs element={element} onUpdateElement={onUpdateElement} />

        {/* Text content */}
        {element.type === 'text' && (
          <div>
            <Label className="text-xs">Text Content</Label>
            <Input
              value={element.text}
              onChange={(e) => onUpdateElement(element.id, { text: e.target.value })}
              className="mt-1"
            />
          </div>
        )}

        {/* Overlap Warning */}
        {hasOverlap && <OverlapWarning />}
      </div>
    </div>
  );
});

// =============================================================================
// Position Inputs
// =============================================================================

const PositionInputs = memo(function PositionInputs({
  element,
  onUpdateElement,
}: {
  element: ElementPropertiesProps['element'];
  onUpdateElement: ElementPropertiesProps['onUpdateElement'];
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <Label className="text-xs">X (m)</Label>
        <Input
          type="number"
          step="0.5"
          value={Number((element.x / SCALE_FACTOR).toFixed(2))}
          onChange={(e) =>
            onUpdateElement(element.id, { x: Number(e.target.value) * SCALE_FACTOR })
          }
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Y (m)</Label>
        <Input
          type="number"
          step="0.5"
          value={Number((element.y / SCALE_FACTOR).toFixed(2))}
          onChange={(e) =>
            onUpdateElement(element.id, { y: Number(e.target.value) * SCALE_FACTOR })
          }
          className="mt-1"
        />
      </div>
    </div>
  );
});

// =============================================================================
// Size Inputs
// =============================================================================

const SizeInputs = memo(function SizeInputs({
  element,
  onUpdateElement,
}: {
  element: ElementPropertiesProps['element'];
  onUpdateElement: ElementPropertiesProps['onUpdateElement'];
}) {
  const widthM = (element.width || 0) / SCALE_FACTOR;
  const heightM = (element.height || 0) / SCALE_FACTOR;
  const areaM2 = widthM * heightM;

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Width (m)</Label>
          <Input
            type="number"
            step="0.5"
            min="0.5"
            value={Number(widthM.toFixed(2))}
            onChange={(e) =>
              onUpdateElement(element.id, { width: Number(e.target.value) * SCALE_FACTOR })
            }
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Height (m)</Label>
          <Input
            type="number"
            step="0.5"
            min="0.5"
            value={Number(heightM.toFixed(2))}
            onChange={(e) =>
              onUpdateElement(element.id, { height: Number(e.target.value) * SCALE_FACTOR })
            }
            className="mt-1"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Area: {areaM2.toFixed(1)}m²</p>
    </>
  );
});

// =============================================================================
// Sub-rect Editor (for complex polygons)
// =============================================================================

const SubRectEditor = memo(function SubRectEditor({
  element,
  onSubRectChange,
}: {
  element: ElementPropertiesProps['element'];
  onSubRectChange: ElementPropertiesProps['onSubRectChange'];
}) {
  if (!element.subRects) return null;

  const totalArea = element.subRects.reduce(
    (sum, sr) => sum + (sr.width / SCALE_FACTOR) * (sr.height / SCALE_FACTOR),
    0
  );

  return (
    <div>
      <Label className="text-xs font-medium">Shape Sections</Label>
      <p className="text-xs text-muted-foreground mb-1">
        Total Area: {totalArea.toFixed(1)}m²
      </p>
      <div className="space-y-2 mt-2">
        {element.subRects.map((sr, idx) => (
          <div key={sr.id} className="border rounded-md p-2 space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {sr.label || `Section ${idx + 1}`}
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Width (m)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min={1}
                  value={Number((sr.width / SCALE_FACTOR).toFixed(2))}
                  onChange={(e) =>
                    onSubRectChange(element.id, sr.id, {
                      width: Number(e.target.value) * SCALE_FACTOR,
                    })
                  }
                  className="mt-0.5 h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px]">Height (m)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min={1}
                  value={Number((sr.height / SCALE_FACTOR).toFixed(2))}
                  onChange={(e) =>
                    onSubRectChange(element.id, sr.id, {
                      height: Number(e.target.value) * SCALE_FACTOR,
                    })
                  }
                  className="mt-0.5 h-8 text-xs"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground mt-1.5">
        Values in meters. Connected edges adjust automatically.
      </p>
    </div>
  );
});

// =============================================================================
// Rotation Controls
// =============================================================================

const RotationControls = memo(function RotationControls({
  element,
  onUpdateElement,
}: {
  element: ElementPropertiesProps['element'];
  onUpdateElement: ElementPropertiesProps['onUpdateElement'];
}) {
  const rotation = element.rotation || 0;

  return (
    <div>
      <Label className="text-xs">Rotation</Label>
      <div className="flex items-center gap-2 mt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onUpdateElement(element.id, {
              rotation: (rotation + 45) % 360,
            })
          }
        >
          <RotateCw className="h-4 w-4 mr-1" />
          +45°
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onUpdateElement(element.id, {
              rotation: (rotation - 45 + 360) % 360,
            })
          }
        >
          <RotateCw className="h-4 w-4 mr-1 -scale-x-100" />
          -45°
        </Button>
        <span className="text-xs text-muted-foreground ml-1">{rotation}°</span>
      </div>
    </div>
  );
});

// =============================================================================
// Color Inputs
// =============================================================================

const ColorInputs = memo(function ColorInputs({
  element,
  onUpdateElement,
}: {
  element: ElementPropertiesProps['element'];
  onUpdateElement: ElementPropertiesProps['onUpdateElement'];
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <Label className="text-xs">Fill</Label>
        <Input
          type="color"
          value={element.fill}
          onChange={(e) => onUpdateElement(element.id, { fill: e.target.value })}
          className="mt-1 h-10"
        />
      </div>
      <div>
        <Label className="text-xs">Stroke</Label>
        <Input
          type="color"
          value={element.stroke}
          onChange={(e) => onUpdateElement(element.id, { stroke: e.target.value })}
          className="mt-1 h-10"
        />
      </div>
    </div>
  );
});

// =============================================================================
// Interior Details (apartment elements only)
// =============================================================================

const InteriorDetails = memo(function InteriorDetails({
  element,
  onUpdateElement,
}: {
  element: ElementPropertiesProps['element'];
  onUpdateElement: ElementPropertiesProps['onUpdateElement'];
}) {
  return (
    <div className="space-y-3">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Interior Details</Label>

      {/* Logia Count */}
      <div>
        <Label className="text-xs">Logia Count</Label>
        <Input
          type="number"
          min={0}
          max={4}
          value={element.logiaCount ?? ''}
          onChange={(e) =>
            onUpdateElement(element.id, {
              logiaCount: e.target.value === '' ? undefined : Number(e.target.value),
            })
          }
          placeholder="0"
          className="mt-1"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Logia = enclosed utility niche (AC outdoor unit, washing machine)
        </p>
      </div>

      {/* Multi-purpose / +1 rooms */}
      <div>
        <Label className="text-xs">+1 / Multi-purpose Rooms</Label>
        <Input
          type="number"
          min={0}
          max={4}
          value={element.multipurposeRooms ?? ''}
          onChange={(e) =>
            onUpdateElement(element.id, {
              multipurposeRooms: e.target.value === '' ? undefined : Number(e.target.value),
            })
          }
          placeholder="0"
          className="mt-1"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Small flex rooms not counted as bedrooms (2PN+1)
        </p>
      </div>

      {/* Kitchen Type */}
      <div>
        <Label className="text-xs">Kitchen Type</Label>
        <select
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={element.kitchenType ?? ''}
          onChange={(e) =>
            onUpdateElement(element.id, {
              kitchenType: (e.target.value as 'open' | 'closed') || undefined,
            })
          }
        >
          <option value="">— Not specified —</option>
          <option value="open">Open Kitchen</option>
          <option value="closed">Closed Kitchen (Partitioned)</option>
        </select>
      </div>

      {/* View Description */}
      <div>
        <Label className="text-xs">Balcony Direction / View</Label>
        <Input
          value={element.viewDescription ?? ''}
          onChange={(e) =>
            onUpdateElement(element.id, {
              viewDescription: e.target.value || undefined,
            })
          }
          placeholder="e.g. Southeast – Pool View"
          className="mt-1"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Direction + landmark (e.g. Đông Nam – Hồ bơi)
        </p>
      </div>
    </div>
  );
});

// =============================================================================
// Empty State
// =============================================================================

const EmptyState = memo(function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
      <Move className="h-8 w-8 mb-2 opacity-50" />
      <p>Select an element to edit properties</p>
    </div>
  );
});

// =============================================================================
// Overlap Warning
// =============================================================================

const OverlapWarning = memo(function OverlapWarning() {
  return (
    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
      <div className="text-xs text-red-800">
        <p className="font-semibold mb-1">Overlap Detected!</p>
        <p>
          This apartment overlaps with another apartments. Please adjust the position
          or size.
        </p>
      </div>
    </div>
  );
});

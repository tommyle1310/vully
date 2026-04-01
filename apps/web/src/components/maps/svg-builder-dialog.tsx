'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SvgBuilder } from './svg-builder';
import { useToast } from '@/hooks/use-toast';
import { useUpdateBuildingSvgMap } from '@/hooks/use-buildings';

interface SvgBuilderDialogProps {
  buildingId: string;
  buildingName: string;
  existingSvg?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveSuccess?: () => void;
}

export function SvgBuilderDialog({
  buildingId,
  buildingName,
  existingSvg,
  open,
  onOpenChange,
  onSaveSuccess,
}: SvgBuilderDialogProps) {
  const { toast } = useToast();
  const updateSvgMapMutation = useUpdateBuildingSvgMap();

  const handleSave = async (svgContent: string) => {
    try {
      await updateSvgMapMutation.mutateAsync({
        id: buildingId,
        svgMapData: svgContent,
      });

      toast({
        title: 'Success',
        description: 'Floor plan saved successfully',
      });

      onSaveSuccess?.();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save floor plan',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] h-[95vh] p-0 flex flex-col gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            {existingSvg ? 'Edit Floor Plan' : 'Build Floor Plan'}
          </DialogTitle>
          <DialogDescription>
            Create or edit the floor plan for {buildingName}. Drag apartment templates onto the canvas,
            position them, and set apartment IDs. <strong>Builder uses 10 units = 1 meter</strong> for easy manipulation.
            Exported SVG dimensions are automatically converted to meters.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 px-6 pb-6 pt-4 overflow-hidden">
          <SvgBuilder
            buildingId={buildingId}
            initialSvg={existingSvg}
            onSave={handleSave}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

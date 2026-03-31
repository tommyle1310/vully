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
import { apiClient } from '@/lib/api-client';

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

  const handleSave = async (svgContent: string) => {
    try {
      await apiClient.patch(`/buildings/${buildingId}/svg-map`, {
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
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-0 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            {existingSvg ? 'Edit Floor Plan' : 'Build Floor Plan'}
          </DialogTitle>
          <DialogDescription>
            Create or edit the floor plan for {buildingName}. Drag apartment templates onto the canvas,
            position them, and set apartment IDs.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-6 pb-6 flex w-full">
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

'use client';

import { ReactNode, useState } from 'react';
import { Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface InheritedFieldWrapperProps {
  /** The form label */
  label: string;
  /** Description text shown below the field */
  description?: string;
  /** Source of the current value */
  source: 'apartment' | 'building' | 'default';
  /** The inherited value from building policy (for display) */
  inheritedValue?: string | number | boolean | null;
  /** Whether override mode is currently active */
  isOverridden: boolean;
  /** Callback when override toggle changes */
  onOverrideChange: (override: boolean) => void;
  /** Whether the field should be disabled (e.g., during submission) */
  disabled?: boolean;
  /** The form field children (input/select/switch) */
  children: ReactNode;
  /** Additional class names */
  className?: string;
  /** Tooltip content for the field */
  tooltip?: string;
}

const SOURCE_LABELS = {
  apartment: 'Overridden',
  building: 'From building policy',
  default: 'Default value',
} as const;

const SOURCE_COLORS = {
  apartment: 'bg-blue-100 text-blue-700 border-blue-200',
  building: 'bg-green-100 text-green-700 border-green-200',
  default: 'bg-gray-100 text-gray-600 border-gray-200',
} as const;

/**
 * Wrapper component that provides policy inheritance UI for apartment form fields.
 * Shows the source of the value (apartment override, building policy, or default)
 * and provides an override toggle to switch between inherited and custom values.
 */
export function InheritedFieldWrapper({
  label,
  description,
  source,
  inheritedValue,
  isOverridden,
  onOverrideChange,
  disabled = false,
  children,
  className,
  tooltip,
}: InheritedFieldWrapperProps) {
  const showInheritedHint = !isOverridden && source !== 'apartment';

  const formatValue = (value: string | number | boolean | null | undefined): string => {
    if (value === null || value === undefined) return 'Not set';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label row with badge and override toggle */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">{label}</Label>
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {/* Source badge */}
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] px-1.5 py-0 h-5 font-normal',
              SOURCE_COLORS[source],
            )}
          >
            {SOURCE_LABELS[source]}
          </Badge>
        </div>

        {/* Override toggle - only show if there's a building policy to override */}
        {(source === 'building' || source === 'apartment') && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Override</span>
            <Switch
              checked={isOverridden}
              onCheckedChange={onOverrideChange}
              disabled={disabled}
              className="scale-75"
            />
          </div>
        )}
      </div>

      {/* Field content - disabled if not overridden and has inherited value */}
      <div className={cn(!isOverridden && source !== 'apartment' && 'opacity-60')}>
        {children}
      </div>

      {/* Description and inherited value hint */}
      {(description || showInheritedHint) && (
        <div className="space-y-0.5">
          {showInheritedHint && inheritedValue !== undefined && (
            <p className="text-xs text-muted-foreground">
              Using {source === 'building' ? 'building policy' : 'default'} value:{' '}
              <span className="font-medium">{formatValue(inheritedValue)}</span>
            </p>
          )}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Simplified version for display-only inherited fields (no override allowed).
 */
export function InheritedFieldDisplay({
  label,
  value,
  source,
  tooltip,
  className,
}: {
  label: string;
  value: string | number | boolean | null | undefined;
  source: 'apartment' | 'building' | 'default';
  tooltip?: string;
  className?: string;
}) {
  const formatValue = (v: typeof value): string => {
    if (v === null || v === undefined) return 'Not set';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    return String(v);
  };

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">{label}</Label>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <Badge
          variant="outline"
          className={cn(
            'text-[10px] px-1.5 py-0 h-5 font-normal',
            SOURCE_COLORS[source],
          )}
        >
          {SOURCE_LABELS[source]}
        </Badge>
      </div>
      <p className="text-sm">{formatValue(value)}</p>
    </div>
  );
}

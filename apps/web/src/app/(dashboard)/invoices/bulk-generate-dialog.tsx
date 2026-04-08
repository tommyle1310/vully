'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Loader2, CheckCircle2, XCircle, FileText, AlertTriangle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useGenerateInvoices, useBillingJob, useUtilityTypes } from '@/hooks/use-billing';
import { useBuildings } from '@/hooks/use-apartments';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

// Job summary stored in errorLog
interface JobSummary {
  createdCount?: number;
  skippedCount?: number;
  supplementedCount?: number;
  createdByType?: { rental?: number; purchase?: number; lease_to_own?: number };
  errors?: Array<{ contractId: string; error: string }>;
}

// Predefined categories (rent + installment + milestone + management fee + parking + trash + utility types)
const BASE_CATEGORIES = [
  { code: 'rent', name: 'Rent', description: 'Monthly rent (rental contracts)' },
  { code: 'installment', name: 'Installment', description: 'Monthly installment (lease-to-own contracts)' },
  { code: 'milestone', name: 'Milestone', description: 'Payment milestones (purchase contracts)' },
  { code: 'management_fee', name: 'Management Fee', description: 'Building management fee' },
  { code: 'parking', name: 'Parking', description: 'Monthly parking fee' },
  { code: 'trash', name: 'Trash Collection', description: 'Waste management fee' },
];

function getCurrentBillingPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getBillingPeriodOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  
  // Current month and previous 2 months
  for (let i = 0; i < 3; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    options.push({ value, label });
  }
  
  return options;
}

interface BulkGenerateDialogProps {
  trigger?: React.ReactNode;
}

export function BulkGenerateInvoicesDialog({ trigger }: BulkGenerateDialogProps) {
  const [open, setOpen] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState(getCurrentBillingPeriod());
  const [buildingId, setBuildingId] = useState<string>('all');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const hasShownCompletionToast = useRef(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: buildingsData } = useBuildings();
  const { data: utilityTypesData } = useUtilityTypes();
  const generateInvoices = useGenerateInvoices();
  
  // Poll billing job status when active
  const { data: jobData } = useBillingJob(activeJobId || '', {
    refetchInterval: activeJobId ? 2000 : undefined,
  });
  
  const buildings = buildingsData?.data ?? [];
  const utilityTypes = utilityTypesData?.data ?? [];
  const billingPeriodOptions = getBillingPeriodOptions();
  const job = jobData?.data;

  // Parse job summary from errorLog
  const jobSummary: JobSummary | null = job?.errorLog as JobSummary | null;
  const createdCount = jobSummary?.createdCount ?? 0;
  const skippedCount = jobSummary?.skippedCount ?? 0;
  const supplementedCount = jobSummary?.supplementedCount ?? 0;

  // Combine base categories with utility types
  const allCategories = [
    ...BASE_CATEGORIES,
    ...utilityTypes
      .filter((ut) => ut.isActive)
      .map((ut) => ({ code: ut.code, name: ut.name, description: `${ut.name} charges` })),
  ];
  
  // Calculate progress percentage
  const progress = job
    ? job.totalContracts > 0
      ? Math.round((job.processedCount / job.totalContracts) * 100)
      : 0
    : 0;
    
  // Check if job is completed or failed
  const isJobComplete = job?.status === 'completed' || job?.status === 'failed';
  const isJobRunning = !!activeJobId && !isJobComplete;

  // Reset toast flag when starting new job
  useEffect(() => {
    if (activeJobId && !isJobComplete) {
      hasShownCompletionToast.current = false;
    }
  }, [activeJobId, isJobComplete]);
  
  // Handle job completion - show toast and invalidate queries
  useEffect(() => {
    if (!job || hasShownCompletionToast.current) return;
    
    if (job.status === 'completed') {
      hasShownCompletionToast.current = true;
      
      // Invalidate invoices query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      
      if (createdCount > 0 || supplementedCount > 0) {
        const parts: string[] = [];
        if (createdCount > 0) parts.push(`Created ${createdCount} new invoice(s)`);
        if (supplementedCount > 0) parts.push(`Updated ${supplementedCount} existing invoice(s) with new charges`);
        if (skippedCount > 0) parts.push(`${skippedCount} skipped`);
        toast({
          title: 'Invoices generated',
          description: parts.join(', ') + '.',
        });
      } else if (skippedCount > 0) {
        toast({
          title: 'No new invoices',
          description: `All ${skippedCount} invoice(s) already exist for ${billingPeriod}.`,
          variant: 'default',
        });
      } else {
        toast({
          title: 'Job completed',
          description: 'No contracts found to generate invoices for.',
        });
      }
    } else if (job.status === 'failed') {
      hasShownCompletionToast.current = true;
      toast({
        title: 'Invoice generation failed',
        description: `${job.failedCount} invoice(s) failed. Check the job logs for details.`,
        variant: 'destructive',
      });
    }
  }, [job, createdCount, skippedCount, supplementedCount, billingPeriod, toast, queryClient]);

  const handleCategoryToggle = (code: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories((prev) => [...prev, code]);
    } else {
      setSelectedCategories((prev) => prev.filter((c) => c !== code));
    }
  };

  const handleSelectAllCategories = () => {
    setSelectedCategories(allCategories.map((c) => c.code));
  };

  const handleClearCategories = () => {
    setSelectedCategories([]);
  };
  
  const handleGenerate = async () => {
    try {
      const result = await generateInvoices.mutateAsync({
        billingPeriod,
        buildingId: buildingId === 'all' ? undefined : buildingId,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
      });
      
      setActiveJobId(result.data.jobId);
      
      toast({
        title: 'Invoice generation started',
        description: result.data.message,
      });
    } catch (error) {
      toast({
        title: 'Failed to start generation',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };
  
  const handleClose = () => {
    if (!isJobRunning) {
      setOpen(false);
      setActiveJobId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(newOpen: boolean) => {
      if (!isJobRunning) {
        setOpen(newOpen);
        if (!newOpen) {
          setActiveJobId(null);
        }
      }
    }}>
      <SheetTrigger asChild>
        {trigger || (
          <Button>
            <FileText className="mr-2 h-4 w-4" />
            Generate Invoices
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Generate Monthly Invoices</SheetTitle>
          <SheetDescription>
            Generate invoices for all active contracts in the selected period.
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-4 py-6">
          {/* Billing Period Selection */}
          <div className="space-y-2">
            <Label htmlFor="billingPeriod">Billing Period</Label>
            <Select
              value={billingPeriod}
              onValueChange={setBillingPeriod}
              disabled={isJobRunning}
            >
              <SelectTrigger id="billingPeriod">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {billingPeriodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Building Selection */}
          <div className="space-y-2">
            <Label htmlFor="building">Building (Optional)</Label>
            <Select
              value={buildingId}
              onValueChange={setBuildingId}
              disabled={isJobRunning}
            >
              <SelectTrigger id="building">
                <SelectValue placeholder="All buildings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Buildings</SelectItem>
                {buildings.map((building) => (
                  <SelectItem key={building.id} value={building.id}>
                    {building.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Categories (Optional)</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAllCategories}
                  disabled={isJobRunning}
                >
                  All
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearCategories}
                  disabled={isJobRunning}
                >
                  Clear
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Leave empty to generate full invoices with all charges.
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto border rounded p-2">
              {allCategories.map((category) => (
                <label
                  key={category.code}
                  className="flex items-center gap-2 rounded p-1.5 cursor-pointer hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedCategories.includes(category.code)}
                    onCheckedChange={(checked) =>
                      handleCategoryToggle(category.code, !!checked)
                    }
                    disabled={isJobRunning}
                  />
                  <span className="text-sm">{category.name}</span>
                </label>
              ))}
            </div>
            {selectedCategories.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Selected: {selectedCategories.join(', ')}
              </p>
            )}
          </div>
          
          {/* Progress Indicator */}
          <AnimatePresence>
            {activeJobId && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 pt-2"
              >
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {job?.status === 'processing' && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                    {job?.status === 'completed' && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    {job?.status === 'failed' && (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="capitalize">{job?.status || 'Starting...'}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {job?.processedCount ?? 0} / {job?.totalContracts ?? 0} contracts
                  </span>
                </div>
                
                {/* Simple progress bar using div */}
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                
                {/* Summary when complete */}
                {isJobComplete && (
                  <div className="text-xs space-y-1 pt-1 border-t">
                    {createdCount > 0 && (
                      <p className="text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {createdCount} invoice(s) created
                      </p>
                    )}
                    {supplementedCount > 0 && (
                      <p className="text-blue-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {supplementedCount} invoice(s) updated with new charges
                      </p>
                    )}
                    {/* Breakdown by contract type */}
                    {jobSummary?.createdByType && (
                      <div className="pl-4 space-y-0.5 text-muted-foreground">
                        {jobSummary.createdByType.rental ? (
                          <p>Rental: {jobSummary.createdByType.rental}</p>
                        ) : null}
                        {jobSummary.createdByType.purchase ? (
                          <p>Purchase: {jobSummary.createdByType.purchase}</p>
                        ) : null}
                        {jobSummary.createdByType.lease_to_own ? (
                          <p>Lease-to-Own: {jobSummary.createdByType.lease_to_own}</p>
                        ) : null}
                      </div>
                    )}
                    {skippedCount > 0 && (
                      <p className="text-muted-foreground flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {skippedCount} unchanged (already complete)
                      </p>
                    )}
                    {job && job.failedCount > 0 && (
                      <p className="text-destructive flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        {job.failedCount} failed
                      </p>
                    )}
                    {/* Detailed error messages */}
                    {jobSummary?.errors && jobSummary.errors.length > 0 && (
                      <div className="mt-2 max-h-[100px] overflow-y-auto rounded border border-destructive/20 bg-destructive/5 p-2">
                        {jobSummary.errors.map((err, i) => (
                          <p key={i} className="text-destructive truncate" title={err.error}>
                            Contract {err.contractId.slice(0, 8)}…: {err.error}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Error during processing */}
                {!isJobComplete && job && job.failedCount > 0 && (
                  <p className="text-xs text-destructive">
                    {job.failedCount} invoice(s) failed to generate
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <SheetFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isJobRunning}
          >
            {isJobComplete ? 'Close' : 'Cancel'}
          </Button>
          
          {!activeJobId && (
            <Button
              onClick={handleGenerate}
              disabled={generateInvoices.isPending}
            >
              {generateInvoices.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Generate
                </>
              )}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

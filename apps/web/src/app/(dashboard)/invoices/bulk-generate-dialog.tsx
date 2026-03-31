'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Loader2, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { useGenerateInvoices, useBillingJob } from '@/hooks/use-billing';
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
import { useToast } from '@/hooks/use-toast';

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
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { data: buildingsData } = useBuildings();
  const generateInvoices = useGenerateInvoices();
  
  // Poll billing job status when active
  const { data: jobData } = useBillingJob(activeJobId || '', {
    refetchInterval: activeJobId ? 2000 : undefined,
  });
  
  const buildings = buildingsData?.data ?? [];
  const billingPeriodOptions = getBillingPeriodOptions();
  const job = jobData?.data;
  
  // Calculate progress percentage
  const progress = job
    ? job.totalContracts > 0
      ? Math.round((job.processedCount / job.totalContracts) * 100)
      : 0
    : 0;
    
  // Check if job is completed or failed
  const isJobComplete = job?.status === 'completed' || job?.status === 'failed';
  const isJobRunning = !!activeJobId && !isJobComplete;
  
  // Auto-close after completion
  useEffect(() => {
    if (job?.status === 'completed') {
      toast({
        title: 'Invoices generated successfully',
        description: `Generated ${job.processedCount - job.failedCount} invoices for ${billingPeriod}`,
      });
    } else if (job?.status === 'failed') {
      toast({
        title: 'Invoice generation failed',
        description: `${job.failedCount} invoices failed. Check the job logs for details.`,
        variant: 'destructive',
      });
    }
  }, [job?.status, job?.processedCount, job?.failedCount, billingPeriod, toast]);
  
  const handleGenerate = async () => {
    try {
      const result = await generateInvoices.mutateAsync({
        billingPeriod,
        buildingId: buildingId === 'all' ? undefined : buildingId,
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
                
                {job && job.failedCount > 0 && (
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

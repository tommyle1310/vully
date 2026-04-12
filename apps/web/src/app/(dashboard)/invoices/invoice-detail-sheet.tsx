'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { formatCurrency, formatDate } from '@/lib/format';
import {
  FileText,
  Building,
  User,
  Calendar,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Copy,
  Zap,
  Droplets,
  Flame,
  Home,
  Wrench,
  Landmark,
  Receipt,
  QrCode,
  Send,
} from 'lucide-react';
import { Invoice, InvoiceLineItem, useMarkInvoicePaid } from '@/hooks/use-invoices';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';
import { ScheduleQRDisplay } from '@/components/payments/ScheduleQRDisplay';
import { ReportInvoicePaymentDialog } from '@/components/payments/ReportInvoicePaymentDialog';
import { TierBreakdown } from '@/components/billing/TierBreakdown';
import { ProRateIndicator } from '@/components/billing/ProRateIndicator';

interface InvoiceDetailSheetProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig: Record<
  Invoice['status'],
  { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' }
> = {
  draft: { label: 'Draft', variant: 'default' },
  pending: { label: 'Pending', variant: 'warning' },
  paid: { label: 'Paid', variant: 'success' },
  overdue: { label: 'Overdue', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'default' },
};

const categoryConfig: Record<string, { label: string; icon: typeof FileText }> = {
  rent: { label: 'Rent', icon: Home },
  utility: { label: 'Utilities', icon: Zap },
  management_fee: { label: 'Management Fee', icon: Wrench },
  installment: { label: 'Installment', icon: Landmark },
  milestone: { label: 'Milestone', icon: Receipt },
};

const invoiceDateOptions: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
};

function groupLineItemsByCategory(lineItems: InvoiceLineItem[]) {
  const groups: Record<string, InvoiceLineItem[]> = {};
  for (const item of lineItems) {
    const cat = item.category || 'other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  }
  return groups;
}

export function InvoiceDetailSheet({ invoice, open, onOpenChange }: InvoiceDetailSheetProps) {
  const { toast } = useToast();
  const { hasAnyRole } = useAuthStore();
  const { mutate: markAsPaid, isPending } = useMarkInvoicePaid();
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  // Check role and reported payment status
  const isAdmin = hasAnyRole(['admin', 'technician']);
  const reportedPayment = invoice?.priceSnapshot?.reportedPayment;

  const groupedItems = useMemo(
    () => (invoice ? groupLineItemsByCategory(invoice.lineItems) : {}),
    [invoice],
  );

  const totalVat = useMemo(
    () => invoice?.lineItems.reduce((sum, item) => sum + (item.vatAmount || 0), 0) ?? 0,
    [invoice],
  );

  const totalEnvFee = useMemo(
    () => invoice?.lineItems.reduce((sum, item) => sum + (item.environmentFee || 0), 0) ?? 0,
    [invoice],
  );

  const handleMarkAsPaid = () => {
    if (!invoice) return;
    
    markAsPaid(invoice.id, {
      onSuccess: () => {
        toast({
          title: 'Invoice marked as paid',
          description: `Invoice ${invoice.invoice_number} has been marked as paid.`,
        });
        onOpenChange(false);
      },
      onError: (error) => {
        toast({
          title: 'Error',
          description: error.message || 'Failed to mark invoice as paid.',
          variant: 'destructive',
        });
      },
    });
  };

  const handleCopyReference = () => {
    if (invoice?.paymentReference) {
      navigator.clipboard.writeText(invoice.paymentReference);
      toast({ title: 'Copied', description: 'Payment reference copied to clipboard.' });
    }
  };

  const config = invoice ? statusConfig[invoice.status] : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {invoice && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            <SheetHeader className="space-y-4">
              <div className="flex items-center justify-between">
                <SheetTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {invoice.invoice_number}
                </SheetTitle>
                {config && (
                  <Badge variant={config.variant}>{config.label}</Badge>
                )}
              </div>
              <SheetDescription>
                Billing period: {invoice.billingPeriod}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Payment Reference */}
              {invoice.paymentReference && (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-3">
                  <span className="text-sm text-muted-foreground">Payment Ref:</span>
                  <code className="font-mono font-semibold text-sm">{invoice.paymentReference}</code>
                  <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={handleCopyReference}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* Tenant & Property Info */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Tenant
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    {invoice.contract?.tenant ? (
                      <>
                        <p className="font-medium">
                          {invoice.contract.tenant.firstName}{' '}
                          {invoice.contract.tenant.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {invoice.contract.tenant.email}
                        </p>
                      </>
                    ) : invoice.apartment?.owner ? (
                      <>
                        <p className="font-medium">
                          {invoice.apartment.owner.firstName}{' '}
                          {invoice.apartment.owner.lastName}
                          <span className="text-xs text-muted-foreground ml-1">(Owner)</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {invoice.apartment.owner.email}
                        </p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">-</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Property
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    {invoice.contract?.apartments ? (
                      <>
                        <p className="font-medium">
                          Unit {invoice.contract.apartments.unit_number}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {invoice.contract.apartments.buildings.name}
                        </p>
                      </>
                    ) : invoice.apartment ? (
                      <>
                        <p className="font-medium">
                          Unit {invoice.apartment.unit_number}
                          <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0">Vacant</Badge>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {invoice.apartment.buildings.name}
                        </p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">-</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Issue Date:</span>
                  <span className="font-medium">{formatDate(invoice.issueDate, invoiceDateOptions)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Due Date:</span>
                  <span className="font-medium">{formatDate(invoice.dueDate, invoiceDateOptions)}</span>
                </div>
              </div>

              {/* Line Items Grouped by Category */}
              {Object.entries(groupedItems).map(([category, items]) => {
                const catConfig = categoryConfig[category] || { label: category, icon: FileText };
                const CatIcon = catConfig.icon;
                const categorySubtotal = items.reduce((s, i) => s + i.amount, 0);
                const categoryVat = items.reduce((s, i) => s + (i.vatAmount || 0), 0);
                const categoryEnvFee = items.reduce((s, i) => s + (i.environmentFee || 0), 0);

                return (
                  <Card key={category}>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm font-medium flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <CatIcon className="h-4 w-4" />
                          {catConfig.label}
                        </span>
                        <span className="font-mono text-muted-foreground">
                          {formatCurrency(categorySubtotal)}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div>
                                  <span>{item.description}</span>
                                  {(item.vatRate != null && item.vatRate > 0) && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      (VAT {(item.vatRate * 100).toFixed(0)}%)
                                    </span>
                                  )}
                                  {item.tierBreakdown && (
                                    <TierBreakdown
                                      breakdown={item.tierBreakdown}
                                      environmentFee={item.environmentFee}
                                    />
                                  )}
                                  {item.metadata?.proRated && (
                                    <ProRateIndicator metadata={item.metadata} />
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(item.amount)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {/* Category-level VAT / Environment fee summary */}
                      {(categoryVat > 0 || categoryEnvFee > 0) && (
                        <div className="border-t px-4 py-2 space-y-1 text-xs text-muted-foreground">
                          {categoryVat > 0 && (
                            <div className="flex justify-between">
                              <span>VAT</span>
                              <span>{formatCurrency(categoryVat)}</span>
                            </div>
                          )}
                          {categoryEnvFee > 0 && (
                            <div className="flex justify-between">
                              <span>Environment Fee</span>
                              <span>{formatCurrency(categoryEnvFee)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              {/* Totals */}
              <Card>
                <CardContent className="py-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  {totalVat > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total VAT</span>
                      <span>{formatCurrency(totalVat)}</span>
                    </div>
                  )}
                  {totalEnvFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Environment Fee</span>
                      <span>{formatCurrency(totalEnvFee)}</span>
                    </div>
                  )}
                  {invoice.taxAmount > 0 && totalVat === 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span>{formatCurrency(invoice.taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total</span>
                    <span>{formatCurrency(invoice.totalAmount)}</span>
                  </div>
                  {invoice.paidAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        Paid
                      </span>
                      <span>{formatCurrency(invoice.paidAmount)}</span>
                    </div>
                  )}
                  {invoice.status !== 'paid' && invoice.totalAmount > invoice.paidAmount && (
                    <div className="flex justify-between text-sm text-orange-600">
                      <span className="flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        Remaining
                      </span>
                      <span>
                        {formatCurrency(invoice.totalAmount - invoice.paidAmount)}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              {invoice.notes && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium">Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <p className="text-sm text-muted-foreground">{invoice.notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Reported Payment Pending Verification Notice - Residents only */}
              {!isAdmin && reportedPayment && (
                <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div className="flex-1 space-y-2">
                        <p className="font-medium text-amber-800 dark:text-amber-200">
                          Payment Pending Verification
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          You reported a payment of{' '}
                          <span className="font-semibold">
                            {formatCurrency(reportedPayment.amount)}
                          </span>{' '}
                          on {formatDate(reportedPayment.reportedAt)}. An admin will verify your transfer shortly.
                        </p>
                        {reportedPayment.referenceNumber && (
                          <p className="text-xs text-amber-600">
                            Reference: {reportedPayment.referenceNumber}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* QR Code Payment - Residents only, for pending/overdue invoices */}
              {!isAdmin && (invoice.status === 'pending' || invoice.status === 'overdue') && !reportedPayment && invoice.contract?.apartments?.buildings?.id && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <QrCode className="h-4 w-4" />
                      Pay with VietQR
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 space-y-4">
                    <ScheduleQRDisplay
                      buildingId={invoice.contract.apartments.buildings.id}
                      amount={invoice.totalAmount - invoice.paidAmount}
                      reference={invoice.paymentReference || `INV_${invoice.invoice_number}`}
                      isRentPayment={true}
                    />
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => setReportDialogOpen(true)}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Report Payment Transfer
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      After transferring, click above to notify admin for verification
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Report Payment Dialog - Residents only */}
              {!isAdmin && (
                <ReportInvoicePaymentDialog
                  open={reportDialogOpen}
                  onOpenChange={setReportDialogOpen}
                  invoice={invoice}
                  onSuccess={() => onOpenChange(false)}
                />
              )}

              {/* Direct Payment Actions - Admin only */}
              {(invoice.status === 'pending' || invoice.status === 'overdue') && (
                <AdminInvoiceActions
                  invoice={invoice}
                  onMarkAsPaid={handleMarkAsPaid}
                  isPending={isPending}
                />
              )}
            </div>
          </motion.div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function AdminInvoiceActions({
  invoice,
  onMarkAsPaid,
  isPending,
}: {
  invoice: Invoice;
  onMarkAsPaid: () => void;
  isPending: boolean;
}) {
  const { hasAnyRole } = useAuthStore();
  const isAdmin = hasAnyRole(['admin', 'technician']);

  if (!isAdmin) return null;

  return (
    <div className="flex gap-3 pt-4">
      <Button
        className="flex-1"
        onClick={onMarkAsPaid}
        disabled={isPending}
      >
        <CreditCard className="mr-2 h-4 w-4" />
        {isPending ? 'Processing...' : 'Mark as Paid'}
      </Button>
    </div>
  );
}

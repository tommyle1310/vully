'use client';

import { motion } from 'framer-motion';
import {
  FileText,
  Building,
  User,
  Calendar,
  CreditCard,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Invoice, useMarkInvoicePaid } from '@/hooks/use-invoices';
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

interface InvoiceDetailSheetProps {
  invoice: Invoice | null;
  onClose: () => void;
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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function InvoiceDetailSheet({ invoice, onClose }: InvoiceDetailSheetProps) {
  const { toast } = useToast();
  const { mutate: markAsPaid, isPending } = useMarkInvoicePaid();

  const handleMarkAsPaid = () => {
    if (!invoice) return;
    
    markAsPaid(invoice.id, {
      onSuccess: () => {
        toast({
          title: 'Invoice marked as paid',
          description: `Invoice ${invoice.invoice_number} has been marked as paid.`,
        });
        onClose();
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

  const config = invoice ? statusConfig[invoice.status] : null;

  return (
    <Sheet open={!!invoice} onOpenChange={(open) => !open && onClose()}>
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
                    {invoice.contracts?.tenant ? (
                      <>
                        <p className="font-medium">
                          {invoice.contracts.tenant.first_name}{' '}
                          {invoice.contracts.tenant.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {invoice.contracts.tenant.email}
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
                    {invoice.contracts?.apartment ? (
                      <>
                        <p className="font-medium">
                          Unit {invoice.contracts.apartments.unit_number}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {invoice.contracts.apartments.buildings.name}
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
                  <span className="font-medium">{formatDate(invoice.issueDate)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Due Date:</span>
                  <span className="font-medium">{formatDate(invoice.dueDate)}</span>
                </div>
              </div>

              {/* Line Items */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Line Items</CardTitle>
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
                      {invoice.lineItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell className="text-right">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.unitPrice)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Totals */}
              <Card>
                <CardContent className="py-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  {invoice.taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span>{formatCurrency(invoice.taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total</span>
                    <span>{formatCurrency(invoice.total_amounts)}</span>
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
                  {invoice.status !== 'paid' && invoice.total_amounts > invoice.paidAmount && (
                    <div className="flex justify-between text-sm text-orange-600">
                      <span className="flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        Remaining
                      </span>
                      <span>
                        {formatCurrency(invoice.total_amounts - invoice.paidAmount)}
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

              {/* Actions */}
              {(invoice.status === 'pending' || invoice.status === 'overdue') && (
                <div className="flex gap-3 pt-4">
                  <Button
                    className="flex-1"
                    onClick={handleMarkAsPaid}
                    disabled={isPending}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    {isPending ? 'Processing...' : 'Mark as Paid'}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </SheetContent>
    </Sheet>
  );
}

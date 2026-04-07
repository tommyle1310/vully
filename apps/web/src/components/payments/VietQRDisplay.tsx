'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { QrCode } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

interface PaymentQRData {
  qrImageUrl: string;
  bankId: string;
  accountNo: string;
  accountName: string;
  amount: number;
  addInfo: string;
  isMock: boolean;
}

interface VietQRDisplayProps {
  invoiceId: string;
  amount: number;
  reference?: string;
}

export function usePaymentQR(invoiceId: string) {
  return useQuery({
    queryKey: ['invoices', invoiceId, 'payment-qr'],
    queryFn: () =>
      apiClient.get<{ data: PaymentQRData }>(
        `/invoices/${invoiceId}/payment-qr`,
      ),
    enabled: !!invoiceId,
    staleTime: 5 * 60 * 1000,
  });
}

export function VietQRDisplay({
  invoiceId,
  amount,
  reference,
}: VietQRDisplayProps) {
  const { data, isLoading, error } = usePaymentQR(invoiceId);
  const qr = data?.data;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border p-4">
        <Skeleton className="h-48 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  if (error || !qr) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
        <QrCode className="mx-auto mb-2 h-8 w-8" />
        <p>Unable to generate payment QR code</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-4">
      {qr.isMock && (
        <Badge variant="outline" className="text-amber-600 border-amber-300">
          Mock - Development Only
        </Badge>
      )}
      <img
        src={qr.qrImageUrl}
        alt="VietQR Payment Code"
        className="h-48 w-48 rounded-md"
        loading="lazy"
      />
      <div className="text-center space-y-1">
        <p className="text-sm font-medium">
          {formatCurrency(qr.amount)}
        </p>
        <p className="text-xs text-muted-foreground">
          {qr.accountName} - {qr.accountNo}
        </p>
        <p className="text-xs text-muted-foreground font-mono">
          Ref: {qr.addInfo}
        </p>
      </div>
    </div>
  );
}

export default VietQRDisplay;

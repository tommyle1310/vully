'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { QrCode, AlertCircle, Building2, User } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { useBankAccountForPayment, BankAccount } from '@/hooks/use-bank-accounts';

interface ScheduleQRDisplayProps {
  buildingId: string;
  ownerId?: string;
  amount: number;
  reference: string;
  isRentPayment?: boolean;
}

/**
 * Generate VietQR URL from bank account info
 * Uses the VietQR API format: https://img.vietqr.io/image/{bankCode}-{accountNo}-print.png?amount=X&addInfo=Y&accountName=Z
 */
function generateVietQRUrl(
  bankAccount: BankAccount,
  amount: number,
  reference: string
): string {
  const template = 'compact';
  const encodedName = encodeURIComponent(bankAccount.accountName);
  const encodedRef = encodeURIComponent(reference);

  return `https://img.vietqr.io/image/${bankAccount.bankCode}-${bankAccount.accountNumber}-${template}.png?amount=${amount}&addInfo=${encodedRef}&accountName=${encodedName}`;
}

export function ScheduleQRDisplay({
  buildingId,
  ownerId,
  amount,
  reference,
  isRentPayment = true,
}: ScheduleQRDisplayProps) {
  const { data, isLoading, error } = useBankAccountForPayment(
    buildingId,
    ownerId,
    isRentPayment
  );

  const bankAccount = data?.data ?? null;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border p-4">
        <Skeleton className="h-48 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
    );
  }

  if (error || !bankAccount) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
        <AlertCircle className="mx-auto mb-2 h-8 w-8 text-amber-500" />
        <p className="font-medium">No bank account configured</p>
        <p className="text-xs mt-1">
          Please contact the property manager for payment instructions.
        </p>
      </div>
    );
  }

  const qrUrl = generateVietQRUrl(bankAccount, amount, reference);

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-4">
      {/* Account type badge */}
      <Badge variant="outline" className="text-xs">
        {bankAccount.buildingId ? (
          <span className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            Management Fee Account
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            Owner&apos;s Account
          </span>
        )}
      </Badge>

      {/* QR Code Image */}
      <img
        src={qrUrl}
        alt="VietQR Payment Code"
        className="h-48 w-48 rounded-md bg-white"
        loading="eager"
      />

      {/* Payment Details */}
      <div className="text-center space-y-1">
        <p className="text-lg font-semibold text-green-600">
          {formatCurrency(amount)}
        </p>
        <div className="space-y-0.5">
          <p className="text-sm font-medium">
            {bankAccount.accountName}
          </p>
          <p className="text-xs text-muted-foreground">
            {bankAccount.bankName} - {bankAccount.accountNumber}
          </p>
        </div>
        <p className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
          Ref: {reference}
        </p>
      </div>

      {/* Instructions */}
      <p className="text-xs text-muted-foreground text-center max-w-[250px]">
        Scan this QR code with your banking app to transfer the exact amount with the reference number.
      </p>
    </div>
  );
}

export default ScheduleQRDisplay;

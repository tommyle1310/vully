'use client';

import {
  FileText,
  Calendar,
  User,
  Users,
  Banknote,
  Clock,
  Home,
  Key,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getContractType, parseContractDetails } from './apartment-detail-helpers';
import { SectionHeader } from './apartment-detail-info-sections';

interface Contract {
  termsNotes?: string;
  start_date: string;
  endDate?: string;
  tenant?: { firstName: string; lastName: string };
  citizenId?: string;
  numberOfResidents?: number;
  rentAmount: number;
  depositAmount?: number | null;
  depositMonths: number;
}

interface ApartmentDetailContractProps {
  contract: Contract;
}

export function ApartmentDetailContract({ contract }: ApartmentDetailContractProps) {
  const contractType = getContractType(contract.termsNotes);
  const details = parseContractDetails(contract.termsNotes);
  const remainingBalance = details.purchasePrice && details.downPayment 
    ? details.purchasePrice - details.downPayment 
    : undefined;
  const paidPercent = details.purchasePrice && details.downPayment
    ? ((details.downPayment / details.purchasePrice) * 100).toFixed(1)
    : undefined;

  return (
    <div className="space-y-1">
      <SectionHeader title="Active Contract" />
      <Card className="mt-2">
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" />
              Type
            </span>
            <Badge variant={contractType === 'purchase' ? 'default' : contractType === 'lease_to_own' ? 'secondary' : 'outline'}>
              {contractType === 'purchase' ? 'Purchase' : contractType === 'lease_to_own' ? 'Lease to Own' : 'Rental'}
            </Badge>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              Contract Date
            </span>
            <span className="text-sm font-medium">
              {new Date(contract.start_date).toLocaleDateString()}
              {contract.endDate && ` - ${new Date(contract.endDate).toLocaleDateString()}`}
            </span>
          </div>

          {contract.tenant && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <User className="h-3.5 w-3.5" />
                {contractType === 'purchase' ? 'Buyer' : contractType === 'lease_to_own' ? 'Lessee/Buyer' : 'Tenant'}
              </span>
              <span className="text-sm font-medium">
                {contract.tenant.firstName} {contract.tenant.lastName}
              </span>
            </div>
          )}

          {contract.citizenId && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <User className="h-3.5 w-3.5" />
                Citizen ID
              </span>
              <span className="text-sm font-medium font-mono">{contract.citizenId}</span>
            </div>
          )}

          {contract.numberOfResidents != null && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Users className="h-3.5 w-3.5" />
                Registered Residents
              </span>
              <span className="text-sm font-medium">{contract.numberOfResidents}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purchase Contract Financial Info */}
      {contractType === 'purchase' && details.purchasePrice && (
        <Card className="mt-2 border-primary/20 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Banknote className="h-4 w-4" />
              Purchase Financial Summary
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Purchase Price</span>
              <span className="text-sm font-semibold">{details.purchasePrice.toLocaleString()} VND</span>
            </div>
            
            {details.downPayment && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Down Payment</span>
                <span className="text-sm font-medium text-green-600">
                  {details.downPayment.toLocaleString()} VND
                  {paidPercent && <span className="text-xs ml-1">({paidPercent}%)</span>}
                </span>
              </div>
            )}
            
            {remainingBalance != null && remainingBalance > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Remaining Balance</span>
                <span className="text-sm font-medium text-orange-600">{remainingBalance.toLocaleString()} VND</span>
              </div>
            )}

            {details.transferDate && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Home className="h-3.5 w-3.5" />
                  Ownership Transfer
                </span>
                <span className="text-sm font-medium">{details.transferDate}</span>
              </div>
            )}

            {details.paymentSchedule && (
              <div className="pt-2 border-t">
                <span className="text-xs text-muted-foreground">Payment Schedule:</span>
                <p className="text-sm mt-1">{details.paymentSchedule}</p>
              </div>
            )}

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground italic">
                Note: Detailed payment milestones and tracking coming soon. 
                Purchase payments are typically milestone-based (not monthly).
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rental Contract Financial Info */}
      {contractType === 'rental' && contract.rentAmount > 0 && (
        <Card className="mt-2 border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-600">
              <Key className="h-4 w-4" />
              Rental Payment Info
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Monthly Rent</span>
              <span className="text-sm font-semibold">{contract.rentAmount.toLocaleString()} VND/month</span>
            </div>

            {details.paymentDueDay && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  Payment Due
                </span>
                <span className="text-sm font-medium">Day {details.paymentDueDay} of each month</span>
              </div>
            )}

            {contract.depositAmount != null && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Security Deposit</span>
                <span className="text-sm font-medium">{contract.depositAmount.toLocaleString()} VND</span>
              </div>
            )}

            {contract.depositMonths > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Deposit Months</span>
                <span className="text-sm font-medium">{contract.depositMonths} months</span>
              </div>
            )}

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground italic">
                Note: Monthly payment tracking and history coming soon.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lease-to-Own Contract Financial Info */}
      {contractType === 'lease_to_own' && (
        <Card className="mt-2 border-purple-500/20 bg-purple-500/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-purple-600">
              <TrendingUp className="h-4 w-4" />
              Lease-to-Own Terms
            </div>

            {contract.rentAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Monthly Rent</span>
                <span className="text-sm font-semibold">{contract.rentAmount.toLocaleString()} VND/month</span>
              </div>
            )}

            {details.optionFee && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Option Fee (non-refundable)</span>
                <span className="text-sm font-medium">{details.optionFee.toLocaleString()} VND</span>
              </div>
            )}

            {details.purchaseOptionPrice && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Purchase Option Price</span>
                <span className="text-sm font-semibold">{details.purchaseOptionPrice.toLocaleString()} VND</span>
              </div>
            )}

            {details.optionPeriodMonths && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Option Period</span>
                <span className="text-sm font-medium">{details.optionPeriodMonths} months</span>
              </div>
            )}

            {details.rentCreditPercent && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Rent Credit toward Purchase</span>
                <span className="text-sm font-medium text-green-600">{details.rentCreditPercent}%</span>
              </div>
            )}

            {contract.depositAmount != null && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Security Deposit</span>
                <span className="text-sm font-medium">{contract.depositAmount.toLocaleString()} VND</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

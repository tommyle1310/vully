import { usePendingPayments } from '@/hooks/use-payments';
import { useReportedInvoicePayments } from '@/hooks/use-invoices';

export function usePendingPaymentCount() {
  const { data: pendingData, isLoading: pendingLoading } = usePendingPayments();
  const { data: invoiceData, isLoading: invoiceLoading } = useReportedInvoicePayments();

  const contractCount = pendingData?.data?.length ?? 0;
  const invoiceCount = invoiceData?.data?.length ?? 0;
  const total = contractCount + invoiceCount;

  return {
    contractCount,
    invoiceCount,
    total,
    isLoading: pendingLoading || invoiceLoading,
  };
}

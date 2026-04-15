import { InvoiceWithLineItems } from '../../../common/types/prisma-payloads';
import { InvoiceResponseDto } from '../dto/invoice.dto';

export function toInvoiceResponseDto(invoice: InvoiceWithLineItems): InvoiceResponseDto {
  return {
    id: invoice.id,
    contractId: invoice.contract_id,
    invoice_number: invoice.invoice_number,
    billingPeriod: invoice.billing_period,
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    status: invoice.status,
    subtotal: Number(invoice.subtotal),
    taxAmount: Number(invoice.tax_amount),
    totalAmount: Number(invoice.total_amount),
    paidAmount: Number(invoice.paid_amount),
    paid_at: invoice.paid_at ?? undefined,
    notes: invoice.notes ?? undefined,
    paymentReference:
      (invoice.price_snapshot as Record<string, unknown>)?.paymentReference as
        | string
        | undefined,
    priceSnapshot: invoice.price_snapshot as Record<string, unknown> | undefined,
    lineItems: invoice.invoice_line_items?.map((item) => ({
      id: item.id,
      description: item.description,
      category: item.category ?? undefined,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      amount: Number(item.amount),
      vatRate: Number(item.vat_rate),
      vatAmount: Number(item.vat_amount),
      environmentFee: Number(item.environment_fee),
      utilityTypeId: item.utility_type_id ?? undefined,
      meterReadingId: item.meter_reading_id ?? undefined,
      tierBreakdown: (item.tier_breakdown as Record<string, unknown>) ?? undefined,
    })) || [],
    created_at: invoice.created_at,
    updatedAt: invoice.updated_at,
    contract: invoice.contracts
      ? {
          id: invoice.contracts.id,
          apartments: {
            id: invoice.contracts.apartments.id,
            unit_number: invoice.contracts.apartments.unit_number,
            buildings: {
              id: invoice.contracts.apartments.buildings.id,
              name: invoice.contracts.apartments.buildings.name,
            },
          },
          tenant: {
            id: invoice.contracts.users_contracts_tenant_idTousers.id,
            firstName: invoice.contracts.users_contracts_tenant_idTousers.first_name,
            lastName: invoice.contracts.users_contracts_tenant_idTousers.last_name,
            email: invoice.contracts.users_contracts_tenant_idTousers.email,
          },
        }
      : undefined,
    apartment: invoice.apartments
      ? {
          id: invoice.apartments.id,
          unit_number: invoice.apartments.unit_number,
          buildings: {
            id: invoice.apartments.buildings.id,
            name: invoice.apartments.buildings.name,
          },
          owner: invoice.apartments.users
            ? {
                id: invoice.apartments.users.id,
                firstName: invoice.apartments.users.first_name,
                lastName: invoice.apartments.users.last_name,
                email: invoice.apartments.users.email,
              }
            : undefined,
        }
      : undefined,
  };
}

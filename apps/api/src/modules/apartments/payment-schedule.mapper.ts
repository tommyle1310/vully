import {
  PaymentScheduleResponseDto,
  PaymentResponseDto,
  PaymentType,
  PaymentStatus,
} from './dto/payment.dto';

export function toScheduleResponseDto(
  schedule: {
    id: string;
    contract_id: string;
    period_label: string;
    payment_type: string;
    sequence_number: number;
    due_date: Date;
    expected_amount: unknown;
    received_amount: unknown;
    status: string;
    notes: string | null;
    created_at: Date;
    updated_at: Date;
    payments?: Array<{
      id: string;
      schedule_id: string;
      amount: unknown;
      payment_date: Date;
      payment_method: string | null;
      reference_number: string | null;
      recorded_by: string;
      recorded_at: Date;
      receipt_url: string | null;
      notes: string | null;
      users?: {
        id: string;
        email: string;
        first_name: string;
        last_name: string;
      };
    }>;
  },
  includePayments = false,
): PaymentScheduleResponseDto {
  const expectedAmount = Number(schedule.expected_amount);
  const receivedAmount = Number(schedule.received_amount);

  return {
    id: schedule.id,
    contractId: schedule.contract_id,
    periodLabel: schedule.period_label,
    paymentType: schedule.payment_type as PaymentType,
    sequenceNumber: schedule.sequence_number,
    dueDate: schedule.due_date,
    expectedAmount,
    receivedAmount,
    balance: expectedAmount - receivedAmount,
    status: schedule.status as PaymentStatus,
    notes: schedule.notes ?? undefined,
    created_at: schedule.created_at,
    updatedAt: schedule.updated_at,
    ...(includePayments && schedule.payments && {
      payments: schedule.payments.map(toPaymentResponseDto),
    }),
  };
}

export function toPaymentResponseDto(
  payment: {
    id: string;
    schedule_id: string;
    amount: unknown;
    payment_date: Date;
    payment_method: string | null;
    reference_number: string | null;
    recorded_by: string;
    recorded_at: Date;
    receipt_url: string | null;
    notes: string | null;
    users?: {
      id: string;
      email: string;
      first_name: string;
      last_name: string;
    };
  },
): PaymentResponseDto {
  return {
    id: payment.id,
    scheduleId: payment.schedule_id,
    amount: Number(payment.amount),
    paymentDate: payment.payment_date,
    paymentMethod: payment.payment_method as PaymentResponseDto['paymentMethod'],
    referenceNumber: payment.reference_number ?? undefined,
    recordedBy: payment.recorded_by,
    recordedAt: payment.recorded_at,
    receiptUrl: payment.receipt_url ?? undefined,
    notes: payment.notes ?? undefined,
    ...(payment.users && {
      recordedByUser: {
        id: payment.users.id,
        email: payment.users.email,
        firstName: payment.users.first_name,
        lastName: payment.users.last_name,
      },
    }),
  };
}

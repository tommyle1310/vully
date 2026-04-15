import { contracts } from '@prisma/client';
import { ContractResponseDto } from '../dto/contract.dto';

type ContractWithRelations = contracts & {
  apartments?: {
    id: string;
    unit_number: string;
    floor_index: number;
    building_id: string;
    gross_area?: unknown;
    buildings?: { id: string; name: string };
  };
  users_contracts_tenant_idTousers?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
};

const optNum = (v: { toNumber(): number } | number | null | undefined) =>
  v != null ? (typeof v === 'object' && 'toNumber' in v ? v.toNumber() : Number(v)) : undefined;

export function toContractResponseDto(contract: ContractWithRelations): ContractResponseDto {
  return {
    id: contract.id,
    apartmentId: contract.apartment_id,
    tenantId: contract.tenant_id,
    status: contract.status,
    start_date: contract.start_date,
    endDate: contract.end_date || undefined,
    rentAmount: Number(contract.rent_amount),
    depositMonths: contract.deposit_months,
    depositAmount: optNum(contract.deposit_amount),
    citizenId: contract.citizen_id || undefined,
    numberOfResidents: contract.number_of_residents ?? undefined,
    termsNotes: contract.terms_notes || undefined,
    contractType: contract.contract_type as ContractResponseDto['contractType'],
    purchasePrice: optNum(contract.purchase_price),
    downPayment: optNum(contract.down_payment),
    transferDate: contract.transfer_date || undefined,
    optionFee: optNum(contract.option_fee),
    purchaseOptionPrice: optNum(contract.purchase_option_price),
    optionPeriodMonths: contract.option_period_months ?? undefined,
    rentCreditPercent: optNum(contract.rent_credit_percent),
    paymentDueDay: contract.payment_due_day ?? undefined,
    created_at: contract.created_at,
    updatedAt: contract.updated_at,
    ...buildContractRelations(contract),
  };
}

function buildContractRelations(contract: ContractWithRelations) {
  const apt = contract.apartments;
  const ten = contract.users_contracts_tenant_idTousers;
  return {
    apartment: apt ? {
      id: apt.id,
      unit_number: apt.unit_number,
      floorIndex: apt.floor_index,
      buildingId: apt.building_id,
      building: apt.buildings ? { id: apt.buildings.id, name: apt.buildings.name } : undefined,
    } : undefined,
    tenant: ten ? {
      id: ten.id,
      email: ten.email,
      firstName: ten.first_name,
      lastName: ten.last_name,
    } : undefined,
  };
}

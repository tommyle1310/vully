# Design: Enhance Apartment Platform Features

## Overview

This document details the technical architecture for implementing the enhancements across contracts, buildings, apartments, SVG builder, and utility meters.

---

## 1. Purchase Contract Data Flow Fix

### Current Flow (Broken)

```
┌──────────────────────┐     ┌─────────────────────────┐     ┌──────────────────┐
│  ContractFormDialog  │     │   use-contracts.ts      │     │  Backend API     │
│                      │     │                         │     │                  │
│  purchasePrice: 4B   │────▶│  CreateContractInput {  │────▶│  contract_type:  │
│  contractType: pur   │     │    apartmentId,         │     │    "rental" ❌   │
│  downPayment: 1B     │     │    tenantId,            │     │  purchase_price: │
│  transferDate: xxx   │     │    rentAmount,          │     │    null ❌       │
│                      │     │    termsNotes: "..."    │     │                  │
│  buildTermsNotes()   │     │    ← Missing fields!    │     │                  │
└──────────────────────┘     └─────────────────────────┘     └──────────────────┘
```

### Fixed Flow

```
┌──────────────────────┐     ┌─────────────────────────┐     ┌──────────────────┐
│  ContractFormDialog  │     │   use-contracts.ts      │     │  Backend API     │
│                      │     │                         │     │                  │
│  purchasePrice: 4B   │────▶│  CreateContractInput {  │────▶│  contract_type:  │
│  contractType: pur   │     │    apartmentId,         │     │    "purchase" ✅ │
│  downPayment: 1B     │     │    tenantId,            │     │  purchase_price: │
│  transferDate: xxx   │     │    contractType, ✅     │     │    4B ✅         │
│                      │     │    purchasePrice, ✅    │     │  down_payment:   │
│                      │     │    downPayment, ✅      │     │    1B ✅         │
│                      │     │    transferDate, ✅     │     │                  │
└──────────────────────┘     └─────────────────────────┘     └──────────────────┘
```

### Frontend Interface Changes

```typescript
// apps/web/src/hooks/use-contracts.ts

export interface CreateContractInput {
  apartmentId: string;
  tenantId: string;
  start_date: string;
  endDate?: string;
  rentAmount: number;
  depositMonths?: number;
  depositAmount?: number;
  citizenId?: string;
  numberOfResidents?: number;
  termsNotes?: string;
  // NEW: Payment tracking fields
  contractType?: 'rental' | 'purchase' | 'lease_to_own';
  purchasePrice?: number;
  downPayment?: number;
  transferDate?: string;
  optionFee?: number;
  purchaseOptionPrice?: number;
  optionPeriodMonths?: number;
  rentCreditPercent?: number;
  paymentDueDay?: number;
}
```

### Form Submit Changes

```typescript
// apps/web/src/app/(dashboard)/contracts/contract-form-dialog.tsx

const onSubmit = async (values: ContractFormValues) => {
  const input: CreateContractInput = {
    apartmentId: values.apartmentId,
    tenantId: values.partyId,
    start_date: values.startDate,
    endDate: values.endDate || undefined,
    // Base rental fields
    rentAmount: values.contractType === 'rental' || values.contractType === 'lease_to_own'
      ? (values.rentAmount || 0)
      : 0,
    depositMonths: values.depositMonths,
    depositAmount: values.depositAmount,
    citizenId: values.citizenId || undefined,
    numberOfResidents: values.numberOfResidents,
    termsNotes: buildTermsNotes(values),
    // NEW: Contract type specific fields
    contractType: values.contractType,
    purchasePrice: values.contractType === 'purchase' ? values.purchasePrice : undefined,
    downPayment: values.contractType === 'purchase' ? values.downPayment : undefined,
    transferDate: values.contractType === 'purchase' ? values.transferDate : undefined,
    paymentDueDay: values.paymentDueDay,
    // Lease-to-own fields
    optionFee: values.contractType === 'lease_to_own' ? values.optionFee : undefined,
    purchaseOptionPrice: values.contractType === 'lease_to_own' ? values.purchaseOptionPrice : undefined,
    optionPeriodMonths: values.contractType === 'lease_to_own' ? values.optionPeriodMonths : undefined,
    rentCreditPercent: values.contractType === 'lease_to_own' ? values.rentCreditPercent : undefined,
  };
  await createContract.mutateAsync(input);
};
```

### Purchase Milestone Generation

```typescript
// Backend: apps/api/src/modules/apartments/payment-schedule.service.ts

async generatePurchaseMilestones(
  contractId: string,
  options?: {
    downPaymentPercent?: number;  // Default: 30%
    numProgressPayments?: number; // Default: 3
  }
): Promise<PaymentScheduleResponseDto[]> {
  const contract = await this.prisma.contracts.findUnique({
    where: { id: contractId },
  });

  if (!contract || contract.contract_type !== 'purchase') {
    throw new BadRequestException('Contract must be a purchase contract');
  }

  const purchasePrice = Number(contract.purchase_price);
  const downPaymentAmount = Number(contract.down_payment) || purchasePrice * 0.3;
  const remaining = purchasePrice - downPaymentAmount;
  const progressPayments = options?.numProgressPayments || 3;
  const progressAmount = remaining / (progressPayments + 1); // +1 for final payment

  const milestones = [
    {
      payment_type: 'down_payment',
      due_date: contract.start_date,
      amount: downPaymentAmount,
      description: 'Down Payment',
    },
    ...Array.from({ length: progressPayments }, (_, i) => ({
      payment_type: 'purchase',
      due_date: addMonths(contract.start_date, (i + 1) * Math.ceil(12 / progressPayments)),
      amount: progressAmount,
      description: `Progress Payment ${i + 1}`,
    })),
    {
      payment_type: 'purchase',
      due_date: contract.transfer_date || contract.end_date,
      amount: progressAmount,
      description: 'Final Payment - Property Transfer',
    },
  ];

  // Create all schedules in transaction
  return this.prisma.$transaction(/* ... */);
}
```

---

## 2. Building Occupancy Stats & 3D Visualization

### Backend API Design

```typescript
// apps/api/src/modules/apartments/buildings.controller.ts

@Get(':id/stats')
@ApiOperation({ summary: 'Get building statistics including occupancy' })
async getBuildingStats(@Param('id') id: string) {
  return this.buildingsService.getStats(id);
}

// apps/api/src/modules/apartments/buildings.service.ts

interface BuildingStats {
  totalApartments: number;
  occupied: number;
  vacant: number;
  maintenance: number;
  reserved: number;
  occupancyRate: number; // percentage
}

async getStats(buildingId: string): Promise<BuildingStats> {
  const counts = await this.prisma.apartments.groupBy({
    by: ['status'],
    where: { building_id: buildingId },
    _count: { id: true },
  });

  const statusMap = counts.reduce((acc, c) => {
    acc[c.status] = c._count.id;
    return acc;
  }, {} as Record<string, number>);

  const total = Object.values(statusMap).reduce((a, b) => a + b, 0);
  const occupied = statusMap['occupied'] || 0;

  return {
    totalApartments: total,
    occupied,
    vacant: statusMap['vacant'] || 0,
    maintenance: statusMap['maintenance'] || 0,
    reserved: statusMap['reserved'] || 0,
    occupancyRate: total > 0 ? Math.round((occupied / total) * 100) : 0,
  };
}
```

### 3D Viewer Color Mapping

```typescript
// apps/web/src/components/3d/building-3d.tsx

const STATUS_COLORS: Record<string, string> = {
  vacant: '#22c55e',      // green-500
  occupied: '#3b82f6',    // blue-500
  maintenance: '#f59e0b', // amber-500
  reserved: '#8b5cf6',    // violet-500
};

// In Building3DScene component
interface ApartmentStatus {
  apartmentId: string;
  status: 'vacant' | 'occupied' | 'maintenance' | 'reserved';
}

// Props extension
interface Building3DProps {
  svgContent: string;
  totalFloors: number;
  buildingName?: string;
  floorHeights?: Record<string, number>;
  apartmentStatuses?: ApartmentStatus[]; // NEW
  className?: string;
}

// In FloorMesh rendering
const getApartmentColor = (apartmentId?: string) => {
  if (!apartmentId || !apartmentStatuses) return '#9ca3af'; // default gray
  const status = apartmentStatuses.find(s => s.apartmentId === apartmentId);
  return STATUS_COLORS[status?.status || 'vacant'];
};
```

### Legend Component

```typescript
// apps/web/src/components/3d/building-3d-legend.tsx

export function Building3DLegend() {
  return (
    <div className="flex gap-4 text-xs">
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded bg-green-500" />
        <span>Vacant</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded bg-blue-500" />
        <span>Occupied</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded bg-amber-500" />
        <span>Maintenance</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded bg-violet-500" />
        <span>Reserved</span>
      </div>
    </div>
  );
}
```

---

## 3. Smart Apartment Filters

### URL State with Nuqs

```typescript
// apps/web/src/app/(dashboard)/apartments/page.tsx

import { parseAsString, parseAsArrayOf, parseAsInteger, useQueryStates } from 'nuqs';

const filterParsers = {
  buildingId: parseAsString,
  status: parseAsArrayOf(parseAsString),
  unitType: parseAsArrayOf(parseAsString),
  minBedrooms: parseAsInteger,
  maxBedrooms: parseAsInteger,
  minFloor: parseAsInteger,
  maxFloor: parseAsInteger,
  minArea: parseAsInteger,
  maxArea: parseAsInteger,
  search: parseAsString,
};

export default function ApartmentsPage() {
  const [filters, setFilters] = useQueryStates(filterParsers);
  
  const { data, isLoading } = useApartments({
    page,
    limit,
    buildingId: filters.buildingId || undefined,
    status: filters.status?.join(','),
    unitType: filters.unitType?.join(','),
    minBedrooms: filters.minBedrooms || undefined,
    maxBedrooms: filters.maxBedrooms || undefined,
    // ... etc
  });
}
```

### Filter Component

```typescript
// apps/web/src/app/(dashboard)/apartments/apartment-filters.tsx

export function ApartmentFilters({ filters, onFiltersChange }) {
  return (
    <div className="flex flex-wrap gap-3 p-4 border rounded-lg bg-muted/50">
      {/* Building Select */}
      <BuildingSelect
        value={filters.buildingId}
        onChange={(v) => onFiltersChange({ ...filters, buildingId: v })}
      />
      
      {/* Status Multi-Select */}
      <MultiSelect
        label="Status"
        options={[
          { value: 'vacant', label: 'Vacant' },
          { value: 'occupied', label: 'Occupied' },
          { value: 'maintenance', label: 'Maintenance' },
          { value: 'reserved', label: 'Reserved' },
        ]}
        value={filters.status}
        onChange={(v) => onFiltersChange({ ...filters, status: v })}
      />
      
      {/* Unit Type Multi-Select */}
      <MultiSelect
        label="Unit Type"
        options={[
          { value: 'studio', label: 'Studio' },
          { value: 'one_bedroom', label: '1 Bedroom' },
          { value: 'two_bedroom', label: '2 Bedrooms' },
          { value: 'three_bedroom', label: '3+ Bedrooms' },
        ]}
        value={filters.unitType}
        onChange={(v) => onFiltersChange({ ...filters, unitType: v })}
      />
      
      {/* Floor Range */}
      <RangeSlider
        label="Floor"
        min={0}
        max={50}
        value={[filters.minFloor || 0, filters.maxFloor || 50]}
        onChange={([min, max]) => onFiltersChange({ 
          ...filters, 
          minFloor: min, 
          maxFloor: max 
        })}
      />
      
      {/* Clear Filters */}
      <Button variant="ghost" onClick={() => onFiltersChange({})}>
        Clear All
      </Button>
    </div>
  );
}
```

### Backend Filter Support

```typescript
// apps/api/src/modules/apartments/apartments.service.ts

interface ApartmentFilters {
  buildingId?: string;
  status?: string[];
  unitType?: string[];
  minBedrooms?: number;
  maxBedrooms?: number;
  minFloor?: number;
  maxFloor?: number;
  minArea?: number;
  maxArea?: number;
  search?: string;
}

async findAll(page: number, limit: number, filters: ApartmentFilters) {
  const where: Prisma.apartmentsWhereInput = {};
  
  if (filters.buildingId) where.building_id = filters.buildingId;
  if (filters.status?.length) where.status = { in: filters.status };
  if (filters.unitType?.length) where.unit_type = { in: filters.unitType };
  if (filters.minBedrooms) where.bedroom_count = { gte: filters.minBedrooms };
  if (filters.maxBedrooms) where.bedroom_count = { ...where.bedroom_count, lte: filters.maxBedrooms };
  if (filters.minFloor) where.floor_index = { gte: filters.minFloor };
  if (filters.maxFloor) where.floor_index = { ...where.floor_index, lte: filters.maxFloor };
  if (filters.search) {
    where.OR = [
      { unit_number: { contains: filters.search, mode: 'insensitive' } },
      { apartment_code: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  
  // ... query execution
}
```

---

## 4. SVG Builder Interior Fields

### Type Extension

```typescript
// apps/web/src/components/maps/svg-builder/svg-builder.types.ts

export interface SvgElement {
  // ... existing fields
  // Interior details (for apartment elements)
  logiaCount?: number;
  multipurposeRooms?: number;
  kitchenType?: 'open' | 'closed';
  viewDescription?: string;
  // NEW fields
  bedroomCount?: number;
  bathroomCount?: number;
  livingRoomCount?: number;
}
```

### Properties Panel Update

```typescript
// apps/web/src/components/maps/svg-builder/components/properties-panel.tsx

const InteriorDetails = memo(function InteriorDetails({ element, onUpdateElement }) {
  return (
    <div className="space-y-3">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Interior Details
      </Label>

      {/* NEW: Bedroom Count */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Bedrooms</Label>
          <Input
            type="number"
            min={0}
            max={10}
            value={element.bedroomCount ?? ''}
            onChange={(e) =>
              onUpdateElement(element.id, {
                bedroomCount: e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
            placeholder="0"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Bathrooms</Label>
          <Input
            type="number"
            min={0}
            max={10}
            value={element.bathroomCount ?? ''}
            onChange={(e) =>
              onUpdateElement(element.id, {
                bathroomCount: e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
            placeholder="0"
            className="mt-1"
          />
        </div>
      </div>

      {/* NEW: Living Room */}
      <div>
        <Label className="text-xs">Living Rooms</Label>
        <Input
          type="number"
          min={0}
          max={4}
          value={element.livingRoomCount ?? ''}
          onChange={(e) =>
            onUpdateElement(element.id, {
              livingRoomCount: e.target.value === '' ? undefined : Number(e.target.value),
            })
          }
          placeholder="1"
          className="mt-1"
        />
      </div>

      {/* Existing fields... */}
      {/* Logia Count */}
      {/* Multi-purpose rooms */}
      {/* Kitchen Type */}
    </div>
  );
});
```

### SVG Export Update

```typescript
// apps/web/src/components/maps/svg-builder/svg-parser.ts

function elementToSvgString(element: SvgElement): string {
  const dataAttrs = [];
  if (element.apartmentId) dataAttrs.push(`data-apartment-id="${element.apartmentId}"`);
  if (element.bedroomCount != null) dataAttrs.push(`data-bedrooms="${element.bedroomCount}"`);
  if (element.bathroomCount != null) dataAttrs.push(`data-bathrooms="${element.bathroomCount}"`);
  if (element.livingRoomCount != null) dataAttrs.push(`data-living-rooms="${element.livingRoomCount}"`);
  // ... existing attributes
  
  return `<rect ${dataAttrs.join(' ')} ... />`;
}
```

---

## 5. Utility Meter Validation

### Backend Meter Lookup

```typescript
// apps/api/src/modules/apartments/buildings.controller.ts

@Get(':id/meters')
@ApiOperation({ summary: 'List all utility meter IDs in a building' })
async getBuildingMeters(@Param('id') id: string) {
  return this.buildingsService.getMeters(id);
}

// apps/api/src/modules/apartments/buildings.service.ts

interface BuildingMeters {
  electricMeters: Array<{ id: string; apartmentId: string; unitNumber: string }>;
  waterMeters: Array<{ id: string; apartmentId: string; unitNumber: string }>;
  gasMeters: Array<{ id: string; apartmentId: string; unitNumber: string }>;
}

async getMeters(buildingId: string): Promise<BuildingMeters> {
  const apartments = await this.prisma.apartments.findMany({
    where: { building_id: buildingId },
    select: {
      id: true,
      unit_number: true,
      electric_meter_id: true,
      water_meter_id: true,
      gas_meter_id: true,
    },
  });

  return {
    electricMeters: apartments
      .filter(a => a.electric_meter_id)
      .map(a => ({ id: a.electric_meter_id!, apartmentId: a.id, unitNumber: a.unit_number })),
    waterMeters: apartments
      .filter(a => a.water_meter_id)
      .map(a => ({ id: a.water_meter_id!, apartmentId: a.id, unitNumber: a.unit_number })),
    gasMeters: apartments
      .filter(a => a.gas_meter_id)
      .map(a => ({ id: a.gas_meter_id!, apartmentId: a.id, unitNumber: a.unit_number })),
  };
}
```

### Frontend Meter Validation

```typescript
// apps/web/src/hooks/use-buildings.ts

export function useBuildingMeters(buildingId: string | undefined) {
  return useQuery({
    queryKey: ['buildings', buildingId, 'meters'],
    queryFn: () => apiClient.get<BuildingMeters>(`/buildings/${buildingId}/meters`),
    enabled: !!buildingId,
    staleTime: 5 * 60 * 1000,
  });
}

// In apartment-form-dialog.tsx
const { data: metersData } = useBuildingMeters(selectedBuildingId);

const validateMeterId = (meterId: string, meterType: 'electric' | 'water' | 'gas') => {
  if (!meterId || !metersData) return undefined;
  
  const meters = metersData[`${meterType}Meters`];
  const existing = meters.find(m => m.id === meterId && m.apartmentId !== apartmentId);
  
  if (existing) {
    return `Already used by unit ${existing.unitNumber}`;
  }
  return undefined;
};
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Contract Creation Flow                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌────────────┐ │
│  │ ContractForm│───▶│CreateContract│───▶│ Backend API │───▶│ PostgreSQL │ │
│  │   Dialog    │    │   Input      │    │   (NestJS)  │    │            │ │
│  └─────────────┘    └──────────────┘    └─────────────┘    └────────────┘ │
│        │                   │                   │                  │        │
│        │ contractType      │ contractType      │ contract_type    │        │
│        │ purchasePrice     │ purchasePrice     │ purchase_price   │        │
│        │ downPayment       │ downPayment       │ down_payment     │        │
│        │ transferDate      │ transferDate      │ transfer_date    │        │
│        │                   │                   │                  │        │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ Validation: backend DTO validates all fields, frontend sends them  │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          3D Viewer Status Colors                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────────┐ │
│  │ Building Page│───▶│useBuildingStats│───▶│ /buildings/:id/stats       │ │
│  └──────────────┘    └──────────────┘    └──────────────────────────────┘ │
│        │                                                                    │
│        ▼                                                                    │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────────┐ │
│  │ Building3D   │◀───│apartmentStatuses│◀───│ /apartments?buildingId=X   │ │
│  │  Component   │    │     prop     │    │    &select=id,status         │ │
│  └──────────────┘    └──────────────┘    └──────────────────────────────┘ │
│        │                                                                    │
│        ▼                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Each apartment mesh colored based on status:                         │  │
│  │   vacant=#22c55e  occupied=#3b82f6  maintenance=#f59e0b  reserved=#8b5cf6│
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## File Changes Summary

### Backend (apps/api)

| File | Change Type | Description |
|------|-------------|-------------|
| `apartments/buildings.controller.ts` | Modified | Add `/stats` and `/meters` endpoints |
| `apartments/buildings.service.ts` | Modified | Add `getStats()` and `getMeters()` methods |
| `apartments/apartments.service.ts` | Modified | Add advanced filters support |
| `apartments/apartments.controller.ts` | Modified | Add filter query parameters |
| `apartments/payment-schedule.service.ts` | Modified | Add `generatePurchaseMilestones()` |
| `apartments/payment-schedule.controller.ts` | Modified | Add purchase milestone endpoint |

### Frontend (apps/web)

| File | Change Type | Description |
|------|-------------|-------------|
| `hooks/use-contracts.ts` | Modified | Extend `CreateContractInput` interface |
| `hooks/use-buildings.ts` | Modified | Add `useBuildingStats()`, `useBuildingMeters()` |
| `app/(dashboard)/contracts/contract-form-dialog.tsx` | Modified | Send actual contract fields |
| `app/(dashboard)/apartments/page.tsx` | Modified | Add smart filters |
| `app/(dashboard)/apartments/apartment-filters.tsx` | New | Filter component |
| `components/3d/building-3d.tsx` | Modified | Add status colors |
| `components/3d/building-3d-legend.tsx` | New | Status legend component |
| `components/maps/svg-builder/svg-builder.types.ts` | Modified | Add interior fields |
| `components/maps/svg-builder/components/properties-panel.tsx` | Modified | Add bedroom/bathroom inputs |
| `components/payments/PaymentScheduleTable.tsx` | Modified | Add purchase milestone button |

---

*Design document created: April 3, 2026*

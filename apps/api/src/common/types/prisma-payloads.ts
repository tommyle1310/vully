// =============================================================================
// Prisma payload type aliases — auto-derived from schema, replaces hand-written interfaces
// =============================================================================

import { Prisma } from '@prisma/client';

// --- Apartments ---
export type ApartmentWithBuilding = Prisma.apartmentsGetPayload<{
  include: { buildings: true };
}>;

export type ApartmentFull = Prisma.apartmentsGetPayload<{
  include: {
    buildings: true;
    contracts: { include: { users_contracts_tenant_idTousers: true } };
    parking_slots: { include: { parking_zones: true } };
  };
}>;

/**
 * Apartment payload matching the common include pattern used by toResponseDto callers.
 * Relations are optional since different callers include different subsets.
 */
export type ApartmentForResponse = Prisma.apartmentsGetPayload<{
  include: {
    buildings: { select: { id: true; name: true; address: true } };
    users: { select: { id: true; first_name: true; last_name: true; email: true } };
    contracts: {
      include: {
        users_contracts_tenant_idTousers: {
          select: { id: true; first_name: true; last_name: true; email: true };
        };
      };
    };
  };
}>;

// --- Buildings ---
export type BuildingBase = Prisma.buildingsGetPayload<{}>;

export type BuildingWithCount = Prisma.buildingsGetPayload<{
  include: { _count: { select: { apartments: true } } };
}>;

// --- Contracts ---
export type ContractWithRelations = Prisma.contractsGetPayload<{
  include: {
    apartments: { include: { buildings: true } };
    users_contracts_tenant_idTousers: true;
  };
}>;

// --- Invoices ---
export type InvoiceWithLineItems = Prisma.invoicesGetPayload<{
  include: {
    invoice_line_items: true;
    contracts: {
      include: {
        apartments: { include: { buildings: true } };
        users_contracts_tenant_idTousers: true;
      };
    };
    apartments: {
      include: {
        buildings: true;
        users: true;
      };
    };
  };
}>;

export type InvoiceLineItem = Prisma.invoice_line_itemsGetPayload<{}>;

// --- Incidents ---
export type IncidentWithApartment = Prisma.incidentsGetPayload<{
  include: { apartments: { include: { buildings: true } } };
}>;

// --- Meter Readings ---
export type MeterReadingWithRelations = Prisma.meter_readingsGetPayload<{
  include: {
    apartments: { include: { buildings: true } };
    utility_types: true;
    users: true;
  };
}>;

// --- Parking ---
export type ParkingZoneWithSlots = Prisma.parking_zonesGetPayload<{
  include: { parking_slots: { select: { status: true } } };
}>;

export type ParkingSlotBase = Prisma.parking_slotsGetPayload<{
  include: { parking_zones: true };
}>;

// --- Access Cards ---
export type AccessCardWithRelations = Prisma.access_cardsGetPayload<{
  include: {
    apartments: { include: { buildings: true } };
  };
}>;

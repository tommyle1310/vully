// Barrel re-exports for apartment hooks
export type {
  Apartment,
  ApartmentFilters,
  ApartmentsResponse,
  ApartmentResponse,
  CreateApartmentInput,
  UpdateApartmentInput,
  Building,
  BuildingsResponse,
  EffectiveValue,
  ApartmentEffectiveConfig,
  EffectiveConfigResponse,
  ApartmentParkingSlot,
  ApartmentParkingSlotsResponse,
} from './apartment.types';
export {
  useApartments,
  useApartment,
  useBuildings,
  useApartmentEffectiveConfig,
  useApartmentParkingSlots,
} from './use-apartment-queries';
export {
  useCreateApartment,
  useUpdateApartmentStatus,
  useUpdateApartment,
  useDeleteApartment,
} from './use-apartment-mutations';

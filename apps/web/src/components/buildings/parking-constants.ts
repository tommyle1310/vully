import { Car, Bike } from 'lucide-react';

export interface BuildingParkingTabProps {
  buildingId: string;
}

export const PARKING_TYPE_ICONS = {
  car: Car,
  motorcycle: Bike,
  bicycle: Bike,
};

export const PARKING_TYPE_LABELS = {
  car: 'Car',
  motorcycle: 'Motorcycle',
  bicycle: 'Bicycle',
};

export const STATUS_COLORS = {
  available: 'bg-green-100 hover:bg-green-200 border-green-300 text-green-800',
  assigned: 'bg-blue-100 hover:bg-blue-200 border-blue-300 text-blue-800',
  reserved: 'bg-yellow-100 hover:bg-yellow-200 border-yellow-300 text-yellow-800',
  maintenance: 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-600',
};

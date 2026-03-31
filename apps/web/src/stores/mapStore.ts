import { create } from 'zustand';

interface Apartment {
  id: string;
  unitNumber: string;
  floor: number;
  status: 'vacant' | 'occupied' | 'maintenance' | 'reserved';
  areaSqm?: number;
  bedroomCount: number;
  bathroomCount: number;
  svgElementId?: string;
  building?: {
    id: string;
    name: string;
  };
  activeContract?: {
    id: string;
    tenant: {
      firstName: string;
      lastName: string;
    };
  };
}

interface MapState {
  selectedApartmentId: string | null;
  hoveredApartmentId: string | null;
  zoom: number;
  pan: { x: number; y: number };
  filters: {
    status: string[];
    floor: number | null;
  };
  apartments: Map<string, Apartment>; // svgElementId -> Apartment data
  setSelectedApartment: (id: string | null) => void;
  setHoveredApartment: (id: string | null) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setFilters: (filters: Partial<MapState['filters']>) => void;
  setApartments: (apartments: Apartment[]) => void;
  getApartmentBySvgId: (svgElementId: string) => Apartment | undefined;
  resetView: () => void;
}

const initialState = {
  selectedApartmentId: null,
  hoveredApartmentId: null,
  zoom: 1,
  pan: { x: 0, y: 0 },
  filters: {
    status: [],
    floor: null,
  },
  apartments: new Map<string, Apartment>(),
};

export const useMapStore = create<MapState>()((set, get) => ({
  ...initialState,
  setSelectedApartment: (id) => set({ selectedApartmentId: id }),
  setHoveredApartment: (id) => set({ hoveredApartmentId: id }),
  setZoom: (zoom) => set({ zoom }),
  setPan: (pan) => set({ pan }),
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),
  setApartments: (apartments) => {
    const apartmentMap = new Map<string, Apartment>();
    apartments.forEach((apt) => {
      if (apt.svgElementId) {
        apartmentMap.set(apt.svgElementId, apt);
      }
    });
    set({ apartments: apartmentMap });
  },
  getApartmentBySvgId: (svgElementId) => {
    return get().apartments.get(svgElementId);
  },
  resetView: () =>
    set({
      zoom: 1,
      pan: { x: 0, y: 0 },
      selectedApartmentId: null,
      hoveredApartmentId: null,
    }),
}));

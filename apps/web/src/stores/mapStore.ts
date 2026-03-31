import { create } from 'zustand';

interface MapState {
  selectedApartmentId: string | null;
  hoveredApartmentId: string | null;
  zoom: number;
  pan: { x: number; y: number };
  filters: {
    status: string[];
    floor: number | null;
  };
  setSelectedApartment: (id: string | null) => void;
  setHoveredApartment: (id: string | null) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setFilters: (filters: Partial<MapState['filters']>) => void;
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
};

export const useMapStore = create<MapState>()((set) => ({
  ...initialState,
  setSelectedApartment: (id) => set({ selectedApartmentId: id }),
  setHoveredApartment: (id) => set({ hoveredApartmentId: id }),
  setZoom: (zoom) => set({ zoom }),
  setPan: (pan) => set({ pan }),
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),
  resetView: () =>
    set({
      zoom: 1,
      pan: { x: 0, y: 0 },
      selectedApartmentId: null,
    }),
}));

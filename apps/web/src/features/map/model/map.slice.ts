import type { SliceCreator } from "../../../app/store/types.js";

export interface MapSlice {
  selectedPlaceId: string | null;
  mapRadius: number;
  selectPlace: (id: string) => void;
  clearSelectedPlace: () => void;
  setRadius: (r: number) => void;
}

export const createMapSlice: SliceCreator<MapSlice> = (set) => ({
  selectedPlaceId: null,
  mapRadius: 5_000,
  selectPlace: (id) => set({ selectedPlaceId: id }, undefined, "map/selectPlace"),
  clearSelectedPlace: () => set({ selectedPlaceId: null }, undefined, "map/clearSelectedPlace"),
  setRadius: (mapRadius) => set({ mapRadius }, undefined, "map/setRadius"),
});

import type { SliceCreator } from "../../../app/store/types";

export interface MapSlice {
  selectedPlaceId: string | null;
  radius: number; // metres
  selectPlace: (id: string | null) => void;
  setRadius: (m: number) => void;
}

export const createMapSlice: SliceCreator<MapSlice> = (set) => ({
  selectedPlaceId: null,
  radius: 2000,
  selectPlace: (id) => set({ selectedPlaceId: id }, undefined, "map/selectPlace"),
  setRadius: (m) => set({ radius: m }, undefined, "map/setRadius"),
});

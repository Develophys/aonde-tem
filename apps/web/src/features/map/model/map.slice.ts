import type { SliceCreator } from "../../../app/store/types.js";

export interface MapSlice {
  selectedDiscoveryId: string | null;
  mapRadius: number;
  selectDiscovery: (id: string) => void;
  clearSelectedDiscovery: () => void;
  setRadius: (r: number) => void;
}

export const createMapSlice: SliceCreator<MapSlice> = (set) => ({
  selectedDiscoveryId: null,
  mapRadius: 5_000,
  selectDiscovery: (id) => set({ selectedDiscoveryId: id }, undefined, "map/selectDiscovery"),
  clearSelectedDiscovery: () => set({ selectedDiscoveryId: null }, undefined, "map/clearSelectedDiscovery"),
  setRadius: (mapRadius) => set({ mapRadius }, undefined, "map/setRadius"),
});

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { AppStore } from "./types";
import { createUiSlice } from "./ui.slice";
import { createMapSlice } from "../../features/map/model/map.slice";

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      immer((...a) => ({
        ...createUiSlice(...a),
        ...createMapSlice(...a),
      })),
      { name: "aonde-tem", partialize: (s) => ({ theme: s.theme, mapRadius: s.mapRadius }) },
    ),
    { name: "AondeTemStore" },
  ),
);

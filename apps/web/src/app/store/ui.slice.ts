import type { SliceCreator } from "./types";

export interface UiSlice {
  theme: "light" | "dark";
  setTheme: (t: UiSlice["theme"]) => void;
}

export const createUiSlice: SliceCreator<UiSlice> = (set) => ({
  theme: "light",
  setTheme: (theme) => set({ theme }, undefined, "ui/setTheme"),
});

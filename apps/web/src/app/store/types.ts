import type { StateCreator } from "zustand";
import type { MapSlice } from "../../features/map/model/map.slice";
import type { UiSlice } from "./ui.slice";

export type Mutators = [["zustand/devtools", never], ["zustand/immer", never]];
export type AppStore = MapSlice & UiSlice;
export type SliceCreator<T> = StateCreator<AppStore, Mutators, [], T>;

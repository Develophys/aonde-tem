import type { StateCreator } from "zustand";
import type { MapSlice } from "../../features/map/model/map.slice.js";
import type { SessionSlice } from "../../features/auth/model/session.slice.js";
import type { UiSlice } from "./ui.slice.js";
import type { ToastSlice } from "./toast.slice.js";

export type Mutators = [["zustand/devtools", never], ["zustand/immer", never]];
export type AppStore = MapSlice & SessionSlice & UiSlice & ToastSlice;
export type SliceCreator<T> = StateCreator<AppStore, Mutators, [], T>;

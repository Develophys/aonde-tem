import type { JwtResponse } from "@aonde-tem/contracts";
import type { SliceCreator } from "@/app/store/types.js";

export type SessionUser = JwtResponse["user"];

export interface SessionSlice {
  accessToken: string | null;
  sessionUser: SessionUser | null;
  setSession: (token: string, user: SessionUser) => void;
  clearSession: () => void;
  isAuthenticated: () => boolean;
}

export const createSessionSlice: SliceCreator<SessionSlice> = (set, get) => ({
  accessToken: null,
  sessionUser: null,
  setSession: (accessToken, sessionUser) => set({ accessToken, sessionUser }),
  clearSession: () => set({ accessToken: null, sessionUser: null }),
  isAuthenticated: () => get().accessToken !== null,
});

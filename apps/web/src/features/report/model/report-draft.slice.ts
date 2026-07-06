import type { SliceCreator } from "@/app/store/types.js";

export interface ReportDraft {
  product: { id?: string; name: string } | null;
  place: { lat: number; lng: number; name: string; placeId?: string } | null;
  priceBrl: number | null;
  quantity: number;
}

const EMPTY_DRAFT: ReportDraft = { product: null, place: null, priceBrl: null, quantity: 1 };

// PlacePicker defaults a manually-typed place name to { lat: 0, lng: 0 } as a draft
// placeholder while no real location (a suggestion tap, or "use current location")
// has been chosen yet — (0, 0) is open ocean off the Gulf of Guinea, never a real
// Brazilian store, so it's a safe sentinel for "not actually located." Both
// ReportPage's submit gate and PlacePicker's own confirmation checkmark check this,
// so the two can't drift into checking it differently.
export function hasRealCoords(coords: { lat: number; lng: number }): boolean {
  return coords.lat !== 0 || coords.lng !== 0;
}

export interface ReportDraftSlice {
  reportDraft: ReportDraft;
  setReportDraft: (draft: ReportDraft) => void;
  clearReportDraft: () => void;
}

// Persisted (see app/store/index.ts partialize) so a reload mid-report doesn't
// silently discard whatever the user already typed — see docs/audits/AUDIT-web-2026-07-03.md.
export const createReportDraftSlice: SliceCreator<ReportDraftSlice> = (set) => ({
  reportDraft: EMPTY_DRAFT,
  setReportDraft: (reportDraft) => set({ reportDraft }, undefined, "report/setReportDraft"),
  clearReportDraft: () => set({ reportDraft: EMPTY_DRAFT }, undefined, "report/clearReportDraft"),
});

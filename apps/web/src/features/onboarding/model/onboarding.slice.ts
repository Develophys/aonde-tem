import type { SliceCreator } from "@/app/store/types.js";

export interface OnboardingSlice {
  hasSeenOnboarding: boolean;
  completeOnboarding: () => void;
}

// Persisted (see app/store/index.ts partialize) so the first-run flow shows exactly once
// per device. Set on skipping as well as finishing — a visitor who declines location must
// not be shown the intro again on their next visit.
export const createOnboardingSlice: SliceCreator<OnboardingSlice> = (set) => ({
  hasSeenOnboarding: false,
  completeOnboarding: () =>
    set({ hasSeenOnboarding: true }, undefined, "onboarding/completeOnboarding"),
});

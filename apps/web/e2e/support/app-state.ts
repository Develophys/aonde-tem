import type { Page } from "@playwright/test";

// Mirrors the `partialize` list in apps/web/src/app/store/index.ts and the envelope
// zustand's persist middleware writes ({ state, version }). Kept in one place so a
// change to what the app persists is a single edit here, not a hunt through specs.
export interface PersistedAppState {
  readonly theme: "light" | "dark";
  readonly mapRadius: number;
  readonly accessToken: string | null;
  readonly sessionUser: {
    readonly id: string;
    readonly email: string;
    readonly displayName: string | null;
    readonly role: "user" | "admin";
  } | null;
  readonly reportDraft: {
    readonly product: { readonly id?: string; readonly name: string } | null;
    readonly place: {
      readonly lat: number;
      readonly lng: number;
      readonly name: string;
      readonly placeId?: string;
    } | null;
    readonly priceBrl: number | null;
    readonly quantity: number;
  };
  readonly hasSeenOnboarding: boolean;
}

export const STORAGE_KEY = "aonde-tem";
export const STORAGE_VERSION = 0;

// Slice defaults, except hasSeenOnboarding: a browser profile that has already seen the
// intro is the state almost every test wants, since OnboardingGate sends anyone else to
// /onboarding before the map can render. Tests that want the first-run path opt out with
// `{ hasSeenOnboarding: false }` (or just skip the seed entirely).
const DEFAULT_STATE: PersistedAppState = {
  theme: "light",
  mapRadius: 5_000,
  accessToken: null,
  sessionUser: null,
  reportDraft: { product: null, place: null, priceBrl: null, quantity: 1 },
  hasSeenOnboarding: true,
};

/**
 * Seeds the persisted store before the app boots. Uses addInitScript rather than an
 * evaluate() after goto() because the gate is read on the very first render — writing
 * the flag afterwards would already be a redirect too late.
 */
export async function seedAppState(
  page: Page,
  overrides: Partial<PersistedAppState> = {},
): Promise<void> {
  const payload = JSON.stringify({
    state: { ...DEFAULT_STATE, ...overrides },
    version: STORAGE_VERSION,
  });
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [STORAGE_KEY, payload] as const,
  );
}

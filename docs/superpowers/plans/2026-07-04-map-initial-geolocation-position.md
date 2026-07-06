# Map Initial Geolocation Position Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix `SeekPage` so the map always mounts already-centered on the correct final position (real GPS fix or `DEFAULT_COORDS`), instead of sometimes locking onto the default position forever.

**Architecture:** `SeekPage` currently gates the map's mount on `coords` being truthy. Since `react-map-gl`'s `initialViewState` is only applied once at mount, any code path that could mount the map before geolocation settles risks it getting stuck. Switch the gate to `useGeolocation()`'s `loading` flag instead: show a full-screen loading state while `loading` is `true`, and mount `MapShell` exactly once `loading` becomes `false` — at which point `coords` is either resolved or definitively null (denied/error/timeout), so `center = coords ?? DEFAULT_COORDS` is already the final answer.

**Tech Stack:** React, TypeScript, Jest + Testing Library (`ts-jest`, jsdom), Zustand, TanStack Query, react-map-gl/MapLibre.

## Global Constraints

- No changes to `MapView.tsx`, `MapShell.tsx`, `map.slice.ts`, or `use-geolocation.ts` — the spec scopes this fix entirely to `SeekPage.tsx`'s mount-gating logic.
- Reuse the existing "map-loading skeleton" visual language (`bg-surface-alt` background, `text-text-muted text-sm` centered text) already established by `MapShell`'s Suspense fallback — per `DESIGN.md` line 138, `Surface Alt` is explicitly the token for this state. Do not invent a new spinner/skeleton component.
- Loading copy must be Portuguese, consistent with the rest of `SeekPage.tsx`'s copy (`"Buscando…"`, `"Localização negada — mostrando São Paulo. Pan para sua área."`).
- Test file must use the project's explicit-factory `jest.mock` pattern (see `apps/web/src/features/report/ui/ProductPicker.test.tsx` and `apps/web/src/features/auth/ui/AppHeader.test.tsx`) — no bare automocks.

---

### Task 1: Gate SeekPage's map mount on `loading`, not `coords`

**Files:**
- Modify: `apps/web/src/features/seek/ui/SeekPage.tsx:17` (destructure `loading`), `apps/web/src/features/seek/ui/SeekPage.tsx:46-51` (replace the conditional)
- Test: `apps/web/src/features/seek/ui/SeekPage.test.tsx` (new)

**Interfaces:**
- Consumes: `useGeolocation()` from `apps/web/src/features/map/model/use-geolocation.ts` — already returns `{ coords: GeoCoords | null; error: string | null; loading: boolean; denied: boolean }`. No signature change.
- Consumes: `DEFAULT_COORDS` from the same module — `{ lat: -23.5505, lng: -46.6333, accuracy: 0 }`. No change.
- Consumes: `MapShell` from `apps/web/src/features/map/ui/MapShell.tsx` — props `{ center: { lat: number; lng: number }; userPin?: { lat: number; lng: number }; discoveries: DiscoveryResponse[] }`. No change.
- Produces: nothing new consumed by later tasks — this plan has a single task.

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/features/seek/ui/SeekPage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { SeekPage } from "./SeekPage.js";
import { useGeolocation, DEFAULT_COORDS } from "../../map/model/use-geolocation.js";
import { useNearbyDiscoveries } from "../api/discovery.queries.js";
import { useAppStore } from "@/app/store/index.js";
import { useSaveData } from "@/shared/model/use-save-data.js";
import type { AppStore } from "@/app/store/types.js";

// Explicit factories (not bare automocks) — matches ProductPicker.test.tsx / AppHeader.test.tsx.
jest.mock("../../map/model/use-geolocation.js", () => ({
  ...jest.requireActual("../../map/model/use-geolocation.js"),
  useGeolocation: jest.fn(),
}));
const mockUseGeolocation = useGeolocation as jest.MockedFunction<typeof useGeolocation>;

const mockMapShell = jest.fn(() => <div data-testid="map-shell" />);
jest.mock("../../map/ui/MapShell.js", () => ({
  MapShell: (props: unknown) => mockMapShell(props),
}));

jest.mock("../api/discovery.queries.js", () => ({
  useNearbyDiscoveries: jest.fn(),
}));
const mockUseNearbyDiscoveries = useNearbyDiscoveries as jest.MockedFunction<
  typeof useNearbyDiscoveries
>;

jest.mock("@/app/store/index.js");
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

jest.mock("@/shared/model/use-save-data.js", () => ({
  useSaveData: jest.fn(),
}));
const mockUseSaveData = useSaveData as jest.MockedFunction<typeof useSaveData>;

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

function setupGeolocation(state: {
  coords: { lat: number; lng: number; accuracy: number } | null;
  denied: boolean;
  loading: boolean;
}) {
  mockUseGeolocation.mockReturnValue({ ...state, error: null });
}

function setup() {
  mockUseNearbyDiscoveries.mockReturnValue({
    data: { results: [] },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useNearbyDiscoveries>);

  const store = { mapRadius: 5_000, setRadius: jest.fn(), selectedPlaceId: null };
  mockUseAppStore.mockImplementation((selector: (s: AppStore) => unknown) =>
    selector(store as unknown as AppStore),
  );

  mockUseSaveData.mockReturnValue(false);

  return render(<SeekPage />);
}

describe("SeekPage — map mount gating", () => {
  it("shows a full-screen loading state and does not mount the map while geolocation is resolving", () => {
    setupGeolocation({ coords: null, denied: false, loading: true });
    setup();

    expect(screen.getByText("Localizando você…")).toBeInTheDocument();
    expect(screen.queryByTestId("map-shell")).not.toBeInTheDocument();
    expect(mockMapShell).not.toHaveBeenCalled();
  });

  it("mounts the map centered on the resolved coordinates once geolocation settles", () => {
    const coords = { lat: -23.5, lng: -46.6, accuracy: 5 };
    setupGeolocation({ coords, denied: false, loading: false });
    setup();

    expect(screen.queryByText("Localizando você…")).not.toBeInTheDocument();
    expect(mockMapShell).toHaveBeenCalledWith(
      expect.objectContaining({ center: coords, userPin: coords }),
    );
  });

  it("mounts the map centered on DEFAULT_COORDS when geolocation is denied", () => {
    setupGeolocation({ coords: null, denied: true, loading: false });
    setup();

    expect(mockMapShell).toHaveBeenCalledWith(
      expect.objectContaining({ center: DEFAULT_COORDS, userPin: undefined }),
    );
    expect(screen.getByText(/Localização negada/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd apps/web && npx jest SeekPage.test.tsx`

Expected: FAIL — the first test fails because `"Localizando você…"` doesn't exist yet; the second and third fail because `MapShell` currently only mounts when `coords` is truthy (so it never gets called in the denied case, and `mockMapShell` assertions on shape may also mismatch).

- [ ] **Step 3: Implement the fix**

In `apps/web/src/features/seek/ui/SeekPage.tsx`, change line 17 from:

```tsx
const { coords, denied } = useGeolocation();
```

to:

```tsx
const { coords, denied, loading } = useGeolocation();
```

Then replace lines 46-51:

```tsx
      {/* Full-screen map — underneath everything */}
      <div className="absolute inset-0">
        {coords &&
        <MapShell center={center} userPin={coords ?? undefined} discoveries={discoveries} />
         }
      </div>
```

with:

```tsx
      {/* Full-screen map — underneath everything */}
      <div className="absolute inset-0">
        {loading ? (
          <div className="w-full h-full bg-surface-alt flex items-center justify-center">
            <span className="text-text-muted text-sm">Localizando você…</span>
          </div>
        ) : (
          <MapShell center={center} userPin={coords ?? undefined} discoveries={discoveries} />
        )}
      </div>
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd apps/web && npx jest SeekPage.test.tsx`

Expected: PASS — all 3 tests green.

- [ ] **Step 5: Run the full web test suite to check for regressions**

Run: `cd apps/web && npx jest`

Expected: PASS — no other suite references the old `{coords && ...}` gate.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/seek/ui/SeekPage.tsx apps/web/src/features/seek/ui/SeekPage.test.tsx
git commit -m "fix(web): mount seek map only once geolocation settles

The map's initialViewState is applied once at mount by react-map-gl,
so mounting before geolocation resolves left it stuck on
DEFAULT_COORDS forever once a real fix arrived. Gate the mount on
useGeolocation's loading flag instead of coords truthiness, so the
map always mounts already-centered on its final position.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Self-Review Notes

- **Spec coverage:** Full-screen loading overlay while `loading` ✓ (Step 3). Map mounts once with correct final `center` ✓ (Step 3). Denied/unavailable falls back to `DEFAULT_COORDS` and stays pannable ✓ (test 3 + unchanged `MapShell`/`MapView` behavior). No changes to `MapView.tsx`/`MapShell.tsx`/`map.slice.ts`/`use-geolocation.ts` ✓ (Global Constraints, untouched by Task 1). `PlacePicker.tsx` explicitly out of scope ✓ (not touched).
- **Placeholder scan:** No TBDs; all steps contain literal code/commands.
- **Type consistency:** `MapShell` props (`center`, `userPin`, `discoveries`) match its existing `Props` interface in `MapShell.tsx`. `useGeolocation()`'s return shape (`coords`, `error`, `loading`, `denied`) matches `GeolocationState` in `use-geolocation.ts`.

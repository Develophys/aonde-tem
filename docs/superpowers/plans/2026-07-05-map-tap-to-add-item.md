# Map Tap-to-Add-Item Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user tap anywhere on the map to drop a pin, then tap that pin to open the existing
report flow pre-filled with those coordinates — a second entry point alongside the "+" FAB.

**Architecture:** Purely frontend (`apps/web`) — no API or contracts changes. New ephemeral state
(`draftPinCoords`) on the existing map Zustand slice; a small pure helper decides whether a map click
should drop a pin or defer to the existing discovery-marker click handler; `MapView` renders the pin
and, on tap, seeds `reportDraft.place` and navigates to the existing (already `ProtectedRoute`-guarded)
`/report` page. One targeted fix to `PlacePicker` so its "nearby places" suggestions match the tapped
point instead of always using live GPS.

**Tech Stack:** React + `react-map-gl`/MapLibre GL JS, Zustand, React Router, Jest + Testing Library.

## Global Constraints

- No backend/API/contracts changes — this feature is 100% client-side, reusing the existing
  `POST /discoveries` flow unchanged.
- `draftPinCoords` is ephemeral UI state — do **not** add it to the store's `partialize` list in
  `apps/web/src/app/store/index.ts`.
- Reuse the existing `/report` route and its `ProtectedRoute` guard — do not add new auth logic.
- The "+" FAB's behavior is unchanged by this plan.
- Full design: [`docs/superpowers/specs/2026-07-05-map-tap-to-add-item-design.md`](../specs/2026-07-05-map-tap-to-add-item-design.md),
  including the flagged (not resolved here) risk of not limiting *where* a user can report from.
- TypeScript strict mode; ESLint/Prettier; `pnpm test` for Jest; keep bilingual docs
  (`*.en.md`/`*.pt.md`) in sync.
- This project's frontend work is governed by the Impeccable design skill (register: `product`,
  per `CLAUDE.md`) — the draft-pin visual in Task 3 is written with plain Tailwind tokens to keep
  this plan self-contained; polish it against `DESIGN.md`/Impeccable at implementation time rather
  than treating the styling below as final.

---

## Task 1: Map slice — draft pin state

**Files:**
- Modify: `apps/web/src/features/map/model/map.slice.ts`
- Create: `apps/web/src/features/map/model/map.slice.test.ts`

**Interfaces:**
- Produces: `MapSlice.draftPinCoords: { lat: number; lng: number } | null`,
  `MapSlice.setDraftPin(coords: { lat: number; lng: number } | null): void` — consumed by Task 3's
  `MapView`.

- [ ] **Step 1: Write the failing test**

  Create `apps/web/src/features/map/model/map.slice.test.ts`:

  ```ts
  import { createMapSlice } from "./map.slice.js";
  import type { MapSlice } from "./map.slice.js";

  // createMapSlice's `set` calls always use the plain-object form (e.g.
  // `set({ ... }, undefined, "label")`), never the immer-recipe form — so a bare
  // Object.assign mock is a faithful stand-in for the real store here.
  function makeSlice() {
    const state: Partial<MapSlice> = {};
    const set = (partial: Partial<MapSlice>) => Object.assign(state, partial);
    const slice = createMapSlice(set as never, (() => state) as never, {} as never);
    Object.assign(state, slice);
    return { state, slice };
  }

  describe("createMapSlice — draft pin", () => {
    it("starts with draftPinCoords null", () => {
      const { slice } = makeSlice();
      expect(slice.draftPinCoords).toBeNull();
    });

    it("setDraftPin stores the tapped coordinates", () => {
      const { state, slice } = makeSlice();
      slice.setDraftPin({ lat: -23.5, lng: -46.6 });
      expect(state.draftPinCoords).toEqual({ lat: -23.5, lng: -46.6 });
    });

    it("setDraftPin(null) clears the pin", () => {
      const { state, slice } = makeSlice();
      slice.setDraftPin({ lat: -23.5, lng: -46.6 });
      slice.setDraftPin(null);
      expect(state.draftPinCoords).toBeNull();
    });
  });
  ```

- [ ] **Step 2: Run the test to verify it fails**

  Run: `pnpm --filter @aonde-tem/web test -- map.slice`
  Expected: FAIL — `setDraftPin`/`draftPinCoords` don't exist on the slice yet

- [ ] **Step 3: Add the state and action**

  Modify `apps/web/src/features/map/model/map.slice.ts`:

  ```ts
  import type { SliceCreator } from "@/app/store/types.js";

  export interface MapSlice {
    selectedPlaceId: string | null;
    mapRadius: number;
    draftPinCoords: { lat: number; lng: number } | null;
    selectPlace: (id: string) => void;
    clearSelectedPlace: () => void;
    setRadius: (r: number) => void;
    setDraftPin: (coords: { lat: number; lng: number } | null) => void;
  }

  export const createMapSlice: SliceCreator<MapSlice> = (set) => ({
    selectedPlaceId: null,
    mapRadius: 5_000,
    draftPinCoords: null,
    selectPlace: (id) => set({ selectedPlaceId: id }, undefined, "map/selectPlace"),
    clearSelectedPlace: () => set({ selectedPlaceId: null }, undefined, "map/clearSelectedPlace"),
    setRadius: (mapRadius) => set({ mapRadius }, undefined, "map/setRadius"),
    setDraftPin: (draftPinCoords) => set({ draftPinCoords }, undefined, "map/setDraftPin"),
  });
  ```

- [ ] **Step 4: Run the test to verify it passes**

  Run: `pnpm --filter @aonde-tem/web test -- map.slice`
  Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

  ```bash
  git add apps/web/src/features/map/model/map.slice.ts apps/web/src/features/map/model/map.slice.test.ts
  git commit -m "feat(web): add draft pin state to the map slice"
  ```

---

## Task 2: Shared discovery-layer IDs + click-collision helper

**Files:**
- Create: `apps/web/src/features/map/model/discovery-layer-ids.ts`
- Create: `apps/web/src/features/map/model/should-drop-pin.ts`
- Create: `apps/web/src/features/map/model/should-drop-pin.test.ts`
- Modify: `apps/web/src/features/map/ui/DiscoveryMarkerLayer.tsx`

**Interfaces:**
- Produces: `DISCOVERY_POINTS_LAYER_ID`, `DISCOVERY_CLUSTERS_LAYER_ID`, `DISCOVERY_LAYER_IDS` (used
  by both `DiscoveryMarkerLayer` here and `MapView` in Task 3); `shouldDropPinAt(map: QueryableMap,
  point: { x: number; y: number }): boolean` (consumed by Task 3's `MapView`).

- [ ] **Step 1: Write the failing test for `shouldDropPinAt`**

  Create `apps/web/src/features/map/model/should-drop-pin.test.ts`:

  ```ts
  import { shouldDropPinAt, type QueryableMap } from "./should-drop-pin.js";

  function makeMap(overrides: Partial<QueryableMap> = {}): QueryableMap {
    return {
      getLayer: () => undefined,
      queryRenderedFeatures: () => [],
      ...overrides,
    };
  }

  describe("shouldDropPinAt", () => {
    it("returns true when no discovery layer exists yet (e.g. zero discoveries loaded)", () => {
      const map = makeMap({ getLayer: () => undefined });
      expect(shouldDropPinAt(map, { x: 10, y: 10 })).toBe(true);
    });

    it("returns true when the click misses every discovery feature", () => {
      const map = makeMap({
        getLayer: (id) => (id === "places-points" ? {} : undefined),
        queryRenderedFeatures: () => [],
      });
      expect(shouldDropPinAt(map, { x: 10, y: 10 })).toBe(true);
    });

    it("returns false when the click hits an existing discovery feature", () => {
      const map = makeMap({
        getLayer: (id) => (id === "places-points" ? {} : undefined),
        queryRenderedFeatures: () => [{ type: "Feature" } as never],
      });
      expect(shouldDropPinAt(map, { x: 10, y: 10 })).toBe(false);
    });

    it("only queries layers that currently exist, to avoid MapLibre throwing on an unknown layer id", () => {
      const queryRenderedFeatures = jest.fn().mockReturnValue([]);
      const map = makeMap({
        getLayer: (id) => (id === "places-clusters" ? {} : undefined),
        queryRenderedFeatures,
      });
      shouldDropPinAt(map, { x: 1, y: 1 });
      expect(queryRenderedFeatures).toHaveBeenCalledWith({ x: 1, y: 1 }, { layers: ["places-clusters"] });
    });
  });
  ```

- [ ] **Step 2: Run the test to verify it fails**

  Run: `pnpm --filter @aonde-tem/web test -- should-drop-pin`
  Expected: FAIL — `Cannot find module './should-drop-pin.js'`

- [ ] **Step 3: Implement the shared layer IDs and the helper**

  Create `apps/web/src/features/map/model/discovery-layer-ids.ts`:

  ```ts
  export const DISCOVERY_POINTS_LAYER_ID = "places-points";
  export const DISCOVERY_CLUSTERS_LAYER_ID = "places-clusters";
  export const DISCOVERY_LAYER_IDS = [DISCOVERY_POINTS_LAYER_ID, DISCOVERY_CLUSTERS_LAYER_ID] as const;
  ```

  Create `apps/web/src/features/map/model/should-drop-pin.ts`:

  ```ts
  import { DISCOVERY_LAYER_IDS } from "./discovery-layer-ids.js";

  /** The minimal slice of MapLibre's Map API this helper needs — kept narrow so it's trivial to fake in tests. */
  export interface QueryableMap {
    getLayer(id: string): unknown;
    queryRenderedFeatures(point: { x: number; y: number }, options: { layers: string[] }): unknown[];
  }

  /**
   * Decides whether a map click should drop a new "add item here" pin, or whether it
   * landed on an existing discovery marker/cluster (whose own click handler already
   * opens the place sheet — see DiscoveryMarkerLayer). MapLibre throws if you query a
   * layer id that hasn't been added yet (e.g. zero discoveries loaded), so only the
   * layers currently present are queried.
   */
  export function shouldDropPinAt(map: QueryableMap, point: { x: number; y: number }): boolean {
    const existingLayers = DISCOVERY_LAYER_IDS.filter((id) => map.getLayer(id));
    if (existingLayers.length === 0) return true;
    const hits = map.queryRenderedFeatures(point, { layers: existingLayers });
    return hits.length === 0;
  }
  ```

- [ ] **Step 4: Run the test to verify it passes**

  Run: `pnpm --filter @aonde-tem/web test -- should-drop-pin`
  Expected: PASS (4 tests)

- [ ] **Step 5: Point `DiscoveryMarkerLayer` at the shared constants**

  Modify `apps/web/src/features/map/ui/DiscoveryMarkerLayer.tsx` — add the import:

  ```ts
  import { DISCOVERY_POINTS_LAYER_ID, DISCOVERY_CLUSTERS_LAYER_ID } from "../model/discovery-layer-ids.js";
  ```

  Then replace every hardcoded occurrence of the two layer id strings with the constants. The
  `addLayer` calls:

  ```ts
      map.addLayer({
        id: DISCOVERY_CLUSTERS_LAYER_ID,
        type: "circle",
        source: "places",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": MAP_COLORS.brand,
          "circle-radius": ["step", ["get", "point_count"], 16, 5, 22, 20, 28],
          "circle-opacity": 0.9,
        },
      });

      map.addLayer({
        id: DISCOVERY_POINTS_LAYER_ID,
        type: "circle",
        source: "places",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 12,
          "circle-color": ["get", "color"],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.9,
        },
      });

      map.on("click", DISCOVERY_POINTS_LAYER_ID, (e) => {
        const placeId = e.features?.[0]?.properties?.placeId;
        if (placeId) selectPlace(String(placeId));
      });
  ```

  And the cleanup block:

  ```ts
      try {
        if (map.getLayer(DISCOVERY_POINTS_LAYER_ID)) map.removeLayer(DISCOVERY_POINTS_LAYER_ID);
        if (map.getLayer(DISCOVERY_CLUSTERS_LAYER_ID)) map.removeLayer(DISCOVERY_CLUSTERS_LAYER_ID);
        if (map.getSource("places")) map.removeSource("places");
      } catch {
        // map already removed — nothing to clean up
      }
  ```

- [ ] **Step 6: Run the full web test suite to check for regressions**

  Run: `pnpm --filter @aonde-tem/web test`
  Expected: PASS

- [ ] **Step 7: Commit**

  ```bash
  git add apps/web/src/features/map/model/discovery-layer-ids.ts \
    apps/web/src/features/map/model/should-drop-pin.ts \
    apps/web/src/features/map/model/should-drop-pin.test.ts \
    apps/web/src/features/map/ui/DiscoveryMarkerLayer.tsx
  git commit -m "refactor(web): extract discovery layer ids and a click-collision helper"
  ```

---

## Task 3: `MapView` — draft pin marker and navigation

**Files:**
- Modify: `apps/web/src/features/map/ui/MapView.tsx`

**Interfaces:**
- Consumes: `MapSlice.draftPinCoords`/`setDraftPin` (Task 1), `shouldDropPinAt` (Task 2),
  `ReportDraftSlice.reportDraft`/`setReportDraft` (existing, `apps/web/src/features/report/model/report-draft.slice.ts`).
- Produces: no new exports — this task is UI wiring inside `MapView`, verified by manual QA (see
  Step 3 below for why an automated test isn't written here).

- [ ] **Step 1: Wire the draft pin into `MapView`**

  There's no existing automated test for `MapView.tsx` (or any file in
  `apps/web/src/features/map/ui/`), because `react-map-gl`'s `<Map>` renders a real MapLibre GL/WebGL
  canvas that this project's jsdom-based Jest setup can't instantiate — the same reason
  `DiscoveryMarkerLayer` has no test either. The two pieces of *logic* worth testing in isolation
  (the layer-collision check, and the slice's state transitions) were already covered with real unit
  tests in Tasks 1–2; this step is JSX wiring on top of them, verified manually in Step 3.

  Modify `apps/web/src/features/map/ui/MapView.tsx`:

  ```tsx
  import Map, { Marker, type MapRef, type MapLayerMouseEvent } from "react-map-gl/maplibre";
  import "maplibre-gl/dist/maplibre-gl.css";
  import type { DiscoveryResponse } from "@aonde-tem/contracts";
  import { DiscoveryMarkerLayer } from "./DiscoveryMarkerLayer.js";
  import { PlaceModal } from "./PlaceModal.js";
  import { useRef, useCallback } from "react";
  import { useNavigate } from "react-router-dom";
  import { useAppStore } from "@/app/store/index.js";
  import { useSaveData } from "@/shared/model/use-save-data.js";
  import { shouldDropPinAt } from "../model/should-drop-pin.js";

  const MAP_STYLE =
    import.meta.env.VITE_MAP_KEY && import.meta.env.VITE_MAP_KEY !== "demo"
      ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${import.meta.env.VITE_MAP_KEY}`
      : "https://tiles.openfreemap.org/styles/bright";

  // One zoom level out means each tile covers 4x the area, so the same viewport
  // needs roughly a quarter of the tile requests on first paint — per docs/PERFORMANCE.md
  // §3's "fewer map tiles" guidance under Save-Data. The user can still zoom in freely.
  const DEFAULT_ZOOM = 14;
  const SAVE_DATA_ZOOM = 13;

  interface MapViewProps {
    readonly center: { lat: number; lng: number };
    readonly userPin?: { lat: number; lng: number };
    readonly discoveries: DiscoveryResponse[];
  }

  export function MapView({ center, userPin, discoveries }: MapViewProps) {
    const mapRef = useRef<MapRef>(null);
    const navigate = useNavigate();
    const selectedPlaceId = useAppStore((s) => s.selectedPlaceId);
    const draftPinCoords = useAppStore((s) => s.draftPinCoords);
    const setDraftPin = useAppStore((s) => s.setDraftPin);
    const reportDraft = useAppStore((s) => s.reportDraft);
    const setReportDraft = useAppStore((s) => s.setReportDraft);
    const saveData = useSaveData();

    const recenter = useCallback(() => {
      if (!userPin || !mapRef.current) return;
      mapRef.current.flyTo({ center: [userPin.lng, userPin.lat], zoom: 15, duration: 800 });
    }, [userPin]);

    const flyToPlace = useCallback((coords: { lat: number; lng: number }) => {
      mapRef.current?.flyTo({ center: [coords.lng, coords.lat], zoom: 17, duration: 800 });
    }, []);

    const handleMapClick = useCallback(
      (e: MapLayerMouseEvent) => {
        if (!shouldDropPinAt(e.target, e.point)) return;
        setDraftPin({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      },
      [setDraftPin],
    );

    const handleDraftPinClick = useCallback(
      (e: { originalEvent: MouseEvent }) => {
        // Defensive: prevents this same click from also bubbling into handleMapClick
        // and re-dropping the pin at the same spot it was just tapped to open from.
        e.originalEvent.stopPropagation();
        if (!draftPinCoords) return;
        setReportDraft({
          ...reportDraft,
          place: { lat: draftPinCoords.lat, lng: draftPinCoords.lng, name: "" },
        });
        setDraftPin(null);
        navigate("/report");
      },
      [draftPinCoords, reportDraft, setReportDraft, setDraftPin, navigate],
    );

    return (
      <div className="relative w-full h-full">
        <Map
          ref={mapRef}
          initialViewState={{
            longitude: center.lng,
            latitude: center.lat,
            zoom: saveData ? SAVE_DATA_ZOOM : DEFAULT_ZOOM,
          }}
          mapStyle={MAP_STYLE}
          style={{ width: "100%", height: "100%" }}
          attributionControl={false}
          onClick={handleMapClick}
        >
          <DiscoveryMarkerLayer discoveries={discoveries} />

          {userPin && (
            <Marker longitude={userPin.lng} latitude={userPin.lat} anchor="center">
              <div
                className="bg-user-location rounded-full border-2 border-white"
                style={{ width: 14, height: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.35)" }}
                aria-label="Sua localização"
              />
            </Marker>
          )}

          {draftPinCoords && (
            <Marker
              longitude={draftPinCoords.lng}
              latitude={draftPinCoords.lat}
              anchor="bottom"
              onClick={handleDraftPinClick}
            >
              <button type="button" aria-label="Adicionar item aqui" className="flex flex-col items-center">
                <span
                  className="w-8 h-8 rounded-full bg-accent border-2 border-white flex items-center justify-center text-white text-lg font-bold"
                  style={{ boxShadow: "0 2px 6px rgba(0,0,0,0.35)" }}
                >
                  +
                </span>
              </button>
            </Marker>
          )}
        </Map>

        {userPin && (
          <button
            type="button"
            onClick={recenter}
            aria-label="Centralizar em minha localização"
            className="absolute bottom-24 right-4 z-(--z-sticky) bg-surface shadow-md rounded-full w-11 h-11 flex items-center justify-center border border-border"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
            </svg>
          </button>
        )}

        {selectedPlaceId && <PlaceModal placeId={selectedPlaceId} onFlyTo={flyToPlace} />}
      </div>
    );
  }
  ```

- [ ] **Step 2: Typecheck**

  Run: `pnpm --filter @aonde-tem/web typecheck`
  Expected: no errors

- [ ] **Step 3: Manually verify in the browser**

  Use this project's `run` skill (or `pnpm --filter @aonde-tem/web dev` directly) to start the app,
  then on the map (SeekPage, `/`):
  - Tap an empty area of the map → a "+" pin appears there.
  - Tap a different empty area → the pin moves there (old one disappears).
  - Tap an existing discovery marker (a colored dot) → the place sheet (`PlaceModal`) opens, and no
    stray draft pin appears underneath it.
  - Tap the draft pin itself → you're taken to `/report` (or `/signin` if logged out, same as the "+"
    FAB today); if logged in, the `PlacePicker` step should show that location's coordinates already
    applied (no name yet — you still type/select one).

- [ ] **Step 4: Commit**

  ```bash
  git add apps/web/src/features/map/ui/MapView.tsx
  git commit -m "feat(web): drop a draft pin on map tap that opens the report flow"
  ```

---

## Task 4: `PlacePicker` — nearby-places query prefers the selected location

**Files:**
- Modify: `apps/web/src/features/report/ui/PlacePicker.tsx`
- Create: `apps/web/src/features/report/ui/PlacePicker.test.tsx`

**Interfaces:**
- No new exports — internal fix to which coordinates feed the existing
  `useNearbyPlaces(lat, lng)` call.

- [ ] **Step 1: Write the failing test**

  Create `apps/web/src/features/report/ui/PlacePicker.test.tsx`:

  ```tsx
  import { render } from "@testing-library/react";
  import { PlacePicker } from "./PlacePicker.js";
  import { useGeolocation } from "../../map/model/use-geolocation.js";
  import { useNearbyPlaces } from "../api/places.api.js";

  jest.mock("../../map/model/use-geolocation.js", () => ({
    useGeolocation: jest.fn(),
  }));
  const mockUseGeolocation = useGeolocation as jest.MockedFunction<typeof useGeolocation>;

  jest.mock("../api/places.api.js", () => ({
    useNearbyPlaces: jest.fn(),
  }));
  const mockUseNearbyPlaces = useNearbyPlaces as jest.MockedFunction<typeof useNearbyPlaces>;

  function setup(
    value: { lat: number; lng: number; name: string; placeId?: string } | null,
    gps: { lat: number; lng: number; accuracy: number } | null,
  ) {
    mockUseGeolocation.mockReturnValue({ coords: gps, error: null, loading: false, denied: false });
    mockUseNearbyPlaces.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useNearbyPlaces>);
    render(<PlacePicker value={value} onChange={jest.fn()} />);
  }

  describe("PlacePicker — nearby-places query coordinates", () => {
    it("uses the GPS position when no place is selected yet", () => {
      setup(null, { lat: -23.5, lng: -46.6, accuracy: 10 });
      expect(mockUseNearbyPlaces).toHaveBeenCalledWith(-23.5, -46.6);
    });

    it("uses the GPS position when value is still the {0,0} free-typed placeholder", () => {
      setup({ lat: 0, lng: 0, name: "Mercadinho" }, { lat: -23.5, lng: -46.6, accuracy: 10 });
      expect(mockUseNearbyPlaces).toHaveBeenCalledWith(-23.5, -46.6);
    });

    it("prefers the selected place's real coordinates over GPS", () => {
      setup({ lat: -22.9, lng: -43.2, name: "" }, { lat: -23.5, lng: -46.6, accuracy: 10 });
      expect(mockUseNearbyPlaces).toHaveBeenCalledWith(-22.9, -43.2);
    });
  });
  ```

- [ ] **Step 2: Run the test to verify it fails**

  Run: `pnpm --filter @aonde-tem/web test -- PlacePicker`
  Expected: FAIL — the third case receives `(-23.5, -46.6)` (GPS) instead of `(-22.9, -43.2)`

- [ ] **Step 3: Implement the fix**

  Modify `apps/web/src/features/report/ui/PlacePicker.tsx` — change:

  ```ts
    const { coords, denied } = useGeolocation();
    const [placeName, setPlaceName] = useState(value?.name ?? "");
    const { data: nearbyPlaces } = useNearbyPlaces(coords?.lat, coords?.lng);
  ```

  to:

  ```ts
    const { coords, denied } = useGeolocation();
    const [placeName, setPlaceName] = useState(value?.name ?? "");
    // Prefer the already-selected place's coordinates for "nearby" suggestions (e.g. a
    // location pre-filled by tapping the map) over the device's live GPS position.
    // {0,0} is this component's existing sentinel for "no real place chosen yet" (see
    // the free-text onChange handler below), so treat that as "fall back to GPS" too.
    const hasRealValue = value != null && (value.lat !== 0 || value.lng !== 0);
    const searchCoords = hasRealValue ? { lat: value.lat, lng: value.lng } : coords;
    const { data: nearbyPlaces } = useNearbyPlaces(searchCoords?.lat, searchCoords?.lng);
  ```

- [ ] **Step 4: Run the test to verify it passes**

  Run: `pnpm --filter @aonde-tem/web test -- PlacePicker`
  Expected: PASS (3 tests)

- [ ] **Step 5: Run the full web test suite to check for regressions**

  Run: `pnpm --filter @aonde-tem/web test`
  Expected: PASS

- [ ] **Step 6: Commit**

  ```bash
  git add apps/web/src/features/report/ui/PlacePicker.tsx apps/web/src/features/report/ui/PlacePicker.test.tsx
  git commit -m "fix(web): PlacePicker nearby-places query prefers the selected location over GPS"
  ```

---

## Task 5: Documentation

**Files:**
- Modify: `docs/specs/report-discovery.spec.md`
- Modify: `docs/RISKS.md`
- Modify: `docs/RISKS.pt.md`
- Modify: `docs/backlog/BACKLOG.en.md`
- Modify: `docs/backlog/BACKLOG.pt.md`
- Modify: `docs/PRODUCT.en.md`
- Modify: `docs/PRODUTO.pt.md`

No tests apply — documentation only. Each step is a direct edit.

- [ ] **Step 1: Add the requirement to the report-discovery spec**

  Modify `docs/specs/report-discovery.spec.md` — in the `### P0` section, immediately after the
  existing bullet:

  ```md
  - **Place via pin or GPS** + typed name → stored as a PostGIS point; reuse a nearby existing place or create new.
  ```

  add:

  ```md
  - **Tap-to-add-item on the map**: tapping any point on the map (that isn't an existing discovery
    marker) drops a pin; tapping that pin opens the report flow with the tapped coordinates
    pre-filled as the place. This is a second entry point alongside the "+" FAB, not a replacement.
    ⚠️ **Not limited to the user's current position in this version** — see
    [`2026-07-05-map-tap-to-add-item-design.md`](../superpowers/specs/2026-07-05-map-tap-to-add-item-design.md)
    for the flagged data-quality/abuse risk this raises, which is an open discussion item, not
    resolved by this work.
  ```

- [ ] **Step 2: Add the risk to `RISKS.md`**

  Modify `docs/RISKS.md` — add a new row after `R-07` (adjust the ID if a different number has been
  claimed by other work in the meantime — check the file's current last `R-##` first):

  ```md
  | R-08 | **Unverified remote reporting** — a user can drop a pin and submit a report anywhere on the map, not just where they physically are, with no proximity check between reporter and reported point. | High — enables fake prices at competitors' stores or spam at arbitrary locations | Not mitigated yet — existing safeguards (confirmation step, flags, freshness TTL) reduce blast radius but don't prevent it. Candidate mitigations to discuss: distance-based warnings, trust/reputation gating for far-away reports, surfacing reporter-to-place distance to moderators. | `2026-07-05-map-tap-to-add-item-design.md` |
  ```

- [ ] **Step 3: Mirror the risk in the Portuguese risks doc**

  Modify `docs/RISKS.pt.md` — add the equivalent row in Portuguese, matching whatever row-ID this
  file is already up to (check its current last risk row first, same as Step 2).

- [ ] **Step 4: Add a backlog item**

  Modify `docs/backlog/BACKLOG.en.md` — add a new row in the same table/section as the other
  report-discovery items (near `AT-133`/`AT-134`), using the next available `AT-###` id (check the
  file's current highest `AT-###` first):

  ```md
  | AT-1xx | **Tap-to-add-item on the map** — drop a pin anywhere, tap it to open the report flow pre-filled with that location | feature | P1 | 3 | M | ✅ Done | R-08 |
  ```

  Mirror the same row (translated) in `docs/backlog/BACKLOG.pt.md`, using the matching `✅ Feito`
  status label.

- [ ] **Step 5: Document the capability in the product docs**

  Modify `docs/PRODUCT.en.md` — in the section describing the report/contribute flow, add: users can
  also start a report by tapping any point on the map, not only via the "+" button; note that v1 does
  not restrict this to the user's current location, and that this is flagged as an open risk (link to
  `docs/RISKS.md`).

  Modify `docs/PRODUTO.pt.md` — add the equivalent sentence in Portuguese in the same section.

- [ ] **Step 6: Commit**

  ```bash
  git add docs/specs/report-discovery.spec.md docs/RISKS.md docs/RISKS.pt.md \
    docs/backlog/BACKLOG.en.md docs/backlog/BACKLOG.pt.md docs/PRODUCT.en.md docs/PRODUTO.pt.md
  git commit -m "docs: document map tap-to-add-item and flag the unverified-remote-reporting risk"
  ```

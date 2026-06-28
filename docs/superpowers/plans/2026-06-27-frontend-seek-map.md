# Frontend — Seek / Map Flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the read side of the seek loop: a map centered on the user's location, a search input for items, and nearby discovery markers — usable with no login, fast on low-end Android/3G.

**Architecture:** Feature-sliced React: `features/map/{ui,model,api}` + `features/seek/{ui,model,api}`. MapLibre lazy-loaded with `React.lazy` + dynamic import — **never in the initial bundle**. TanStack Query for server state. Zustand slices for map/UI client state (already exists from scaffold).

**Tech Stack:** React 18, Vite, MapLibre GL JS (via `react-map-gl/maplibre`), TanStack Query, Zustand, Tailwind CSS v4, TypeScript strict.

## Global Constraints

- **Prerequisite:** Plans A, B must be complete — discovery contracts and API must exist
- **CRITICAL:** MapLibre (`maplibre-gl`) must NOT appear in the initial bundle. Use `React.lazy(() => import('./MapView'))` and `Suspense`. Initial JS ≤ 150 KB gzip (PERFORMANCE.md)
- Map tiles from MapTiler — key in `VITE_MAP_KEY` env var (AT-040)
- Geolocation: ask permission on user action, graceful denial → show pan/search fallback
- Discovery markers use MapLibre GL layer (not DOM `<Marker>`) for dense sets — keeps DOM lean
- Debounce search input 300 ms before querying API
- Freshness visually shown: < 2h = bright; 2–12h = mid; > 12h = faded
- Tailwind v4 tokens from `apps/web/src/app/index.css` — no hardcoded hex values in components
- Apply the **Impeccable** design skill before writing any UI components: map-first, glanceable cards, bottom-sheet patterns, generous tap targets (≥ 44px), high contrast for sunlight
- Backlog items: AT-040, AT-041, AT-042, AT-043, AT-053, AT-055, AT-056, AT-057, AT-118

---

## File Structure

**New files:**
- `apps/web/src/features/map/ui/MapView.tsx` — lazy-loadable MapLibre wrapper
- `apps/web/src/features/map/ui/MapShell.tsx` — outer shell with lazy Suspense
- `apps/web/src/features/map/ui/DiscoveryMarkerLayer.tsx` — GL layer for discovery dots
- `apps/web/src/features/map/ui/DiscoveryPopup.tsx` — bottom sheet on marker tap
- `apps/web/src/features/map/model/use-geolocation.ts` — update existing (already partial)
- `apps/web/src/features/seek/api/discovery.api.ts`
- `apps/web/src/features/seek/api/discovery.queries.ts`
- `apps/web/src/features/seek/ui/SearchBar.tsx`
- `apps/web/src/features/seek/ui/SeekPage.tsx` — main page composition
- `apps/web/src/features/seek/ui/EmptyState.tsx`
- `apps/web/src/app/index.css` — design token additions
- `apps/web/public/manifest.webmanifest` — real PWA manifest
- `apps/web/public/icons/` — 192, 512, 512-maskable PNG icons

**Modified files:**
- `apps/web/src/app/store/types.ts` — add `MapSlice` import
- `apps/web/src/features/map/model/map.slice.ts` — add selected discovery state
- `apps/web/vite.config.ts` — update PWA manifest, ensure MapLibre is not pre-bundled
- `apps/web/src/main.tsx` or routing file — register SeekPage as the index route

---

### Task 1: MapTiler env + Tailwind design tokens (AT-040)

**Files:**
- Modify: `.env.example` — add `VITE_MAP_KEY`
- Modify: `apps/web/src/app/index.css` — verify design tokens

- [ ] **Step 1: Add VITE_MAP_KEY to env example**

```bash
echo "\nVITE_MAP_KEY=your_maptiler_key_here" >> .env.example
```

Then create `apps/web/.env.local` (git-ignored):

```
VITE_MAP_KEY=<your actual MapTiler key>
```

Get a free key at https://maptiler.com (100k tile requests/month free).

- [ ] **Step 2: Verify/update Tailwind tokens in `apps/web/src/app/index.css`**

Ensure these tokens exist (add if missing):

```css
@import "tailwindcss";

@theme {
  /* Brand */
  --color-brand: #1a5c3a;
  --color-brand-light: #2d8f5a;
  --color-surface: #ffffff;
  --color-surface-alt: #f7f7f5;
  --color-border: #e5e5e0;

  /* Freshness states */
  --color-fresh: #1a5c3a;
  --color-aging: #b45309;
  --color-stale: #9ca3af;

  /* Text */
  --color-text: #1a1a1a;
  --color-text-muted: #6b7280;

  /* Spacing */
  --radius-card: 0.75rem;

  /* Typography */
  --font-sans: system-ui, -apple-system, "Segoe UI", sans-serif;
}
```

- [ ] **Step 3: Commit**

```bash
git add .env.example apps/web/src/app/index.css
git commit -m "chore(web): MapTiler env var + design tokens (AT-040)"
```

---

### Task 2: Geolocation hook (complete AT-042)

**Files:**
- Modify: `apps/web/src/features/map/model/use-geolocation.ts`

**Interfaces:**
- Produces: `useGeolocation()` → `{ coords?, error?, loading, denied }`

- [ ] **Step 1: Write the complete hook**

```typescript
// apps/web/src/features/map/model/use-geolocation.ts
import { useState, useEffect } from "react";

interface GeoCoords {
  lat: number;
  lng: number;
  accuracy: number;
}

interface GeolocationState {
  coords: GeoCoords | null;
  error: string | null;
  loading: boolean;
  denied: boolean;
}

export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    coords: null,
    error: null,
    loading: true,
    denied: false,
  });

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setState({ coords: null, error: "Localização não disponível neste dispositivo", loading: false, denied: false });
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy },
          error: null,
          loading: false,
          denied: false,
        });
      },
      (err) => {
        const denied = err.code === err.PERMISSION_DENIED;
        setState({ coords: null, error: err.message, loading: false, denied });
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 10_000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return state;
}

// Default coordinates — São Paulo city center (used when geolocation denied/unavailable)
export const DEFAULT_COORDS: GeoCoords = { lat: -23.5505, lng: -46.6333, accuracy: 0 };
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/map/model/use-geolocation.ts
git commit -m "feat(web): geolocation hook with permission handling (AT-042)"
```

---

### Task 3: Discovery API fetcher + TanStack Query hooks

**Files:**
- Create: `apps/web/src/features/seek/api/discovery.api.ts`
- Create: `apps/web/src/features/seek/api/discovery.queries.ts`

**Interfaces:**
- Consumes: `nearbyDiscoveriesResponseSchema` from `@app/contracts`; `http` wrapper from `apps/web/src/shared/api/http.ts`
- Produces: `useNearbyDiscoveries(lat, lng, radius, item)` → `{ data, isLoading, error }`

- [ ] **Step 1: Write the API fetcher**

```typescript
// apps/web/src/features/seek/api/discovery.api.ts
import { nearbyDiscoveriesResponseSchema, type NearbyDiscoveriesResponse } from "@app/contracts";
import { http } from "../../../shared/api/http.js";

export async function fetchNearbyDiscoveries(params: {
  lat: number;
  lng: number;
  radius: number;
  item?: string;
}): Promise<NearbyDiscoveriesResponse> {
  const url = new URL("/api/discoveries/nearby", window.location.origin);
  url.searchParams.set("lat", params.lat.toString());
  url.searchParams.set("lng", params.lng.toString());
  url.searchParams.set("radius", params.radius.toString());
  if (params.item) url.searchParams.set("item", params.item);

  return http(url.toString(), nearbyDiscoveriesResponseSchema);
}
```

- [ ] **Step 2: Write TanStack Query hooks**

```typescript
// apps/web/src/features/seek/api/discovery.queries.ts
import { useQuery } from "@tanstack/react-query";
import { fetchNearbyDiscoveries } from "./discovery.api.js";

const keys = {
  nearby: (lat: number, lng: number, radius: number, item?: string) =>
    ["discoveries", "nearby", lat, lng, radius, item] as const,
};

export function useNearbyDiscoveries(
  params: { lat: number; lng: number; radius: number; item?: string } | null
) {
  return useQuery({
    queryKey: params ? keys.nearby(params.lat, params.lng, params.radius, params.item) : ["discoveries", "disabled"],
    queryFn: () => fetchNearbyDiscoveries(params!),
    enabled: params !== null,
    staleTime: 30_000, // 30s — discoveries don't change every second
    gcTime: 5 * 60_000,
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/seek/api/
git commit -m "feat(web): discovery API fetcher + useNearbyDiscoveries query hook"
```

---

### Task 4: MapView component (lazy-loadable, AT-041, AT-118)

**Files:**
- Create: `apps/web/src/features/map/ui/MapView.tsx`
- Create: `apps/web/src/features/map/ui/MapShell.tsx`

**Interfaces:**
- Consumes: `react-map-gl/maplibre`, `DiscoveryResponse[]` from contracts
- Produces: `<MapShell>` (lazy import wrapper) + `<MapView>` (the actual map)

- [ ] **Step 1: Install react-map-gl (maplibre entrypoint)**

```bash
pnpm --filter @app/web add react-map-gl maplibre-gl
```

- [ ] **Step 2: Write MapView.tsx**

```tsx
// apps/web/src/features/map/ui/MapView.tsx
import Map, { type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { DiscoveryResponse } from "@app/contracts";
import { DiscoveryMarkerLayer } from "./DiscoveryMarkerLayer.js";
import { DiscoveryPopup } from "./DiscoveryPopup.js";
import { useRef } from "react";
import { useAppStore } from "../../../app/store/index.js";

const MAP_STYLE = `https://api.maptiler.com/maps/streets-v2/style.json?key=${import.meta.env.VITE_MAP_KEY}`;

interface MapViewProps {
  center: { lat: number; lng: number };
  discoveries: DiscoveryResponse[];
}

export function MapView({ center, discoveries }: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const selectedId = useAppStore((s) => s.selectedDiscoveryId);
  const selectedDiscovery = discoveries.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: center.lng, latitude: center.lat, zoom: 14 }}
        mapStyle={MAP_STYLE}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
      >
        <DiscoveryMarkerLayer discoveries={discoveries} />
      </Map>
      {selectedDiscovery && (
        <DiscoveryPopup discovery={selectedDiscovery} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write DiscoveryMarkerLayer.tsx (GL layer, not DOM markers)**

```tsx
// apps/web/src/features/map/ui/DiscoveryMarkerLayer.tsx
import { useEffect, useRef } from "react";
import { useMap } from "react-map-gl/maplibre";
import type { DiscoveryResponse } from "@app/contracts";
import { useAppStore } from "../../../app/store/index.js";

interface Props {
  discoveries: DiscoveryResponse[];
}

// Freshness color based on age
function freshnessColor(ageMinutes: number): string {
  if (ageMinutes < 120) return "#1a5c3a";   // < 2h: fresh green
  if (ageMinutes < 720) return "#b45309";   // 2-12h: aging amber
  return "#9ca3af";                          // > 12h: stale gray
}

export function DiscoveryMarkerLayer({ discoveries }: Props) {
  const { current: map } = useMap();
  const setSelected = useAppStore((s) => s.selectDiscovery);

  useEffect(() => {
    if (!map) return;

    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: discoveries.map((s) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [s.lng, s.lat] },
        properties: { id: s.id, productName: s.productName, priceBrl: s.priceBrl, ageMinutes: s.ageMinutes },
      })),
    };

    if (map.getSource("discoveries")) {
      (map.getSource("discoveries") as any).setData(geojson);
    } else {
      map.addSource("discoveries", { type: "geojson", data: geojson, cluster: true, clusterMaxZoom: 14, clusterRadius: 40 });

      map.addLayer({
        id: "discoveries-clusters",
        type: "circle",
        source: "discoveries",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#1a5c3a",
          "circle-radius": ["step", ["get", "point_count"], 16, 5, 22, 20, 28],
          "circle-opacity": 0.9,
        },
      });

      map.addLayer({
        id: "discoveries-points",
        type: "circle",
        source: "discoveries",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 10,
          "circle-color": "#1a5c3a",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.9,
        },
      });

      map.on("click", "discoveries-points", (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (id) setSelected(id);
      });
    }

    return () => {
      if (map.getLayer("discoveries-points")) map.removeLayer("discoveries-points");
      if (map.getLayer("discoveries-clusters")) map.removeLayer("discoveries-clusters");
      if (map.getSource("discoveries")) map.removeSource("discoveries");
    };
  }, [map, discoveries, setSelected]);

  return null;
}
```

- [ ] **Step 4: Write DiscoveryPopup.tsx (bottom sheet)**

```tsx
// apps/web/src/features/map/ui/DiscoveryPopup.tsx
import type { DiscoveryResponse } from "@app/contracts";
import { useAppStore } from "../../../app/store/index.js";

interface Props {
  discovery: DiscoveryResponse;
}

function freshnessLabel(ageMinutes: number): string {
  if (ageMinutes < 60) return `${ageMinutes}min atrás`;
  if (ageMinutes < 1440) return `${Math.floor(ageMinutes / 60)}h atrás`;
  return `${Math.floor(ageMinutes / 1440)}d atrás`;
}

export function DiscoveryPopup({ discovery }: Props) {
  const clearSelected = useAppStore((s) => s.clearSelectedDiscovery);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${discovery.lat},${discovery.lng}`;

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-2xl shadow-xl p-4 pb-8 z-10 animate-slide-up">
      <button
        onClick={clearSelected}
        className="absolute top-3 right-4 text-text-muted text-2xl leading-none"
        aria-label="Fechar"
      >
        ×
      </button>

      <h2 className="text-lg font-semibold text-text mb-1">{discovery.productName}</h2>
      <p className="text-text-muted text-sm mb-3">{discovery.placeName}</p>

      <div className="flex gap-3 mb-4">
        <span className="bg-surface-alt text-text font-bold px-3 py-1 rounded-full text-sm">
          R$ {discovery.priceBrl.toFixed(2).replace(".", ",")}
        </span>
        <span className="bg-surface-alt text-text-muted px-3 py-1 rounded-full text-sm">
          {discovery.quantity} unid.
        </span>
        <span className="text-text-muted text-sm px-3 py-1">
          {freshnessLabel(discovery.ageMinutes)}
        </span>
      </div>

      {discovery.distanceMeters < 1000 ? (
        <p className="text-fresh text-sm mb-3">{discovery.distanceMeters}m de você</p>
      ) : (
        <p className="text-text-muted text-sm mb-3">{(discovery.distanceMeters / 1000).toFixed(1)}km de você</p>
      )}

      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full text-center bg-brand text-white font-semibold py-3 rounded-xl"
      >
        Ver no mapa
      </a>
    </div>
  );
}
```

- [ ] **Step 5: Write MapShell.tsx (lazy wrapper — key for AT-118)**

```tsx
// apps/web/src/features/map/ui/MapShell.tsx
import { lazy, Suspense } from "react";
import type { DiscoveryResponse } from "@app/contracts";

// MapView is heavy (MapLibre GL); load it lazily so it never blocks first paint
const MapView = lazy(() => import("./MapView.js").then((m) => ({ default: m.MapView })));

interface Props {
  center: { lat: number; lng: number };
  discoveries: DiscoveryResponse[];
}

export function MapShell({ center, discoveries }: Props) {
  return (
    <Suspense
      fallback={
        <div className="w-full h-full bg-surface-alt flex items-center justify-center">
          <span className="text-text-muted text-sm">Carregando mapa…</span>
        </div>
      }
    >
      <MapView center={center} discoveries={discoveries} />
    </Suspense>
  );
}
```

- [ ] **Step 6: Update map slice to add selectedDiscoveryId**

```typescript
// apps/web/src/features/map/model/map.slice.ts
import type { SliceCreator } from "../../../app/store/types.js";

export interface MapSlice {
  selectedDiscoveryId: string | null;
  mapRadius: number;
  selectDiscovery: (id: string) => void;
  clearSelectedDiscovery: () => void;
  setRadius: (r: number) => void;
}

export const createMapSlice: SliceCreator<MapSlice> = (set) => ({
  selectedDiscoveryId: null,
  mapRadius: 5_000,
  selectDiscovery: (id) => set({ selectedDiscoveryId: id }),
  clearSelectedDiscovery: () => set({ selectedDiscoveryId: null }),
  setRadius: (mapRadius) => set({ mapRadius }),
});
```

- [ ] **Step 7: Build web to verify**

```bash
pnpm --filter @app/web build
```

Expected: build succeeds; `dist/assets/` directory created; check that `maplibre-gl` is NOT in the main chunk (it should be in a separate lazy chunk).

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/features/map/
git commit -m "feat(web): MapView lazy-loaded + DiscoveryMarkerLayer (GL) + DiscoveryPopup bottom sheet (AT-041, AT-043, AT-118)"
```

---

### Task 5: SearchBar component

**Files:**
- Create: `apps/web/src/features/seek/ui/SearchBar.tsx`

**Interfaces:**
- Produces: `<SearchBar onSearch(query) />` with 300ms debounce; accessible

- [ ] **Step 1: Install debounce helper**

```bash
pnpm --filter @app/web add use-debounce
```

- [ ] **Step 2: Write SearchBar**

```tsx
// apps/web/src/features/seek/ui/SearchBar.tsx
import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";

interface Props {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export function SearchBar({ onSearch, placeholder = "Buscar produto…" }: Props) {
  const [value, setValue] = useState("");
  const [debouncedValue] = useDebounce(value, 300);

  useEffect(() => {
    onSearch(debouncedValue.trim());
  }, [debouncedValue, onSearch]);

  return (
    <div className="flex items-center gap-2 bg-surface rounded-full shadow px-4 py-3 border border-border">
      <svg className="w-5 h-5 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-text placeholder:text-text-muted outline-none text-base"
        autoComplete="off"
        aria-label={placeholder}
      />
      {value && (
        <button
          onClick={() => setValue("")}
          className="text-text-muted text-xl leading-none"
          aria-label="Limpar busca"
        >
          ×
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/seek/ui/SearchBar.tsx
git commit -m "feat(web): SearchBar with 300ms debounce"
```

---

### Task 6: EmptyState component

**Files:**
- Create: `apps/web/src/features/seek/ui/EmptyState.tsx`

- [ ] **Step 1: Write EmptyState**

```tsx
// apps/web/src/features/seek/ui/EmptyState.tsx
interface Props {
  query?: string;
  onReport?: () => void;
}

export function EmptyState({ query, onReport }: Props) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="text-5xl mb-4">🗺️</div>
      <p className="text-text font-semibold text-base mb-1">
        {query
          ? `Ninguém relatou "${query}" por aqui ainda`
          : "Ninguém relatou nada por aqui ainda"}
      </p>
      <p className="text-text-muted text-sm mb-6">Seja o primeiro a ajudar sua comunidade!</p>
      {onReport && (
        <button
          onClick={onReport}
          className="bg-brand text-white font-semibold px-6 py-3 rounded-full"
        >
          Relatar agora
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/seek/ui/EmptyState.tsx
git commit -m "feat(web): EmptyState component with report CTA"
```

---

### Task 7: SeekPage — main page composition (AT-053)

**Files:**
- Create: `apps/web/src/features/seek/ui/SeekPage.tsx`
- Modify: `apps/web/src/main.tsx` or routing setup — render SeekPage at `/`

- [ ] **Step 1: Write SeekPage**

```tsx
// apps/web/src/features/seek/ui/SeekPage.tsx
import { useState, useCallback } from "react";
import { MapShell } from "../../map/ui/MapShell.js";
import { SearchBar } from "./SearchBar.js";
import { EmptyState } from "./EmptyState.js";
import { useGeolocation, DEFAULT_COORDS } from "../../map/model/use-geolocation.js";
import { useNearbyDiscoveries } from "../api/discovery.queries.js";
import { useAppStore } from "../../../app/store/index.js";

export function SeekPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { coords, denied } = useGeolocation();
  const radius = useAppStore((s) => s.mapRadius);

  const center = coords ?? DEFAULT_COORDS;

  const { data, isLoading } = useNearbyDiscoveries({
    lat: center.lat,
    lng: center.lng,
    radius,
    item: searchQuery || undefined,
  });

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
  }, []);

  const discoveries = data?.results ?? [];

  return (
    <div className="relative w-full h-screen bg-surface overflow-hidden">
      {/* Full-screen map — underneath everything */}
      <div className="absolute inset-0">
        <MapShell center={center} discoveries={discoveries} />
      </div>

      {/* Search bar — floats on top of the map */}
      <div className="absolute top-4 left-4 right-4 z-10">
        {denied && (
          <p className="text-xs text-aging bg-surface/90 rounded-lg px-3 py-1.5 mb-2">
            Localização negada — mostrando São Paulo. Pan para sua área.
          </p>
        )}
        <SearchBar onSearch={handleSearch} />
      </div>

      {/* Empty state — shown when search has results=0 and not loading */}
      {!isLoading && discoveries.length === 0 && (
        <div className="absolute bottom-20 left-0 right-0 z-10">
          <EmptyState query={searchQuery || undefined} />
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-surface/90 rounded-full px-4 py-2 z-10 shadow">
          <span className="text-text-muted text-sm">Buscando…</span>
        </div>
      )}

      {/* FAB — report discovery (links to contribute flow in Plan E) */}
      <button
        className="absolute bottom-6 right-4 z-10 bg-brand text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl"
        aria-label="Relatar produto"
        onClick={() => {/* navigate to /report — wired in Plan E */}}
      >
        +
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Register as index route**

If the app already has a router file, register SeekPage at `/`. Otherwise add basic routing to `apps/web/src/main.tsx`:

```tsx
// apps/web/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./app/query-client.js";
import { SeekPage } from "./features/seek/ui/SeekPage.js";
import "./app/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SeekPage />
    </QueryClientProvider>
  </React.StrictMode>,
);
```

- [ ] **Step 3: Run dev server and verify**

```bash
pnpm --filter @app/web dev
```

Expected: map renders at `http://localhost:5173`; search bar visible; querying "arroz" shows discovery markers (from seed data).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/seek/ apps/web/src/main.tsx
git commit -m "feat(web): SeekPage — map-first seek UI with search + markers + empty state (AT-053)"
```

---

### Task 8: PWA manifest + real icons (AT-056, AT-057)

**Files:**
- Modify: `apps/web/public/manifest.webmanifest`
- Create: `apps/web/public/icons/192.png`, `512.png`, `512-maskable.png`
- Modify: `apps/web/vite.config.ts` — update PWA plugin manifest

- [ ] **Step 1: Update vite.config.ts PWA manifest**

```typescript
// apps/web/vite.config.ts (update the VitePWA section)
VitePWA({
  registerType: "autoUpdate",
  manifest: {
    name: "Aonde Tem",
    short_name: "Aonde Tem",
    description: "Descubra onde encontrar produtos perto de você",
    lang: "pt-BR",
    start_url: "/",
    display: "standalone",
    theme_color: "#1a5c3a",
    background_color: "#ffffff",
    icons: [
      { src: "/icons/192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  },
  workbox: {
    runtimeCaching: [
      {
        urlPattern: ({ url }) => url.pathname.startsWith("/api"),
        handler: "NetworkFirst",
        options: { cacheName: "api-cache", networkTimeoutSeconds: 5 },
      },
      {
        urlPattern: ({ url }) => url.hostname.includes("maptiler.com"),
        handler: "CacheFirst",
        options: { cacheName: "map-tiles", expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 } },
      },
    ],
  },
}),
```

- [ ] **Step 2: Create placeholder icons (for dev; replace with real icons before launch)**

```bash
# Create a simple colored PNG using canvas — or use any 192x192/512x512 PNG
# For development, copy a placeholder:
mkdir -p apps/web/public/icons
# Add real brand icon PNGs here (192x192, 512x512, 512x512 maskable)
# Icon should show "AT" on brand-green background (#1a5c3a)
```

> **Note:** Get real icons from your designer or generate with https://maskable.app. The icon must work on both Android (maskable, with safe zone) and iOS (square).

- [ ] **Step 3: Commit**

```bash
git add apps/web/vite.config.ts apps/web/public/
git commit -m "chore(web): PWA manifest + icon setup (AT-056, AT-057)"
```

---

## Self-Review Checklist

- [x] **AT-040** — `VITE_MAP_KEY` env var documented; MapTiler URL used
- [x] **AT-041** — `MapView` renders MapLibre via `react-map-gl/maplibre`
- [x] **AT-042** — `useGeolocation` handles permission denial, loading, accuracy
- [x] **AT-043** — `DiscoveryMarkerLayer` renders markers from API data using GL layer (not DOM)
- [x] **AT-053** — `SeekPage` composes search + map + empty state
- [x] **AT-055** — `DiscoveryPopup` shows product/price/freshness/distance + maps handoff
- [x] **AT-056/057** — PWA manifest updated; icon paths documented
- [x] **AT-118** — MapLibre is lazy-loaded via `React.lazy`; not in initial bundle
- [x] Debounce 300ms on search; staleTime 30s on query
- [x] Map tiles cached in service worker (maptiler.com cache-first rule)
- [x] Bottom-sheet popup, large FAB tap target (56px), one-handed friendly

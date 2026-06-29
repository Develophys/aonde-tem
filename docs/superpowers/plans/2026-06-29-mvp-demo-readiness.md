# MVP Demo-Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the six remaining gaps between the working codebase (Plans A–G) and a demo-ready MVP: seed data so the map isn't empty, a user-position pin, place reuse suggestions, a health endpoint, a recenter button, and a radius slider.

**Architecture:** All six tasks are additive — no existing code is deleted. Backend tasks follow the NestJS module pattern already established in `apps/api`; frontend tasks follow the feature-sliced `features/<feature>/{ui,model,api}` pattern and use only existing Tailwind v4 `@theme` tokens.

**Tech Stack:** TypeScript · NestJS (API) · React + Vite + Tailwind v4 (web) · Prisma + PostGIS · Zustand · TanStack Query · react-map-gl/maplibre · pnpm workspaces · Supertest (integration tests)

## Global Constraints

- Package names: `@aonde-tem/web`, `@aonde-tem/api`, `@aonde-tem/contracts`, `@aonde-tem/domain`
- All API routes served under `/api` prefix (NestJS `app.setGlobalPrefix("api")` in `apps/api/src/main.ts`)
- Tailwind v4 CSS-first tokens live in `apps/web/src/app/index.css`; never hardcode color/spacing values — use defined tokens (`bg-surface`, `text-text`, `border-border`, `text-brand`, `text-fresh`, etc.)
- Brazilian Portuguese UI copy only
- Geography (PostGIS) columns cannot be handled by Prisma ORM — always use `prisma.$executeRaw` / `prisma.$queryRaw` for columns typed `Unsupported("geography(Point, 4326)")`
- MapLibre via `react-map-gl/maplibre`; import CSS: `import "maplibre-gl/dist/maplibre-gl.css"`
- Zustand: server data never stored in Zustand; TanStack Query owns all server state
- Integration tests use `AllExceptionsFilter` from `apps/api/src/shared/errors/all-exceptions.filter.js`, `app.setGlobalPrefix("api")`, and `import request from "supertest"` (default import — Node16 ESM)
- `jest.config.cjs` in `apps/api` maps `@aonde-tem/contracts` and `@aonde-tem/domain` to their TypeScript sources; new test files automatically pick this up
- Seed config already wired: root `package.json` has `"prisma": { "seed": "tsx prisma/seed.ts" }` — only the file body is missing
- Existing Zustand store has `mapRadius: number` (default 5 000 m) and `setRadius(r: number)` in `apps/web/src/features/map/model/map.slice.ts`; do not re-add these
- `GET /api/places/nearby?lat=&lng=&radius=` already implemented and returns `PlaceResponse[]` — reuse it for place-reuse suggestions

---

## File map (created or modified per task)

| Task | Files |
|---|---|
| 1 — Seed | Create `prisma/seed.ts` · Modify `package.json` (add `db:seed` script) |
| 2 — User pin | Modify `apps/web/src/features/map/ui/MapShell.tsx` · Modify `apps/web/src/features/map/ui/MapView.tsx` · Modify `apps/web/src/features/seek/ui/SeekPage.tsx` |
| 3 — Place reuse | Create `apps/web/src/features/report/api/places.api.ts` · Modify `apps/web/src/features/report/ui/PlacePicker.tsx` |
| 4 — Health endpoint | Create `apps/api/src/shared/health/health.controller.ts` · Create `apps/api/src/shared/health/health.module.ts` · Create `apps/api/src/shared/health/health.controller.spec.ts` · Modify `apps/api/src/app.module.ts` |
| 5 — Recenter button | Modify `apps/web/src/features/map/ui/MapView.tsx` (builds on Task 2 changes) |
| 6 — Radius slider | Modify `apps/web/src/features/seek/ui/SeekPage.tsx` (builds on Task 2 changes) |

---

### Task 1: Seed script — São Paulo demo data (AT-017)

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` (root) — add `"db:seed"` convenience script

**Interfaces:**
- Consumes: `@prisma/client` (root devDependency), `tsx` (root devDependency — both already present)
- Produces: 1 seed user + 5 products + 3 places + 10 discoveries in the São Paulo area

**Context:** The root `package.json` already contains `"prisma": { "seed": "tsx prisma/seed.ts" }`. Running `prisma db seed` from the root will execute this file. The file doesn't exist yet — create it. PostGIS `geography(Point, 4326)` columns must use `$executeRaw`; Prisma upsert handles plain columns.

- [ ] **Step 1: Create `prisma/seed.ts`**

```ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Fixed UUIDs so the seed is idempotent (re-running inserts nothing twice).
const SEED_USER_ID = "00000000-0000-0000-0000-000000000001";

const PRODUCTS = [
  { id: "00000000-0000-0000-0001-000000000001", name: "Arroz Tio João 5kg",  normalizedKey: "arroz tio joao 5kg" },
  { id: "00000000-0000-0000-0001-000000000002", name: "Feijão Carioca 1kg",  normalizedKey: "feijao carioca 1kg" },
  { id: "00000000-0000-0000-0001-000000000003", name: "Óleo de Soja 900ml",  normalizedKey: "oleo de soja 900ml" },
  { id: "00000000-0000-0000-0001-000000000004", name: "Leite Integral 1L",   normalizedKey: "leite integral 1l" },
  { id: "00000000-0000-0000-0001-000000000005", name: "Café Pilão 500g",     normalizedKey: "cafe pilao 500g" },
] as const;

// São Paulo: near Av. Paulista / Pinheiros / Vila Madalena
const PLACES = [
  { id: "00000000-0000-0000-0002-000000000001", name: "Supermercado Extra Paulista",     lat: -23.5630, lng: -46.6510 },
  { id: "00000000-0000-0000-0002-000000000002", name: "Carrefour Pinheiros",              lat: -23.5663, lng: -46.6943 },
  { id: "00000000-0000-0000-0002-000000000003", name: "Pão de Açúcar Vila Madalena",     lat: -23.5582, lng: -46.6896 },
] as const;

// [productIndex, placeIndex, priceBrl, quantity]
const DISCOVERIES: [number, number, number, number][] = [
  [0, 0, 26.90,  8],
  [0, 1, 24.50, 15],
  [0, 2, 27.80,  3],
  [1, 0,  8.99, 20],
  [1, 1,  7.49,  5],
  [2, 0,  6.89, 10],
  [3, 0,  4.99, 30],
  [3, 2,  5.29, 12],
  [4, 0, 19.90,  6],
  [4, 1, 18.50,  9],
];

async function main() {
  console.log("Seeding database…");

  // User (upsert — safe to re-run)
  await prisma.user.upsert({
    where: { id: SEED_USER_ID },
    create: {
      id: SEED_USER_ID,
      email: "seed@aonde-tem.dev",
      displayName: "Seed Bot",
      role: "user",
    },
    update: {},
  });

  // Products (upsert by id)
  for (const p of PRODUCTS) {
    await prisma.product.upsert({
      where: { id: p.id },
      create: { id: p.id, name: p.name, normalizedKey: p.normalizedKey, createdById: SEED_USER_ID },
      update: {},
    });
  }

  // Places — PostGIS geography column requires $executeRaw
  for (const pl of PLACES) {
    await prisma.$executeRaw`
      INSERT INTO places (id, name, location, "createdById")
      VALUES (
        ${pl.id},
        ${pl.name},
        ST_MakePoint(${pl.lng}, ${pl.lat})::geography,
        ${SEED_USER_ID}
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }

  // Discoveries — 24 h TTL from now
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  for (let i = 0; i < DISCOVERIES.length; i++) {
    const [pIdx, plIdx, price, quantity] = DISCOVERIES[i];
    const id = `00000000-0000-0000-0003-${String(i + 1).padStart(12, "0")}`;
    const product = PRODUCTS[pIdx];
    const place = PLACES[plIdx];

    await prisma.$executeRaw`
      INSERT INTO discoveries (id, "productId", "placeId", price, quantity, "reporterId", location, "expiresAt")
      VALUES (
        ${id},
        ${product.id},
        ${place.id},
        ${price},
        ${quantity},
        ${SEED_USER_ID},
        ST_MakePoint(${place.lng}, ${place.lat})::geography,
        ${expiresAt}
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }

  console.log(
    `Done: 1 user · ${PRODUCTS.length} products · ${PLACES.length} places · ${DISCOVERIES.length} discoveries`,
  );
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Add `db:seed` convenience script to root `package.json`**

Open `package.json` at the repo root. In the `"scripts"` block, after `"db:generate"`, add:

```json
"db:seed": "prisma db seed",
```

The `"scripts"` block should look like:

```json
"scripts": {
  "dev": "turbo run dev",
  "build": "turbo run build",
  "lint": "turbo run lint",
  "test": "turbo run test",
  "typecheck": "turbo run typecheck",
  "db:migrate": "pnpm --filter @aonde-tem/api prisma migrate dev",
  "db:generate": "pnpm --filter @aonde-tem/api prisma generate",
  "db:seed": "prisma db seed",
  "docker:up": "docker compose up --build",
  "lint:all": "eslint .",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "prepare": "husky"
},
```

- [ ] **Step 3: Start Docker DB and run the seed**

```bash
# Docker DB must be running (starts PostGIS on port 5432)
docker compose up -d db

# Apply migrations first (the seed needs the schema)
pnpm db:migrate

# Run the seed
pnpm db:seed
```

Expected output:
```
Seeding database…
Done: 1 user · 5 products · 3 places · 10 discoveries
```

- [ ] **Step 4: Verify data in the DB**

```bash
pnpm --filter @aonde-tem/api exec prisma studio
# OR a quick psql count check:
docker compose exec db psql -U aonde -d aonde -c "SELECT COUNT(*) FROM discoveries;"
```

Expected: `count = 10` (or higher if run previously — ON CONFLICT DO NOTHING makes it idempotent).

- [ ] **Step 5: Start the app and verify markers appear**

```bash
pnpm dev
```

Open http://localhost:5173. The map should default to São Paulo. Three supermarkets should appear as green markers (Arroz, Feijão, Óleo, Leite, Café discoveries at Paulista / Pinheiros / Vila Madalena). Tapping a marker should open `DiscoveryPopup` with price, quantity, freshness.

- [ ] **Step 6: Commit**

```bash
git add prisma/seed.ts package.json
git commit -m "chore(db): add São Paulo seed data (AT-017)"
```

---

### Task 2: User location pin on map (AT-041 partial)

**Files:**
- Modify: `apps/web/src/features/map/ui/MapShell.tsx`
- Modify: `apps/web/src/features/map/ui/MapView.tsx`
- Modify: `apps/web/src/features/seek/ui/SeekPage.tsx`

**Interfaces:**
- Consumes: `coords` from `useGeolocation()` in SeekPage (already available)
- Produces: `userPin?: { lat: number; lng: number }` prop flows SeekPage → MapShell → MapView; MapView renders a blue circle `<Marker>` when `userPin` is set

**Context:** `MapShell.tsx` wraps `MapView` with a `Suspense` boundary. `MapView.tsx` already imports `Map` and `Marker` from `react-map-gl/maplibre` and has a `mapRef`. `SeekPage.tsx` already has `coords` and falls back to `DEFAULT_COORDS`. The user pin must be visually distinct from discovery markers (which are brand-green); use an inline-style blue dot so it doesn't depend on any Tailwind color token that may not exist.

- [ ] **Step 1: Update `MapShell.tsx` to accept and forward `userPin`**

Replace the entire contents of `apps/web/src/features/map/ui/MapShell.tsx` with:

```tsx
import { lazy, Suspense } from "react";
import type { DiscoveryResponse } from "@aonde-tem/contracts";

// MapView is heavy (MapLibre GL); load it lazily so it never blocks first paint
const MapView = lazy(() => import("./MapView.js").then((m) => ({ default: m.MapView })));

interface Props {
  center: { lat: number; lng: number };
  userPin?: { lat: number; lng: number };
  discoveries: DiscoveryResponse[];
}

export function MapShell({ center, userPin, discoveries }: Props) {
  return (
    <Suspense
      fallback={
        <div className="w-full h-full bg-surface-alt flex items-center justify-center">
          <span className="text-text-muted text-sm">Carregando mapa…</span>
        </div>
      }
    >
      <MapView center={center} userPin={userPin} discoveries={discoveries} />
    </Suspense>
  );
}
```

- [ ] **Step 2: Update `MapView.tsx` to render the user-position pin**

Replace the entire contents of `apps/web/src/features/map/ui/MapView.tsx` with:

```tsx
import Map, { Marker, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { DiscoveryResponse } from "@aonde-tem/contracts";
import { DiscoveryMarkerLayer } from "./DiscoveryMarkerLayer.js";
import { DiscoveryPopup } from "./DiscoveryPopup.js";
import { useRef } from "react";
import { useAppStore } from "../../../app/store/index.js";

// Use VITE_MAP_KEY for MapTiler if set; fall back to OpenFreeMap (no key required)
const MAP_STYLE =
  import.meta.env.VITE_MAP_KEY && import.meta.env.VITE_MAP_KEY !== "demo"
    ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${import.meta.env.VITE_MAP_KEY}`
    : "https://tiles.openfreemap.org/styles/bright";

interface MapViewProps {
  center: { lat: number; lng: number };
  userPin?: { lat: number; lng: number };
  discoveries: DiscoveryResponse[];
}

export function MapView({ center, userPin, discoveries }: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const selectedId = useAppStore((s) => s.selectedDiscoveryId);
  const selectedDiscovery = discoveries.find((d) => d.id === selectedId) ?? null;

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

        {userPin && (
          <Marker longitude={userPin.lng} latitude={userPin.lat} anchor="center">
            {/* Blue "you are here" dot — intentionally NOT a discovery marker */}
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                backgroundColor: "#2563eb",
                border: "2px solid white",
                boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
              }}
              aria-label="Sua localização"
            />
          </Marker>
        )}
      </Map>

      {selectedDiscovery && <DiscoveryPopup discovery={selectedDiscovery} />}
    </div>
  );
}
```

- [ ] **Step 3: Pass `coords` as `userPin` in `SeekPage.tsx`**

In `apps/web/src/features/seek/ui/SeekPage.tsx`, find the `<MapShell>` JSX and add the `userPin` prop:

```tsx
{/* Full-screen map — underneath everything */}
<div className="absolute inset-0">
  <MapShell center={center} userPin={coords ?? undefined} discoveries={discoveries} />
</div>
```

The existing line is `<MapShell center={center} discoveries={discoveries} />` — add `userPin={coords ?? undefined}` to it. `coords` is already destructured from `useGeolocation()` in that component.

- [ ] **Step 4: Run typecheck and verify**

```bash
pnpm typecheck
```

Expected: no new TypeScript errors.

Open http://localhost:5173. Allow location in the browser. A small blue dot should appear at your GPS position, surrounded by the brand-green discovery markers from the seed.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/map/ui/MapShell.tsx \
        apps/web/src/features/map/ui/MapView.tsx \
        apps/web/src/features/seek/ui/SeekPage.tsx
git commit -m "feat(map): show user location pin on map (AT-041)"
```

---

### Task 3: Place reuse suggestions in report flow (AT-134)

**Files:**
- Create: `apps/web/src/features/report/api/places.api.ts`
- Modify: `apps/web/src/features/report/ui/PlacePicker.tsx`

**Interfaces:**
- Consumes: `GET /api/places/nearby?lat=&lng=&radius=300` → `PlaceResponse[]` (the endpoint already exists in `apps/api/src/modules/place/presentation/place.controller.ts`)
- `PlaceResponse` from `@aonde-tem/contracts`: `{ id, name, category?, address?, coords: { lat, lng } }`
- Consumes: `coords` from `useGeolocation()` inside `PlacePicker` (already imported)
- Produces: `useNearbyPlaces(lat, lng)` TanStack Query hook; augmented `PlacePicker` shows ≤ 3 nearby places to reuse

**Context:** `PlacePicker.tsx` currently lets users type a place name and optionally use GPS. It has no awareness of existing `Place` rows in the DB. AT-134 requires: before creating a new place, suggest nearby existing ones. When GPS coords are available, query nearby places and offer them as quick-pick buttons. If user taps one, `placeId` is set so `POST /discoveries` reuses the existing place row. The suggestion radius is 300 m — tight enough to be clearly the same shop.

- [ ] **Step 1: Create `apps/web/src/features/report/api/places.api.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import type { PlaceResponse } from "@aonde-tem/contracts";

export function useNearbyPlaces(lat: number | undefined, lng: number | undefined) {
  return useQuery<PlaceResponse[]>({
    queryKey: ["places", "nearby", lat, lng],
    queryFn: async () => {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL ?? ""}/api/places/nearby?lat=${lat}&lng=${lng}&radius=300`,
      );
      if (!res.ok) return [];
      return res.json() as Promise<PlaceResponse[]>;
    },
    enabled: lat !== undefined && lng !== undefined,
    staleTime: 60_000,
  });
}
```

- [ ] **Step 2: Replace `apps/web/src/features/report/ui/PlacePicker.tsx`**

```tsx
import { useState } from "react";
import { useGeolocation } from "../../map/model/use-geolocation.js";
import { useNearbyPlaces } from "../api/places.api.js";

interface PlaceSelection {
  lat: number;
  lng: number;
  name: string;
  placeId?: string;
}

interface Props {
  value: PlaceSelection | null;
  onChange: (place: PlaceSelection) => void;
}

export function PlacePicker({ value, onChange }: Props) {
  const { coords } = useGeolocation();
  const [placeName, setPlaceName] = useState(value?.name ?? "");
  const { data: nearbyPlaces } = useNearbyPlaces(coords?.lat, coords?.lng);

  function useCurrentLocation() {
    if (!coords) return;
    onChange({ lat: coords.lat, lng: coords.lng, name: placeName || "Localização atual" });
  }

  function selectNearbyPlace(place: { id: string; name: string; coords: { lat: number; lng: number } }) {
    setPlaceName(place.name);
    onChange({ lat: place.coords.lat, lng: place.coords.lng, name: place.name, placeId: place.id });
  }

  return (
    <div>
      <label className="block text-sm font-medium text-text mb-1">Local</label>

      {nearbyPlaces && nearbyPlaces.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-text-muted mb-1.5">Locais próximos — selecione ou informe novo:</p>
          <div className="flex flex-col gap-1.5">
            {nearbyPlaces.slice(0, 3).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectNearbyPlace(p)}
                className={`text-left px-3 py-2.5 rounded-xl border text-sm min-h-11 ${
                  value?.placeId === p.id
                    ? "border-brand bg-brand/10 text-brand font-medium"
                    : "border-border text-text"
                }`}
              >
                {p.name}
                {p.address && (
                  <span className="block text-xs text-text-muted mt-0.5">{p.address}</span>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-text-muted mt-2.5 mb-1">Ou informe outro local:</p>
        </div>
      )}

      <input
        type="text"
        value={placeName}
        onChange={(e) => {
          const name = e.target.value;
          setPlaceName(name);
          const base = value ?? { lat: 0, lng: 0 };
          onChange({ ...base, name, placeId: undefined });
        }}
        placeholder="Nome do mercado / estabelecimento"
        className="w-full border border-border rounded-xl px-4 py-3 text-text text-base outline-none focus:ring-2 focus:ring-brand mb-2"
      />

      <button
        type="button"
        onClick={useCurrentLocation}
        disabled={!coords}
        className="flex items-center gap-2 text-brand text-sm font-medium disabled:text-text-muted min-h-[44px] py-3"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        </svg>
        {coords ? "Usar minha localização atual" : "Aguardando localização…"}
      </button>

      {value && (
        <p className="text-xs text-fresh mt-1">
          ✓ {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Manually verify in the browser**

With the app and seed running (`pnpm dev`):
1. Log in (sign-in page works with magic code).
2. Tap the + FAB → Report page.
3. On the Place section: if GPS is granted and you're near the seed coordinates (São Paulo area), the three seeded supermarkets appear as quick-pick buttons.
4. Tap one → `✓ lat, lng` shows and the place name fills the input.
5. If no nearby places, the input works as before (no regression).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/report/api/places.api.ts \
        apps/web/src/features/report/ui/PlacePicker.tsx
git commit -m "feat(report): suggest nearby existing places before creating new (AT-134)"
```

---

### Task 4: `/api/health` endpoint (AT-030)

**Files:**
- Create: `apps/api/src/shared/health/health.controller.ts`
- Create: `apps/api/src/shared/health/health.module.ts`
- Create: `apps/api/src/shared/health/health.controller.spec.ts`
- Modify: `apps/api/src/app.module.ts` — import `HealthModule`

**Interfaces:**
- Produces: `GET /api/health` → `200 { status: "ok", timestamp: "<ISO string>" }` — no auth, no DB dependency

**Context:** Other shared infra lives in `apps/api/src/shared/` (errors, logging). The health controller follows the same NestJS module pattern as `PlaceModule`, `AuthModule`, etc. The integration test pattern matches `apps/api/src/modules/auth/auth.controller.spec.ts` already in the repo.

- [ ] **Step 1: Write the failing integration test first**

Create `apps/api/src/shared/health/health.controller.spec.ts`:

```ts
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { HealthModule } from "./health.module.js";

describe("HealthController", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [HealthModule],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
  });

  afterAll(() => app.close());

  it("GET /api/health returns 200 with status ok", async () => {
    const res = await request(app.getHttpServer()).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(typeof res.body.timestamp).toBe("string");
    // timestamp must be a valid ISO date
    expect(() => new Date(res.body.timestamp)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
pnpm --filter @aonde-tem/api test -- --testPathPattern health
```

Expected: `Cannot find module './health.module.js'` or similar — confirms the test is wired.

- [ ] **Step 3: Create `apps/api/src/shared/health/health.controller.ts`**

```ts
import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  check() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}
```

- [ ] **Step 4: Create `apps/api/src/shared/health/health.module.ts`**

```ts
import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";

@Module({ controllers: [HealthController] })
export class HealthModule {}
```

- [ ] **Step 5: Wire `HealthModule` into `apps/api/src/app.module.ts`**

Add the import at the top:

```ts
import { HealthModule } from "./shared/health/health.module.js";
```

Add `HealthModule` to the `imports` array:

```ts
imports: [
  LoggerModule.forRoot({ ... }),
  ThrottlerModule.forRoot([...]),
  HealthModule,   // ← add this line
  PlaceModule,
  DiscoveryModule,
  AuthModule,
  ProductModule,
  FlagModule,
],
```

- [ ] **Step 6: Run the test and confirm it passes**

```bash
pnpm --filter @aonde-tem/api test -- --testPathPattern health
```

Expected output:
```
PASS src/shared/health/health.controller.spec.ts
  HealthController
    ✓ GET /api/health returns 200 with status ok
```

- [ ] **Step 7: Verify manually with curl**

```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok","timestamp":"2026-06-29T..."}
```

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/shared/health/health.controller.ts \
        apps/api/src/shared/health/health.module.ts \
        apps/api/src/shared/health/health.controller.spec.ts \
        apps/api/src/app.module.ts
git commit -m "feat(api): add /health endpoint (AT-030)"
```

---

### Task 5: Recenter / follow-user button (AT-044)

**Files:**
- Modify: `apps/web/src/features/map/ui/MapView.tsx` (extends Task 2 state)

**Interfaces:**
- Consumes: `userPin` prop (added in Task 2) and `mapRef` (already in MapView)
- Produces: A floating button visible only when `userPin` is defined; clicking it calls `mapRef.current.flyTo` with the user's coordinates at zoom 15

**Context:** MapView already has `mapRef = useRef<MapRef>()`. The recenter button lives inside the `MapView` container div so it has access to both `mapRef` and `userPin`. Position it at `bottom-24 right-4` so it doesn't overlap the discovery popup (which slides up from the bottom) or the FAB in SeekPage (which is at `bottom-6 right-4` in the SeekPage layer, outside MapView's area). The button is 44 × 44 px minimum (accessibility target).

- [ ] **Step 1: Update `apps/web/src/features/map/ui/MapView.tsx`**

Replace the entire file with this version (extends Task 2 — incorporates `userPin` from Task 2 plus adds the recenter button):

```tsx
import Map, { Marker, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { DiscoveryResponse } from "@aonde-tem/contracts";
import { DiscoveryMarkerLayer } from "./DiscoveryMarkerLayer.js";
import { DiscoveryPopup } from "./DiscoveryPopup.js";
import { useRef, useCallback } from "react";
import { useAppStore } from "../../../app/store/index.js";

const MAP_STYLE =
  import.meta.env.VITE_MAP_KEY && import.meta.env.VITE_MAP_KEY !== "demo"
    ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${import.meta.env.VITE_MAP_KEY}`
    : "https://tiles.openfreemap.org/styles/bright";

interface MapViewProps {
  center: { lat: number; lng: number };
  userPin?: { lat: number; lng: number };
  discoveries: DiscoveryResponse[];
}

export function MapView({ center, userPin, discoveries }: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const selectedId = useAppStore((s) => s.selectedDiscoveryId);
  const selectedDiscovery = discoveries.find((d) => d.id === selectedId) ?? null;

  const recenter = useCallback(() => {
    if (!userPin || !mapRef.current) return;
    mapRef.current.flyTo({ center: [userPin.lng, userPin.lat], zoom: 15, duration: 800 });
  }, [userPin]);

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

        {userPin && (
          <Marker longitude={userPin.lng} latitude={userPin.lat} anchor="center">
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                backgroundColor: "#2563eb",
                border: "2px solid white",
                boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
              }}
              aria-label="Sua localização"
            />
          </Marker>
        )}
      </Map>

      {/* Recenter button — only when GPS is known */}
      {userPin && (
        <button
          type="button"
          onClick={recenter}
          aria-label="Centralizar em minha localização"
          className="absolute bottom-24 right-4 z-10 bg-surface shadow-md rounded-full w-11 h-11 flex items-center justify-center border border-border"
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

      {selectedDiscovery && <DiscoveryPopup discovery={selectedDiscovery} />}
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Verify in the browser**

1. Grant location. Blue dot appears.
2. Pan the map away from your position.
3. Tap the compass/recenter button (bottom-right, above the FAB area). Map animates back to your GPS position at zoom 15.
4. Without GPS (or denied): button is not visible. Confirm it's hidden.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/map/ui/MapView.tsx
git commit -m "feat(map): recenter button flies to user location (AT-044)"
```

---

### Task 6: Radius slider wired to query (AT-045)

**Files:**
- Modify: `apps/web/src/features/seek/ui/SeekPage.tsx`

**Interfaces:**
- Consumes: `mapRadius` (number, default 5 000) and `setRadius` action from the Zustand store — both already defined in `apps/web/src/features/map/model/map.slice.ts`; `SeekPage` already reads `mapRadius` via `useAppStore`
- `nearbyDiscoveriesQuerySchema` accepts `radius` in metres, min 100, max 50 000
- Produces: A horizontal range slider (`<input type="range">`) in the bottom-left of the seek page, floating over the map, showing the current radius in km and triggering a query refetch when changed

**Context:** `SeekPage.tsx` already passes `radius` to `useNearbyDiscoveries`. The slider just needs to write to the same Zustand slice. TanStack Query's `queryKey` includes `radius`, so changing the slider automatically triggers a refetch with the new radius. The slider is styled as a floating pill so it sits cleanly above the map.

- [ ] **Step 1: Open `apps/web/src/features/seek/ui/SeekPage.tsx` and verify the import of `setRadius`**

The file already has:
```ts
const radius = useAppStore((s) => s.mapRadius);
```

Add `setRadius` alongside it:
```ts
const radius = useAppStore((s) => s.mapRadius);
const setRadius = useAppStore((s) => s.setRadius);
```

- [ ] **Step 2: Add the radius slider JSX**

In the return statement, inside the outer `<div className="relative w-full h-screen ...">`, add the slider **before** the FAB button:

```tsx
{/* Radius slider — bottom-left, above FAB */}
<div className="absolute bottom-6 left-4 z-10 bg-surface/95 rounded-full px-4 py-2 shadow-sm border border-border flex items-center gap-2.5">
  <span className="text-xs text-text-muted">Raio</span>
  <input
    type="range"
    min={500}
    max={20_000}
    step={500}
    value={radius}
    onChange={(e) => setRadius(Number(e.target.value))}
    className="w-24"
    aria-label="Raio de busca"
  />
  <span className="text-xs text-text font-medium w-14 text-right tabular-nums">
    {radius >= 1000 ? `${(radius / 1000).toFixed(1)} km` : `${radius} m`}
  </span>
</div>
```

The complete `SeekPage.tsx` return block should look like (after Task 2 changes added `userPin`):

```tsx
return (
  <div className="relative w-full h-screen bg-surface overflow-hidden">
    {/* Full-screen map */}
    <div className="absolute inset-0">
      <MapShell center={center} userPin={coords ?? undefined} discoveries={discoveries} />
    </div>

    {/* Search bar */}
    <div className="absolute top-4 left-4 right-4 z-10">
      {denied && (
        <p className="text-xs text-aging bg-surface/90 rounded-lg px-3 py-1.5 mb-2">
          Localização negada — mostrando São Paulo. Pan para sua área.
        </p>
      )}
      <SearchBar onSearch={handleSearch} />
    </div>

    {/* Empty state */}
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

    {/* Radius slider — bottom-left */}
    <div className="absolute bottom-6 left-4 z-10 bg-surface/95 rounded-full px-4 py-2 shadow-sm border border-border flex items-center gap-2.5">
      <span className="text-xs text-text-muted">Raio</span>
      <input
        type="range"
        min={500}
        max={20_000}
        step={500}
        value={radius}
        onChange={(e) => setRadius(Number(e.target.value))}
        className="w-24"
        aria-label="Raio de busca"
      />
      <span className="text-xs text-text font-medium w-14 text-right tabular-nums">
        {radius >= 1000 ? `${(radius / 1000).toFixed(1)} km` : `${radius} m`}
      </span>
    </div>

    {/* FAB — report discovery */}
    <button
      className="absolute bottom-6 right-4 z-10 bg-brand text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl"
      aria-label="Relatar produto"
      onClick={onReport}
    >
      +
    </button>
  </div>
);
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Verify in the browser**

1. Open http://localhost:5173.
2. Bottom-left: a pill shows "Raio [slider] 5.0 km".
3. Drag slider left to 500 m — no seed markers appear (they're several km away in São Paulo unless you're physically there).
4. Drag slider right to 20.0 km — all seed markers reappear.
5. The query refetches automatically as the slider changes (no explicit submit required).

- [ ] **Step 5: Run full test suite to confirm no regressions**

```bash
pnpm test
```

Expected: all existing tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/seek/ui/SeekPage.tsx
git commit -m "feat(map): radius slider wired to nearby query (AT-045)"
```

---

## Self-Review Checklist

**Spec coverage:**

| Backlog ID | Requirement | Covered by |
|---|---|---|
| AT-017 | Seed script: sample discoveries for a test area | Task 1 |
| AT-041 | MapLibre MapView with user marker | Task 2 |
| AT-134 | Place reuse: suggest nearby existing places before creating new | Task 3 |
| AT-030 | `/health` endpoint | Task 4 |
| AT-044 | Recenter + follow-user mode | Task 5 |
| AT-045 | Radius control (slider) wired to query | Task 6 |

**No placeholders:** All steps contain complete code or exact command strings.

**Type consistency:**
- `userPin?: { lat: number; lng: number }` — same shape in `MapShell`, `MapView`, and `SeekPage`'s `coords` return from `useGeolocation`
- `PlaceResponse` from `@aonde-tem/contracts` used directly in `places.api.ts` return type
- `setRadius(r: number)` matches `MapSlice.setRadius` signature in `map.slice.ts`
- Health controller returns a plain object (not a typed DTO) — acceptable for a simple health check

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-29-mvp-demo-readiness.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — Fresh subagent per task, review between tasks, fast iteration. Use `superpowers:subagent-driven-development`.

**2. Inline Execution** — Execute tasks in this session. Use `superpowers:executing-plans`.

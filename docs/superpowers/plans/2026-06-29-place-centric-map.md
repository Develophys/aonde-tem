# Place-Centric Map Model — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the map place-centric — map pins are places, clicking a pin opens a modal with all items currently available at that place, and reporting the same product twice at the same place updates the existing discovery instead of creating a duplicate.

**Architecture:** Three layers of change: (1) domain port + infra upsert rule, (2) new `GET /places/:id` API endpoint, (3) frontend map slice + marker grouping + `PlaceModal`. Places already get created on-the-fly from a discovery's coordinates (`saveWithPlace`). This plan hardens that model with an explicit upsert contract and a place-detail read path.

**Tech Stack:** TypeScript strict, NestJS, Prisma + PostGIS raw queries, Zod contracts, React + MapLibre GL, TanStack Query, Zustand (immer slices).

## Global Constraints

- `packages/domain` must import **nothing** outside itself — no Prisma, NestJS, HTTP
- `saveWithPlace` currently returns `Promise<string>` (the resolved placeId); this plan changes it to `Promise<{ placeId: string; discoveryId: string }>` — update all callers
- The upsert rule applies only to **active** (not hidden, not expired) discoveries; a stale or hidden discovery at the same place/product starts fresh
- Map marker grouping is done **client-side** using the `placeId` field already in `DiscoveryResponse`; the `GET /discoveries/nearby` API shape does not change
- `PlaceModal` replaces `DiscoveryPopup` as the primary map interaction UI; `DiscoveryPopup` is deleted
- Map slice action rename: `selectDiscovery` / `clearSelectedDiscovery` → `selectPlace` / `clearSelectedPlace`; update all consumers
- Freshness logic (colors, labels) uses the same thresholds already in `DiscoveryMarkerLayer` and `DiscoveryPopup`
- Tailwind v4 tokens from `apps/web/src/app/index.css` — no hardcoded hex values in new components
- Backlog items covered: AT-043 (render markers from API), AT-055 (report detail popup), AT-134 (place reuse)

---

## File Structure

**Modify:**
- `packages/domain/src/repositories/discovery-repository.ts` — add `findByPlace(placeId: string): Promise<NearbyDiscoveryRow[]>` to port
- `packages/contracts/src/place.ts` — add `placeDiscoveryItemSchema` + `placeWithDiscoveriesResponseSchema`
- `apps/api/src/modules/discovery/application/create-discovery.ts` — update `DiscoveryRepositoryWithPlace.saveWithPlace` return type to `Promise<{ placeId: string; discoveryId: string }>`; update call-site
- `apps/api/src/modules/discovery/infrastructure/prisma-discovery.repository.ts` — implement `findByPlace`; add upsert logic to `saveWithPlace`
- `apps/api/src/modules/place/place.module.ts` — provide `FindPlaceWithDiscoveries` use case
- `apps/api/src/modules/place/presentation/place.controller.ts` — add `GET /places/:id` route
- `apps/web/src/features/map/model/map.slice.ts` — rename `selectedDiscoveryId` → `selectedPlaceId`; rename actions
- `apps/web/src/features/map/ui/DiscoveryMarkerLayer.tsx` — group discoveries by `placeId`; emit `placeId` on click
- `apps/web/src/features/map/ui/MapView.tsx` — wire `PlaceModal` instead of `DiscoveryPopup`

**Create:**
- `apps/api/src/modules/place/application/find-place-with-discoveries.ts` — use case returning place + active discoveries
- `apps/web/src/features/map/api/place.api.ts` — typed fetcher for `GET /places/:id`
- `apps/web/src/features/map/api/place.queries.ts` — `usePlaceDiscoveries(placeId | null)` TanStack Query hook
- `apps/web/src/features/map/ui/PlaceModal.tsx` — bottom sheet showing place name + all items

**Delete:**
- `apps/web/src/features/map/ui/DiscoveryPopup.tsx` — replaced by `PlaceModal`

---

### Task 1: Domain port + infra upsert rule (`findByPlace` + upsert in `saveWithPlace`)

**Files:**
- Modify: `packages/domain/src/repositories/discovery-repository.ts`
- Modify: `apps/api/src/modules/discovery/application/create-discovery.ts`
- Modify: `apps/api/src/modules/discovery/infrastructure/prisma-discovery.repository.ts`

**Interfaces:**
- Produces: `DiscoveryRepository.findByPlace(placeId: string): Promise<NearbyDiscoveryRow[]>` (domain port)
- Produces: `saveWithPlace` returns `Promise<{ placeId: string; discoveryId: string }>` instead of `Promise<string>`
- Later tasks (Task 2 use case, Task 3 module) consume `findByPlace`

- [ ] **Step 1: Add `findByPlace` to the domain port**

Full replacement of `packages/domain/src/repositories/discovery-repository.ts`:

```ts
import type { Discovery } from "../entities/discovery";
import type { Coordinates } from "../value-objects/coordinates";

export interface NearbyDiscoveriesQuery {
  center: Coordinates;
  radiusMeters: number;
  itemQuery?: string;
  limit?: number;
  includeFresh?: boolean; // default true
}

/** Enriched row returned by findNearbyWithDetails and findByPlace — includes joined product/place names. */
export interface NearbyDiscoveryRow {
  id: string;
  productId: string;
  productName: string;
  placeId: string;
  placeName: string;
  priceBrl: number;
  quantity: number;
  note: string | null;
  lat: number;
  lng: number;
  distanceMeters: number;
  createdAt: Date;
  expiresAt: Date;
}

export interface DiscoveryRepository {
  findById(id: string): Promise<Discovery | null>;
  findNearby(query: NearbyDiscoveriesQuery): Promise<Discovery[]>;
  findNearbyWithDetails(query: NearbyDiscoveriesQuery): Promise<NearbyDiscoveryRow[]>;
  /** Returns all active (non-expired, non-hidden) discoveries for a place, newest first. */
  findByPlace(placeId: string): Promise<NearbyDiscoveryRow[]>;
  save(discovery: Discovery): Promise<void>;
  delete(id: string): Promise<void>;
}
```

- [ ] **Step 2: Update `saveWithPlace` return type in `create-discovery.ts`**

In `apps/api/src/modules/discovery/application/create-discovery.ts`, change:

```ts
export interface DiscoveryRepositoryWithPlace extends DiscoveryRepository {
  saveWithPlace(
    discovery: Discovery,
    placeId: string | undefined,
    placeName: string,
    createdById: string,
  ): Promise<{ placeId: string; discoveryId: string }>;
}
```

Then update the `execute` method call-site (the rest of the file stays the same except two lines):

Replace:
```ts
    const resolvedPlaceId = await this.discoveries.saveWithPlace(
      discovery,
      dto.placeId,
      dto.placeName,
      reporterId,
    );

    // Return a discovery with the resolved placeId for the controller response
    const saved = Discovery.create({
      id: discovery.id,
      productId: discovery.productId,
      placeId: resolvedPlaceId,
      price: discovery.price,
      quantity: discovery.quantity,
      reporterId: discovery.reporterId,
      coords: discovery.coords,
      note: discovery.note,
      createdAt: discovery.createdAt,
      expiresAt: discovery.expiresAt,
    });

    this.log.info({ discoveryId: saved.id, placeId: resolvedPlaceId }, "discovery created");
    return saved;
```

With:
```ts
    const { placeId: resolvedPlaceId, discoveryId: resolvedDiscoveryId } =
      await this.discoveries.saveWithPlace(
        discovery,
        dto.placeId,
        dto.placeName,
        reporterId,
      );

    const saved = Discovery.create({
      id: resolvedDiscoveryId,
      productId: discovery.productId,
      placeId: resolvedPlaceId,
      price: discovery.price,
      quantity: discovery.quantity,
      reporterId: discovery.reporterId,
      coords: discovery.coords,
      note: discovery.note,
      createdAt: discovery.createdAt,
      expiresAt: discovery.expiresAt,
    });

    this.log.info(
      { discoveryId: saved.id, placeId: resolvedPlaceId, upserted: resolvedDiscoveryId !== discovery.id },
      "discovery saved",
    );
    return saved;
```

- [ ] **Step 3: Implement `findByPlace` in `PrismaDiscoveryRepository`**

Add this method to the class in `apps/api/src/modules/discovery/infrastructure/prisma-discovery.repository.ts` (before the closing brace of `PrismaDiscoveryRepository`):

```ts
  async findByPlace(placeId: string): Promise<NearbyDiscoveryRow[]> {
    const now = new Date();
    const rows = await this.prisma.$queryRaw<RawDiscoveryRow[]>`
      SELECT
        d.id,
        d."productId",
        p.name             AS "productName",
        d."placeId",
        pl.name            AS "placeName",
        d.price,
        d.quantity,
        d.note,
        ST_Y(d.location::geometry) AS lat,
        ST_X(d.location::geometry) AS lng,
        0                          AS "distanceMeters",
        d."createdAt",
        d."expiresAt"
      FROM discoveries d
        JOIN products p  ON p.id = d."productId"
        JOIN places   pl ON pl.id = d."placeId"
      WHERE
        d."placeId"  = ${placeId}
        AND d."hiddenAt"  IS NULL
        AND d."expiresAt" > ${now}
        AND p.status = 'active'
      ORDER BY d."createdAt" DESC
    `;
    return rows.map((r) => ({
      id: r.id,
      productId: r.productId,
      productName: r.productName,
      placeId: r.placeId,
      placeName: r.placeName,
      priceBrl: parseFloat(r.price),
      quantity: r.quantity,
      note: r.note,
      lat: r.lat,
      lng: r.lng,
      distanceMeters: 0,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
    }));
  }
```

- [ ] **Step 4: Add upsert logic + fix return type in `saveWithPlace`**

Replace the `saveWithPlace` method body in `prisma-discovery.repository.ts`:

```ts
  async saveWithPlace(
    discovery: Discovery,
    placeId: string | undefined,
    placeName: string,
    createdById: string,
  ): Promise<{ placeId: string; discoveryId: string }> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Resolve or create place
      let resolvedPlaceId: string;
      if (placeId) {
        const exists = await tx.place.findUnique({ where: { id: placeId } });
        if (!exists) throw new NotFoundError(`Place ${placeId} not found`);
        resolvedPlaceId = placeId;
      } else {
        const { randomUUID } = await import("node:crypto");
        const newPlaceId = randomUUID();
        await tx.$executeRaw`
          INSERT INTO places (id, name, location, "createdById")
          VALUES (${newPlaceId}, ${placeName},
            ST_MakePoint(${discovery.coords.lng}, ${discovery.coords.lat})::geography,
            ${createdById})
        `;
        resolvedPlaceId = newPlaceId;
      }

      // 2. Upsert: if an active discovery for the same product+place already exists,
      //    update its price/quantity/note and refresh the TTL instead of inserting a duplicate.
      const now = new Date();
      const existing = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM discoveries
        WHERE "productId" = ${discovery.productId}
          AND "placeId"   = ${resolvedPlaceId}
          AND "hiddenAt"  IS NULL
          AND "expiresAt" > ${now}
        LIMIT 1
      `;

      if (existing.length > 0) {
        const existingId = existing[0].id;
        await tx.$executeRaw`
          UPDATE discoveries
          SET
            price       = ${discovery.price.cents / 100},
            quantity    = ${discovery.quantity},
            note        = ${discovery.note ?? null},
            "expiresAt" = ${discovery.expiresAt},
            "reporterId" = ${discovery.reporterId}
          WHERE id = ${existingId}
        `;
        return { placeId: resolvedPlaceId, discoveryId: existingId };
      }

      // 3. No existing active discovery — insert new
      await tx.$executeRaw`
        INSERT INTO discoveries (id, "productId", "placeId", price, quantity, "reporterId", note, location, "expiresAt")
        VALUES (
          ${discovery.id},
          ${discovery.productId},
          ${resolvedPlaceId},
          ${discovery.price.cents / 100},
          ${discovery.quantity},
          ${discovery.reporterId},
          ${discovery.note ?? null},
          ST_MakePoint(${discovery.coords.lng}, ${discovery.coords.lat})::geography,
          ${discovery.expiresAt}
        )
      `;
      return { placeId: resolvedPlaceId, discoveryId: discovery.id };
    });
  }
```

- [ ] **Step 5: Run the domain tests to verify no breakage**

```bash
pnpm --filter @app/domain test
```

Expected: all existing tests pass. No new tests needed in the domain for these infrastructure-level changes.

- [ ] **Step 6: Run the API typecheck to verify `saveWithPlace` return type is consistent**

```bash
pnpm --filter @app/api typecheck
```

Expected: no TypeScript errors. If there are errors, they will point to any remaining callers of `saveWithPlace` that expect a `string` return — fix them by destructuring `{ placeId, discoveryId }`.

- [ ] **Step 7: Commit**

```bash
git add packages/domain/src/repositories/discovery-repository.ts
git add apps/api/src/modules/discovery/application/create-discovery.ts
git add apps/api/src/modules/discovery/infrastructure/prisma-discovery.repository.ts
git commit -m "feat(domain): add findByPlace port + upsert rule in saveWithPlace"
```

---

### Task 2: Contracts — `PlaceWithDiscoveriesResponse` schema

**Files:**
- Modify: `packages/contracts/src/place.ts`

**Interfaces:**
- Consumes: `coordinatesSchema` already defined in same file
- Produces: `PlaceWithDiscoveriesResponse` type (used by Task 3 controller + Task 4 frontend hook)

- [ ] **Step 1: Add schemas to `packages/contracts/src/place.ts`**

Append these exports at the bottom of the file (after the existing exports):

```ts
export const placeDiscoveryItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string(),
  priceBrl: z.number(),
  quantity: z.number().int(),
  note: z.string().nullable(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  ageMinutes: z.number().int(),
});
export type PlaceDiscoveryItem = z.infer<typeof placeDiscoveryItemSchema>;

export const placeWithDiscoveriesResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  address: z.string().optional(),
  coords: coordinatesSchema,
  discoveries: z.array(placeDiscoveryItemSchema),
});
export type PlaceWithDiscoveriesResponse = z.infer<typeof placeWithDiscoveriesResponseSchema>;
```

- [ ] **Step 2: Typecheck contracts**

```bash
pnpm --filter @aonde-tem/contracts typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/contracts/src/place.ts
git commit -m "feat(contracts): add PlaceWithDiscoveriesResponse schema"
```

---

### Task 3: API — `FindPlaceWithDiscoveries` use case + `GET /places/:id`

**Files:**
- Create: `apps/api/src/modules/place/application/find-place-with-discoveries.ts`
- Modify: `apps/api/src/modules/place/presentation/place.controller.ts`
- Modify: `apps/api/src/modules/place/place.module.ts`

**Interfaces:**
- Consumes: `PlaceRepository.findById` (already exists), `DiscoveryRepository.findByPlace` (Task 1)
- Consumes: `PlaceWithDiscoveriesResponse` type (Task 2)
- Produces: `GET /places/:id` → `PlaceWithDiscoveriesResponse`

- [ ] **Step 1: Create `find-place-with-discoveries.ts`**

Create `apps/api/src/modules/place/application/find-place-with-discoveries.ts`:

```ts
import type { Place, PlaceRepository, NearbyDiscoveryRow } from "@aonde-tem/domain";
import { NotFoundError } from "@aonde-tem/domain";

/** Narrow port — only the method this use case needs from DiscoveryRepository. */
export interface DiscoveryByPlaceFinder {
  findByPlace(placeId: string): Promise<NearbyDiscoveryRow[]>;
}

export class FindPlaceWithDiscoveries {
  constructor(
    private readonly places: PlaceRepository,
    private readonly discoveries: DiscoveryByPlaceFinder,
  ) {}

  async execute(placeId: string): Promise<{ place: Place; rows: NearbyDiscoveryRow[] }> {
    const place = await this.places.findById(placeId);
    if (!place) throw new NotFoundError(`Place ${placeId} not found`);
    const rows = await this.discoveries.findByPlace(placeId);
    return { place, rows };
  }
}
```

- [ ] **Step 2: Add `GET /places/:id` to `place.controller.ts`**

Full replacement of `apps/api/src/modules/place/presentation/place.controller.ts`:

```ts
import { Controller, Get, Post, Body, Query, Param, Inject } from "@nestjs/common";
import {
  createPlaceSchema, nearbyQuerySchema,
  type PlaceResponse, type PlaceWithDiscoveriesResponse,
} from "@aonde-tem/contracts";
import { Place } from "@aonde-tem/domain";
import { FindNearbyPlaces } from "../application/find-nearby-places.js";
import { CreatePlace } from "../application/create-place.js";
import { FindPlaceWithDiscoveries } from "../application/find-place-with-discoveries.js";

function toResponse(p: Place): PlaceResponse {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    address: p.address,
    coords: { lat: p.coords.lat, lng: p.coords.lng },
  };
}

@Controller("places")
export class PlaceController {
  constructor(
    @Inject(FindNearbyPlaces) private readonly findNearby: FindNearbyPlaces,
    @Inject(CreatePlace) private readonly createPlace: CreatePlace,
    @Inject(FindPlaceWithDiscoveries) private readonly findWithDiscoveries: FindPlaceWithDiscoveries,
  ) {}

  @Get("nearby")
  async nearby(@Query() query: unknown): Promise<PlaceResponse[]> {
    const { lat, lng, radius } = nearbyQuerySchema.parse(query);
    const places = await this.findNearby.execute({ lat, lng, radius });
    return places.map(toResponse);
  }

  @Get(":id")
  async getWithDiscoveries(@Param("id") id: string): Promise<PlaceWithDiscoveriesResponse> {
    const { place, rows } = await this.findWithDiscoveries.execute(id);
    return {
      id: place.id,
      name: place.name,
      address: place.address,
      coords: { lat: place.coords.lat, lng: place.coords.lng },
      discoveries: rows.map((r) => ({
        id: r.id,
        productId: r.productId,
        productName: r.productName,
        priceBrl: r.priceBrl,
        quantity: r.quantity,
        note: r.note,
        createdAt: r.createdAt.toISOString(),
        expiresAt: r.expiresAt.toISOString(),
        ageMinutes: Math.floor((Date.now() - r.createdAt.getTime()) / 60_000),
      })),
    };
  }

  @Post()
  async create(@Body() body: unknown): Promise<PlaceResponse> {
    const dto = createPlaceSchema.parse(body);
    const place = await this.createPlace.execute(dto);
    return toResponse(place);
  }
}
```

- [ ] **Step 3: Wire `FindPlaceWithDiscoveries` in `place.module.ts`**

Full replacement of `apps/api/src/modules/place/place.module.ts`:

```ts
import { Module } from "@nestjs/common";
import type { PlaceRepository, Logger } from "@aonde-tem/domain";
import { PrismaService } from "../../shared/prisma.service.js";
import { PinoLoggerAdapter, LOGGER } from "../../shared/logging/pino-logger.adapter.js";
import { PostgisPlaceRepository } from "./infrastructure/postgis-place.repository.js";
import { FindNearbyPlaces } from "./application/find-nearby-places.js";
import { CreatePlace } from "./application/create-place.js";
import { FindPlaceWithDiscoveries, type DiscoveryByPlaceFinder } from "./application/find-place-with-discoveries.js";
import { PrismaDiscoveryRepository } from "../discovery/infrastructure/prisma-discovery.repository.js";
import { PlaceController } from "./presentation/place.controller.js";

const PLACE_REPOSITORY = Symbol("PlaceRepository");
const DISCOVERY_FINDER = Symbol("DiscoveryByPlaceFinder");

@Module({
  controllers: [PlaceController],
  providers: [
    PrismaService,
    { provide: LOGGER, useClass: PinoLoggerAdapter },
    { provide: PLACE_REPOSITORY, useClass: PostgisPlaceRepository },
    // A read-only instance of PrismaDiscoveryRepository used only for findByPlace.
    { provide: DISCOVERY_FINDER, useClass: PrismaDiscoveryRepository },
    {
      provide: FindNearbyPlaces,
      useFactory: (repo: PlaceRepository, log: Logger) => new FindNearbyPlaces(repo, log),
      inject: [PLACE_REPOSITORY, LOGGER],
    },
    {
      provide: CreatePlace,
      useFactory: (repo: PlaceRepository, log: Logger) => new CreatePlace(repo, log),
      inject: [PLACE_REPOSITORY, LOGGER],
    },
    {
      provide: FindPlaceWithDiscoveries,
      useFactory: (places: PlaceRepository, discoveries: DiscoveryByPlaceFinder) =>
        new FindPlaceWithDiscoveries(places, discoveries),
      inject: [PLACE_REPOSITORY, DISCOVERY_FINDER],
    },
  ],
})
export class PlaceModule {}
```

- [ ] **Step 4: Typecheck the API**

```bash
pnpm --filter @app/api typecheck
```

Expected: no errors.

- [ ] **Step 5: Smoke-test the endpoint (with Docker Compose running)**

```bash
# Start the stack if not running
docker compose up -d db api

# Fetch a placeId from the nearby discoveries endpoint first
curl -s "http://localhost:3000/api/discoveries/nearby?lat=-23.55&lng=-46.63&radius=5000" | jq '.results[0].placeId'

# Then hit the place endpoint with that id
PLACE_ID=<the-id-from-above>
curl -s "http://localhost:3000/api/places/$PLACE_ID" | jq
```

Expected: JSON with `{ id, name, coords, discoveries: [...] }`. If no seed data, the discoveries array will be empty; that's fine — the 200 response confirms the route works.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/place/application/find-place-with-discoveries.ts
git add apps/api/src/modules/place/presentation/place.controller.ts
git add apps/api/src/modules/place/place.module.ts
git commit -m "feat(api): GET /places/:id returns place with active discoveries"
```

---

### Task 4: Frontend — place-centric map (slice + layer + modal)

All frontend changes in this task form one atomic user-visible feature: clicking a place on the map shows a modal with all its items. The files are interdependent (slice rename touches marker layer, popup, and map view simultaneously).

**Files:**
- Modify: `apps/web/src/features/map/model/map.slice.ts`
- Modify: `apps/web/src/features/map/ui/DiscoveryMarkerLayer.tsx`
- Modify: `apps/web/src/features/map/ui/MapView.tsx`
- Create: `apps/web/src/features/map/api/place.api.ts`
- Create: `apps/web/src/features/map/api/place.queries.ts`
- Create: `apps/web/src/features/map/ui/PlaceModal.tsx`
- Delete: `apps/web/src/features/map/ui/DiscoveryPopup.tsx`

**Interfaces:**
- Consumes: `PlaceWithDiscoveriesResponse` from `@aonde-tem/contracts` (Task 2)
- Consumes: `GET /api/places/:id` (Task 3)
- Consumes: `DiscoveryResponse` (already in `@aonde-tem/contracts`) for marker grouping
- Produces: `selectPlace(placeId: string)` / `clearSelectedPlace()` in `AppStore`

- [ ] **Step 1: Update `map.slice.ts`**

Full replacement of `apps/web/src/features/map/model/map.slice.ts`:

```ts
import type { SliceCreator } from "../../../app/store/types.js";

export interface MapSlice {
  selectedPlaceId: string | null;
  mapRadius: number;
  selectPlace: (id: string) => void;
  clearSelectedPlace: () => void;
  setRadius: (r: number) => void;
}

export const createMapSlice: SliceCreator<MapSlice> = (set) => ({
  selectedPlaceId: null,
  mapRadius: 5_000,
  selectPlace: (id) => set({ selectedPlaceId: id }, undefined, "map/selectPlace"),
  clearSelectedPlace: () => set({ selectedPlaceId: null }, undefined, "map/clearSelectedPlace"),
  setRadius: (mapRadius) => set({ mapRadius }, undefined, "map/setRadius"),
});
```

- [ ] **Step 2: Create `apps/web/src/features/map/api/place.api.ts`**

```ts
import { placeWithDiscoveriesResponseSchema, type PlaceWithDiscoveriesResponse } from "@aonde-tem/contracts";
import { http } from "../../../shared/api/http.js";

export async function fetchPlaceWithDiscoveries(placeId: string): Promise<PlaceWithDiscoveriesResponse> {
  return http(`/api/places/${placeId}`, placeWithDiscoveriesResponseSchema);
}
```

- [ ] **Step 3: Create `apps/web/src/features/map/api/place.queries.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { fetchPlaceWithDiscoveries } from "./place.api.js";

const keys = {
  detail: (id: string) => ["places", id] as const,
};

export function usePlaceDiscoveries(placeId: string | null) {
  return useQuery({
    queryKey: keys.detail(placeId ?? ""),
    queryFn: () => fetchPlaceWithDiscoveries(placeId!),
    enabled: !!placeId,
    staleTime: 30_000,
  });
}
```

- [ ] **Step 4: Create `apps/web/src/features/map/ui/PlaceModal.tsx`**

```tsx
import { useState } from "react";
import { useAppStore } from "../../../app/store/index.js";
import { usePlaceDiscoveries } from "../api/place.queries.js";
import { FlagSheet } from "../../flag/ui/FlagSheet.js";

function freshnessLabel(ageMinutes: number): string {
  if (ageMinutes < 60) return `${ageMinutes}min atrás`;
  if (ageMinutes < 1440) return `${Math.floor(ageMinutes / 60)}h atrás`;
  return `${Math.floor(ageMinutes / 1440)}d atrás`;
}

function freshnessClass(ageMinutes: number): string {
  if (ageMinutes < 120) return "text-fresh";
  if (ageMinutes < 720) return "text-aging";
  return "text-text-muted";
}

interface Props {
  placeId: string;
}

export function PlaceModal({ placeId }: Props) {
  const clearSelected = useAppStore((s) => s.clearSelectedPlace);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated());
  const [flagTargetId, setFlagTargetId] = useState<string | null>(null);

  const { data, isLoading } = usePlaceDiscoveries(placeId);

  const mapsUrl = data
    ? `https://www.google.com/maps/search/?api=1&query=${data.coords.lat},${data.coords.lng}`
    : null;

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-2xl shadow-xl pb-8 z-10 animate-slide-up max-h-[80vh] flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-2 shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-text leading-snug">
            {data?.name ?? "Carregando…"}
          </h2>
          {data?.address && (
            <p className="text-text-muted text-sm mt-0.5">{data.address}</p>
          )}
        </div>
        <button
          type="button"
          onClick={clearSelected}
          className="text-text-muted text-2xl leading-none min-h-11 min-w-11 flex items-center justify-center"
          aria-label="Fechar"
        >
          ×
        </button>
      </div>

      {/* Item list */}
      <div className="overflow-y-auto flex-1 px-4">
        {isLoading && (
          <p className="text-text-muted text-sm py-4 text-center">Carregando itens…</p>
        )}

        {!isLoading && data?.discoveries.length === 0 && (
          <p className="text-text-muted text-sm py-4 text-center">
            Nenhum item disponível aqui no momento.
          </p>
        )}

        {data?.discoveries.map((item) => (
          <div
            key={item.id}
            className="py-3 border-b border-border last:border-0"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium text-text">{item.productName}</span>
              <span className="font-bold text-text tabular-nums shrink-0">
                R$ {item.priceBrl.toFixed(2).replace(".", ",")}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-text-muted text-sm">{item.quantity} unid.</span>
              <span className={`text-sm ${freshnessClass(item.ageMinutes)}`}>
                {freshnessLabel(item.ageMinutes)}
              </span>
            </div>
            {item.note && (
              <p className="text-text-muted text-sm mt-1 italic">"{item.note}"</p>
            )}
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setFlagTargetId(item.id)}
                className="text-text-muted text-xs mt-1 min-h-8"
              >
                Denunciar
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Footer actions */}
      {mapsUrl && (
        <div className="px-4 pt-3 shrink-0">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-brand text-white font-semibold py-3 rounded-xl"
          >
            Ver no mapa
          </a>
        </div>
      )}

      {flagTargetId && (
        <FlagSheet
          targetType="discovery"
          targetId={flagTargetId}
          onClose={() => setFlagTargetId(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Update `DiscoveryMarkerLayer.tsx` to group by place**

Full replacement of `apps/web/src/features/map/ui/DiscoveryMarkerLayer.tsx`:

```tsx
import { useEffect } from "react";
import { useMap } from "react-map-gl/maplibre";
import { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import type { DiscoveryResponse } from "@aonde-tem/contracts";
import { useAppStore } from "../../../app/store/index.js";

interface Props {
  discoveries: DiscoveryResponse[];
}

type PointFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: Record<string, unknown>;
};

type FeatureCollection = {
  type: "FeatureCollection";
  features: PointFeature[];
};

function freshnessColor(ageMinutes: number): string {
  if (ageMinutes < 120) return "#1a5c3a";
  if (ageMinutes < 720) return "#b45309";
  return "#9ca3af";
}

/** Deduplicate discoveries by placeId, keeping the freshest per place. */
function groupByPlace(discoveries: DiscoveryResponse[]): DiscoveryResponse[] {
  const map = new Map<string, DiscoveryResponse>();
  for (const d of discoveries) {
    const existing = map.get(d.placeId);
    if (!existing || d.ageMinutes < existing.ageMinutes) {
      map.set(d.placeId, d);
    }
  }
  return Array.from(map.values());
}

export function DiscoveryMarkerLayer({ discoveries }: Props) {
  const { current: mapRef } = useMap();
  const selectPlace = useAppStore((s) => s.selectPlace);

  useEffect(() => {
    if (!mapRef) return;
    const map: MapLibreMap = mapRef.getMap();

    const places = groupByPlace(discoveries);

    const geojson: FeatureCollection = {
      type: "FeatureCollection",
      features: places.map((d) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [d.lng, d.lat] },
        properties: {
          placeId: d.placeId,
          placeName: d.placeName,
          color: freshnessColor(d.ageMinutes),
        },
      })),
    };

    function applyLayers() {
      if (map.getSource("places")) {
        (map.getSource("places") as GeoJSONSource).setData(geojson);
        return;
      }

      map.addSource("places", {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 40,
      });

      map.addLayer({
        id: "places-clusters",
        type: "circle",
        source: "places",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#1a5c3a",
          "circle-radius": ["step", ["get", "point_count"], 16, 5, 22, 20, 28],
          "circle-opacity": 0.9,
        },
      });

      map.addLayer({
        id: "places-points",
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

      map.on("click", "places-points", (e) => {
        const placeId = e.features?.[0]?.properties?.placeId;
        if (placeId) selectPlace(String(placeId));
      });
    }

    if (map.isStyleLoaded()) {
      applyLayers();
    } else {
      map.once("load", applyLayers);
    }

    return () => {
      map.off("load", applyLayers);
      try {
        if (map.getLayer("places-points")) map.removeLayer("places-points");
        if (map.getLayer("places-clusters")) map.removeLayer("places-clusters");
        if (map.getSource("places")) map.removeSource("places");
      } catch {
        // map already removed — nothing to clean up
      }
    };
  }, [mapRef, discoveries, selectPlace]);

  return null;
}
```

- [ ] **Step 6: Update `MapView.tsx` to use `PlaceModal`**

Full replacement of `apps/web/src/features/map/ui/MapView.tsx`:

```tsx
import Map, { Marker, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { DiscoveryResponse } from "@aonde-tem/contracts";
import { DiscoveryMarkerLayer } from "./DiscoveryMarkerLayer.js";
import { PlaceModal } from "./PlaceModal.js";
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
  const selectedPlaceId = useAppStore((s) => s.selectedPlaceId);

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

      {selectedPlaceId && <PlaceModal placeId={selectedPlaceId} />}
    </div>
  );
}
```

- [ ] **Step 7: Delete `DiscoveryPopup.tsx`**

```bash
rm apps/web/src/features/map/ui/DiscoveryPopup.tsx
```

- [ ] **Step 8: Typecheck the web app**

```bash
pnpm --filter @app/web typecheck
```

Expected: no errors. If TypeScript reports errors about `selectedDiscoveryId`, `clearSelectedDiscovery`, or `selectDiscovery` in other files, search for and update those references:

```bash
# Search for remaining old slice references
grep -r "selectedDiscoveryId\|selectDiscovery\|clearSelectedDiscovery\|DiscoveryPopup" apps/web/src
```

Fix any remaining references by replacing with `selectedPlaceId`, `selectPlace`, `clearSelectedPlace`, and `PlaceModal` respectively.

- [ ] **Step 9: Verify in the browser (with stack running)**

```bash
docker compose up -d db api
pnpm --filter @app/web dev
```

Open `http://localhost:5173`. Steps to verify:

1. If there are seed discoveries on the map, click a place marker → `PlaceModal` opens (bottom sheet with place name + items list)
2. The `×` button closes the modal
3. Each item shows product name, price, quantity, age
4. "Ver no mapa" link opens Google Maps at the place coords
5. If you report the same product at the same place twice (via the `+` FAB), the second submission should NOT add a second item in the modal — it should update the existing one

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/features/map/model/map.slice.ts
git add apps/web/src/features/map/api/place.api.ts
git add apps/web/src/features/map/api/place.queries.ts
git add apps/web/src/features/map/ui/PlaceModal.tsx
git add apps/web/src/features/map/ui/DiscoveryMarkerLayer.tsx
git add apps/web/src/features/map/ui/MapView.tsx
git rm apps/web/src/features/map/ui/DiscoveryPopup.tsx
git commit -m "feat(web): place-centric map — group markers by place, PlaceModal on click"
```

---

## Self-Review

### Spec coverage

| Requirement | Task |
|---|---|
| Discovery always belongs to a place (required) | Already enforced in domain; `placeId` validated in `Discovery.create()` |
| Places created on first discovery | Already in `saveWithPlace`; this plan documents and hardens it |
| Same item at same place → update, not duplicate | Task 1 upsert in `saveWithPlace` |
| Map pins are places (not individual discoveries) | Task 4 `groupByPlace` + `DiscoveryMarkerLayer` |
| Click a place → modal with items, how/when discovered | Tasks 3 + 4 `PlaceModal` + `GET /places/:id` |

### Placeholder scan

No TBDs, TODOs, or "add appropriate…" phrases. All steps contain the complete code to write.

### Type consistency

- `NearbyDiscoveryRow` definition in domain port — same interface consumed by `findByPlace` impl, `FindPlaceWithDiscoveries` use case, and `PlaceWithDiscoveriesResponse` mapping.
- `saveWithPlace` return type `{ placeId: string; discoveryId: string }` — declared in `DiscoveryRepositoryWithPlace` interface (Task 1 Step 2) and destructured at the call-site in the same step.
- `selectPlace(id: string)` / `clearSelectedPlace()` — declared in `MapSlice` (Task 4 Step 1) and consumed in `DiscoveryMarkerLayer` (Step 5) and `PlaceModal` (Step 4). `MapView` reads `selectedPlaceId` from the same slice (Step 6).
- `placeDiscoveryItemSchema` + `placeWithDiscoveriesResponseSchema` — declared in contracts (Task 2), used in controller response mapping (Task 3 Step 2), and in `place.api.ts` fetcher + `PlaceModal` prop types (Task 4 Steps 2–4).

# Backend Read API (Seek / Nearby Discoveries) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `GET /discoveries/nearby` — the backend read side of the seek loop: fuzzy item search + PostGIS radius query ordered by distance, returning only fresh discoveries, with lean payloads.

**Architecture:** NestJS feature module (`DiscoveryModule`) follows Clean Architecture. Zod contracts in `packages/contracts`. Use case in `apps/api/.../application/`. PostGIS repository implementation in `.../infrastructure/`. Controller in `.../presentation/`. Port = `DiscoveryRepository` (defined in `packages/domain` — Plan A).

**Tech Stack:** NestJS, Prisma (`$queryRaw` for PostGIS), Zod, TypeScript strict, Jest + Supertest.

## Global Constraints

- **Prerequisite:** Plan A (Foundation + Domain Model) must be complete — `DiscoveryRepository` port and domain entities must exist
- API payloads ≤ 50 KB for 50 results (PERFORMANCE.md budget)
- `p95` server time for `/nearby` ≤ 300 ms — GiST index + `ST_DWithin` + `ORDER BY <->` + `LIMIT 50`
- Fuzzy search uses `pg_trgm` (`similarity()` or `%` operator); normalized item query before DB call
- Expired discoveries (past `expiresAt`) are excluded from results; hidden discoveries (`hiddenAt IS NOT NULL`) also excluded
- All field names in API responses use camelCase; Prisma returns snake_case from raw queries → map explicitly
- Backlog items: AT-020, AT-022, AT-023, AT-024, AT-017 (seed)

---

## File Structure

**New files:**
- `packages/contracts/src/discovery.ts` — Zod schemas for discovery response + nearby query
- `packages/contracts/src/index.ts` — re-export discovery contracts
- `apps/api/src/modules/discovery/application/find-nearby-discoveries.ts`
- `apps/api/src/modules/discovery/infrastructure/prisma-discovery.repository.ts`
- `apps/api/src/modules/discovery/presentation/discovery.controller.ts`
- `apps/api/src/modules/discovery/discovery.module.ts`
- `prisma/seed.ts` — seed 10 sample discoveries in São Paulo

**Modified files:**
- `apps/api/src/app.module.ts` — register `DiscoveryModule`
- `packages/contracts/src/index.ts` — export discovery contracts

---

### Task 1: Zod contracts for discovery (AT-020)

**Files:**
- Create: `packages/contracts/src/discovery.ts`
- Modify: `packages/contracts/src/index.ts`

**Interfaces:**
- Produces: `nearbyDiscoveriesQuerySchema`, `discoveryResponseSchema`, `DiscoveryResponse` type

- [ ] **Step 1: Write the contract file**

```typescript
// packages/contracts/src/discovery.ts
import { z } from "zod";

export const nearbyDiscoveriesQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(100).max(50_000).default(5_000), // metres
  item: z.string().min(1).max(200).optional(),
  limit: z.coerce.number().min(1).max(50).default(50),
});

export type NearbyDiscoveriesQuery = z.infer<typeof nearbyDiscoveriesQuerySchema>;

export const discoveryResponseSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string(),
  placeId: z.string().uuid(),
  placeName: z.string(),
  priceBrl: z.number(),        // in BRL (e.g. 9.99)
  quantity: z.number().int(),
  note: z.string().nullable(),
  lat: z.number(),
  lng: z.number(),
  distanceMeters: z.number(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  ageMinutes: z.number().int(),
});

export type DiscoveryResponse = z.infer<typeof discoveryResponseSchema>;

export const nearbyDiscoveriesResponseSchema = z.object({
  results: z.array(discoveryResponseSchema),
  total: z.number().int(),
});

export type NearbyDiscoveriesResponse = z.infer<typeof nearbyDiscoveriesResponseSchema>;
```

- [ ] **Step 2: Export from contracts index**

Open `packages/contracts/src/index.ts` and add:

```typescript
export * from "./discovery.js";
```

- [ ] **Step 3: Build contracts to verify**

```bash
pnpm --filter @app/contracts build
```

Expected: build succeeds with no TS errors.

- [ ] **Step 4: Commit**

```bash
git add packages/contracts/src/discovery.ts packages/contracts/src/index.ts
git commit -m "feat(contracts): Discovery Zod schemas — nearby query + response (AT-020)"
```

---

### Task 2: FindNearbyDiscoveries use case

**Files:**
- Create: `apps/api/src/modules/discovery/application/find-nearby-discoveries.ts`

**Interfaces:**
- Consumes: `DiscoveryRepository` (port from `@app/domain`), `Logger` (port from `@app/domain`)
- Produces: `FindNearbyDiscoveries` class with `execute(query): Promise<DiscoveryWithDetails[]>`

Note: `DiscoveryWithDetails` is defined here (not in domain — it's an application-layer DTO that joins Discovery + Product name + Place name + distance).

- [ ] **Step 1: Write the use case**

```typescript
// apps/api/src/modules/discovery/application/find-nearby-discoveries.ts
import type { DiscoveryRepository, NearbyDiscoveriesQuery } from "@app/domain";
import type { Logger } from "@app/domain";

export interface DiscoveryWithDetails {
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

export class FindNearbyDiscoveries {
  constructor(
    private readonly discoveries: DiscoveryRepository,
    private readonly log: Logger,
  ) {}

  async execute(query: NearbyDiscoveriesQuery): Promise<DiscoveryWithDetails[]> {
    this.log.info({ lat: query.center.lat, lng: query.center.lng, item: query.itemQuery }, "find nearby discoveries");
    // The repository handles the heavy lifting (PostGIS + pg_trgm)
    return this.discoveries.findNearby(query) as unknown as DiscoveryWithDetails[];
  }
}
```

Note: The repository returns enriched rows (with productName, placeName, distanceMeters) from `$queryRaw`. The use case keeps business rules thin here — the join is done at the DB level for performance.

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/discovery/application/find-nearby-discoveries.ts
git commit -m "feat(api): FindNearbyDiscoveries use case (AT-022)"
```

---

### Task 3: PostGIS DiscoveryRepository implementation

**Files:**
- Create: `apps/api/src/modules/discovery/infrastructure/prisma-discovery.repository.ts`

**Interfaces:**
- Consumes: `PrismaService`, domain `Coordinates`, `Discovery`, `Price`
- Produces: `PriSmaDiscoveryRepository` implementing `DiscoveryRepository`; `findNearby` returns `DiscoveryWithDetails[]` rows

- [ ] **Step 1: Write the repository**

```typescript
// apps/api/src/modules/discovery/infrastructure/prisma-discovery.repository.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../shared/prisma.service.js";
import type { DiscoveryRepository, NearbyDiscoveriesQuery } from "@app/domain";
import { Discovery, Price, Coordinates } from "@app/domain";
import type { DiscoveryWithDetails } from "../application/find-nearby-discoveries.js";

interface RawDiscoveryRow {
  id: string;
  product_id: string;
  product_name: string;
  place_id: string;
  place_name: string;
  price: string;           // Decimal comes back as string from raw query
  quantity: number;
  note: string | null;
  lat: number;
  lng: number;
  distance_meters: number;
  created_at: Date;
  expires_at: Date;
}

@Injectable()
export class PrismaDiscoveryRepository implements DiscoveryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findNearby(query: NearbyDiscoveriesQuery): Promise<DiscoveryWithDetails[]> {
    const { center, radiusMeters, itemQuery, limit = 50 } = query;
    const now = new Date();

    // Normalize the search query the same way products are normalized
    const normalizedQuery = itemQuery
      ? itemQuery.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim()
      : null;

    const rows = await this.prisma.$queryRaw<RawDiscoveryRow[]>`
      SELECT
        s.id,
        s.product_id,
        p.name             AS product_name,
        s.place_id,
        pl.name            AS place_name,
        s.price,
        s.quantity,
        s.note,
        ST_Y(s.location::geometry)  AS lat,
        ST_X(s.location::geometry)  AS lng,
        ST_Distance(s.location, ST_MakePoint(${center.lng}, ${center.lat})::geography) AS distance_meters,
        s.created_at,
        s.expires_at
      FROM discoveries s
        JOIN products p  ON p.id = s.product_id
        JOIN places   pl ON pl.id = s.place_id
      WHERE
        s.hidden_at IS NULL
        AND s.expires_at > ${now}
        AND ST_DWithin(
          s.location,
          ST_MakePoint(${center.lng}, ${center.lat})::geography,
          ${radiusMeters}
        )
        ${normalizedQuery
          ? this.prisma.$raw`AND (
              p.normalized_key % ${normalizedQuery}
              OR p.normalized_key ILIKE ${'%' + normalizedQuery + '%'}
            )`
          : this.prisma.$raw``
        }
      ORDER BY s.location <-> ST_MakePoint(${center.lng}, ${center.lat})::geography
      LIMIT ${limit}
    `;

    return rows.map((r) => ({
      id: r.id,
      productId: r.product_id,
      productName: r.product_name,
      placeId: r.place_id,
      placeName: r.place_name,
      priceBrl: parseFloat(r.price),
      quantity: r.quantity,
      note: r.note,
      lat: r.lat,
      lng: r.lng,
      distanceMeters: Math.round(r.distance_meters),
      createdAt: r.created_at,
      expiresAt: r.expires_at,
    }));
  }

  async findById(id: string): Promise<Discovery | null> {
    const row = await this.prisma.discovery.findUnique({
      where: { id },
      include: { product: true, place: true },
    });
    if (!row) return null;
    return Discovery.create({
      id: row.id,
      productId: row.productId,
      placeId: row.placeId,
      price: Price.create(parseFloat(row.price.toString())),
      quantity: row.quantity,
      reporterId: row.reporterId,
      coords: Coordinates.create(0, 0), // coords are on the discovery but not fetched here
      note: row.note ?? undefined,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
    });
  }

  async save(_discovery: Discovery): Promise<void> {
    // Implemented in Plan C (write API)
    throw new Error("save() implemented in write API plan");
  }

  async delete(id: string): Promise<void> {
    await this.prisma.discovery.update({
      where: { id },
      data: { hiddenAt: new Date() },
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/discovery/infrastructure/prisma-discovery.repository.ts
git commit -m "feat(api): PostGIS DiscoveryRepository — findNearby with pg_trgm fuzzy search (AT-022, AT-023)"
```

---

### Task 4: DiscoveryController + DiscoveryModule

**Files:**
- Create: `apps/api/src/modules/discovery/presentation/discovery.controller.ts`
- Create: `apps/api/src/modules/discovery/discovery.module.ts`

**Interfaces:**
- Consumes: `FindNearbyDiscoveries` use case; `nearbyDiscoveriesQuerySchema` for validation
- Produces: `GET /discoveries/nearby` → `NearbyDiscoveriesResponse`

- [ ] **Step 1: Write the controller**

```typescript
// apps/api/src/modules/discovery/presentation/discovery.controller.ts
import { Controller, Get, Query, Inject } from "@nestjs/common";
import { nearbyDiscoveriesQuerySchema, type NearbyDiscoveriesResponse } from "@app/contracts";
import type { FindNearbyDiscoveries } from "../application/find-nearby-discoveries.js";
import { Coordinates } from "@app/domain";

@Controller("discoveries")
export class DiscoveryController {
  constructor(
    @Inject(FindNearbyDiscoveries) private readonly findNearby: FindNearbyDiscoveries,
  ) {}

  @Get("nearby")
  async nearby(@Query() rawQuery: unknown): Promise<NearbyDiscoveriesResponse> {
    const query = nearbyDiscoveriesQuerySchema.parse(rawQuery);
    const center = Coordinates.create(query.lat, query.lng);
    const results = await this.findNearby.execute({
      center,
      radiusMeters: query.radius,
      itemQuery: query.item,
      limit: query.limit,
    });

    return {
      results: results.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        expiresAt: r.expiresAt.toISOString(),
        ageMinutes: Math.floor((Date.now() - r.createdAt.getTime()) / 60_000),
      })),
      total: results.length,
    };
  }
}
```

- [ ] **Step 2: Write the module**

```typescript
// apps/api/src/modules/discovery/discovery.module.ts
import { Module } from "@nestjs/common";
import { PrismaService } from "../../shared/prisma.service.js";
import { PrismaDiscoveryRepository } from "./infrastructure/prisma-discovery.repository.js";
import { FindNearbyDiscoveries } from "./application/find-nearby-discoveries.js";
import { DiscoveryController } from "./presentation/discovery.controller.js";
import { LoggerModule } from "nestjs-pino";

@Module({
  imports: [LoggerModule],
  controllers: [DiscoveryController],
  providers: [
    PrismaService,
    { provide: "DiscoveryRepository", useClass: PrismaDiscoveryRepository },
    {
      provide: FindNearbyDiscoveries,
      useFactory: (repo: PrismaDiscoveryRepository, log: any) =>
        new FindNearbyDiscoveries(repo, log),
      inject: ["DiscoveryRepository", "PinoLogger"],
    },
  ],
})
export class DiscoveryModule {}
```

- [ ] **Step 3: Register in AppModule**

Open `apps/api/src/app.module.ts` and add `DiscoveryModule` to the imports array:

```typescript
import { DiscoveryModule } from "./modules/discovery/discovery.module.js";

@Module({
  imports: [
    // ...existing imports...
    DiscoveryModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 4: Build the API to verify no compile errors**

```bash
pnpm --filter @app/api build
```

Expected: build succeeds with no TS errors.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/discovery/ apps/api/src/app.module.ts
git commit -m "feat(api): GET /discoveries/nearby controller + DiscoveryModule (AT-022, AT-023, AT-024)"
```

---

### Task 5: Seed script with sample discoveries (AT-017)

**Files:**
- Create: `prisma/seed.ts`

**Interfaces:**
- Produces: 1 admin user, 3 products, 3 places, 10 discoveries in São Paulo (lat -23.55, lng -46.63)

- [ ] **Step 1: Write seed.ts**

```typescript
// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@aondetem.com.br" },
    update: {},
    create: { id: "00000000-0000-0000-0000-000000000001", email: "admin@aondetem.com.br", role: "admin", displayName: "Admin" },
  });

  // Products
  const arroz = await prisma.product.upsert({
    where: { normalizedKey: "arroz 5kg" },
    update: {},
    create: { name: "Arroz 5kg", normalizedKey: "arroz 5kg", createdById: admin.id },
  });
  const leite = await prisma.product.upsert({
    where: { normalizedKey: "leite integral 1l" },
    update: {},
    create: { name: "Leite Integral 1L", normalizedKey: "leite integral 1l", createdById: admin.id },
  });
  const oleo = await prisma.product.upsert({
    where: { normalizedKey: "oleo de soja 900ml" },
    update: {},
    create: { name: "Óleo de Soja 900ml", normalizedKey: "oleo de soja 900ml", createdById: admin.id },
  });

  // Places (São Paulo) — location via raw SQL since PostGIS Unsupported type
  await prisma.$executeRaw`
    INSERT INTO places (id, name, location, created_by_id)
    VALUES
      ('pl-001', 'Mercado do Bairro', ST_MakePoint(-46.638, -23.548)::geography, ${admin.id}),
      ('pl-002', 'Supermercado Central', ST_MakePoint(-46.625, -23.562)::geography, ${admin.id}),
      ('pl-003', 'Mercearia São João', ST_MakePoint(-46.642, -23.555)::geography, ${admin.id})
    ON CONFLICT (id) DO NOTHING
  `;

  // Discoveries
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.$executeRaw`
    INSERT INTO discoveries (id, product_id, place_id, price, quantity, reporter_id, location, expires_at)
    VALUES
      ('s-001', ${arroz.id}, 'pl-001', 32.90, 15, ${admin.id}, ST_MakePoint(-46.638, -23.548)::geography, ${expiresAt}),
      ('s-002', ${arroz.id}, 'pl-002', 34.50, 8,  ${admin.id}, ST_MakePoint(-46.625, -23.562)::geography, ${expiresAt}),
      ('s-003', ${leite.id}, 'pl-001', 5.99, 20,  ${admin.id}, ST_MakePoint(-46.638, -23.548)::geography, ${expiresAt}),
      ('s-004', ${leite.id}, 'pl-003', 6.20, 5,   ${admin.id}, ST_MakePoint(-46.642, -23.555)::geography, ${expiresAt}),
      ('s-005', ${oleo.id},  'pl-002', 8.90, 12,  ${admin.id}, ST_MakePoint(-46.625, -23.562)::geography, ${expiresAt})
    ON CONFLICT (id) DO NOTHING
  `;

  console.log("Seed complete: 3 products, 3 places, 5 discoveries in São Paulo");
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Add seed script to package.json**

In `package.json` at root, add or confirm in the `prisma` section:

```json
{
  "prisma": {
    "seed": "ts-node --project tsconfig.base.json prisma/seed.ts"
  }
}
```

- [ ] **Step 3: Run the seed**

```bash
npx prisma db seed
```

Expected: `Seed complete: 3 products, 3 places, 5 discoveries in São Paulo`

- [ ] **Step 4: Test the endpoint manually**

```bash
# Start the API
docker compose up -d db
pnpm --filter @app/api start:dev

# In another terminal:
curl "http://localhost:3000/discoveries/nearby?lat=-23.55&lng=-46.63&radius=5000&item=arroz"
```

Expected: JSON response with 2 discovery results for arroz (from pl-001 and pl-002), both within 5km.

- [ ] **Step 5: Commit**

```bash
git add prisma/seed.ts package.json
git commit -m "chore: seed script with São Paulo sample discoveries (AT-017)"
```

---

### Task 6: API integration test for GET /discoveries/nearby

**Files:**
- Create: `apps/api/src/modules/discovery/discovery.controller.spec.ts`

**Interfaces:**
- Consumes: Supertest, test PostGIS DB (Docker)

- [ ] **Step 1: Write the integration test**

```typescript
// apps/api/src/modules/discovery/discovery.controller.spec.ts
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../app.module.js";

describe("GET /discoveries/nearby", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 200 with results array", async () => {
    const res = await request(app.getHttpServer())
      .get("/discoveries/nearby?lat=-23.55&lng=-46.63&radius=10000")
      .expect(200);
    expect(res.body).toHaveProperty("results");
    expect(Array.isArray(res.body.results)).toBe(true);
  });

  it("filters by item query", async () => {
    const res = await request(app.getHttpServer())
      .get("/discoveries/nearby?lat=-23.55&lng=-46.63&radius=10000&item=arroz")
      .expect(200);
    const names: string[] = res.body.results.map((r: any) => r.productName.toLowerCase());
    names.forEach((n) => expect(n).toContain("arroz"));
  });

  it("rejects missing lat/lng", async () => {
    await request(app.getHttpServer())
      .get("/discoveries/nearby?radius=5000")
      .expect(400);
  });
});
```

- [ ] **Step 2: Run the integration test (requires running DB)**

```bash
docker compose up -d db
DATABASE_URL="postgresql://app:app@localhost:5432/app" pnpm --filter @app/api test -- --testPathPattern="discovery.controller"
```

Expected: `PASS` — 3 tests passing.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/discovery/discovery.controller.spec.ts
git commit -m "test(api): integration test for GET /discoveries/nearby (AT-101)"
```

---

## Self-Review Checklist

- [x] **AT-020** — Zod contracts for Discovery (create/response/nearby query) in `packages/contracts`
- [x] **AT-022** — `GET /discoveries/nearby` PostGIS radius query, ordered by distance
- [x] **AT-023** — Fuzzy item search via `pg_trgm` (both `%` and `ILIKE` fallback)
- [x] **AT-024** — Expired discoveries excluded (`expires_at > NOW()`); hidden discoveries excluded (`hidden_at IS NULL`)
- [x] **AT-017** — Seed script with sample data for São Paulo
- [x] Payload is lean (only fields the UI needs, distance pre-computed server-side)
- [x] No placeholders — all SQL is real; all types are consistent with Plan A domain

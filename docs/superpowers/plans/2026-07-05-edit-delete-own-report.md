# Edit/Delete Your Own Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a logged-in user edit or delete a `Discovery` ("Report" — item/place/price/quantity) that
they currently own, per backlog item AT-136.

**Architecture:** Clean Architecture, unchanged. New `UpdateDiscovery`/`DeleteDiscovery` use cases in
`apps/api/src/modules/discovery/application`, backed by one new `DiscoveryRepository.update()` method.
Ownership ("current reporter") is enforced in the use cases, not the controller. A new
`OptionalJwtAuthGuard` lets `GET /places/:id` stay public while still telling the frontend which
items belong to the caller, via a new `isMine` boolean on each item — `reporterId` itself never
reaches the client.

**Tech Stack:** NestJS + Prisma (raw SQL for the `discoveries` table, which has an
`Unsupported("geography")` column) on the API; React + TanStack Query + Zustand on the web app; Zod
schemas shared via `@aonde-tem/contracts`; Jest everywhere.

## Global Constraints

- Discovery-only scope: no editing of `productId`/`placeId`/location; no changes to `Product` or
  `Place`. (Full design: [`docs/superpowers/specs/2026-07-05-edit-delete-own-report-design.md`](../specs/2026-07-05-edit-delete-own-report-design.md).)
- Ownership rule: editable/deletable iff `reporterId === current user` AND `hiddenAt IS NULL` AND
  `expiresAt > now`. No separate edit-window timer.
- Editing refreshes freshness: `createdAt`/`expiresAt` reset to `now` / `now + TTL`, same as a new
  report (`DISCOVERY_DEFAULT_TTL_MS`, currently 24h, from `packages/domain/src/entities/discovery.ts`).
- `reporterId` must never be serialized into an HTTP response body. Only a derived `isMine: boolean`
  is exposed.
- Reuse existing conventions: raw `$executeRaw`/`$queryRaw` for the `discoveries` table (Prisma can't
  model the PostGIS `geography` column); `NotFoundError`/`ForbiddenError` from `@aonde-tem/domain`
  map automatically to 404/403 via the existing `AllExceptionsFilter` — never construct HTTP
  exceptions by hand in these use cases.
- TypeScript strict mode; ESLint/Prettier; `pnpm test` for Jest; keep bilingual docs
  (`*.en.md`/`*.pt.md`) in sync.

---

## Task 1: Domain use cases — `UpdateDiscovery` / `DeleteDiscovery`

**Files:**
- Modify: `packages/domain/src/repositories/discovery-repository.ts`
- Create: `apps/api/src/modules/discovery/application/update-discovery.ts`
- Create: `apps/api/src/modules/discovery/application/update-discovery.test.ts`
- Create: `apps/api/src/modules/discovery/application/delete-discovery.ts`
- Create: `apps/api/src/modules/discovery/application/delete-discovery.test.ts`

**Interfaces:**
- Consumes: `Discovery` (`packages/domain/src/entities/discovery.ts` — `.reporterId`, `.isFresh()`,
  static `.create(...)`), `Price.create(brl: number): Price`, `NotFoundError`/`ForbiddenError` from
  `@aonde-tem/domain`, `DISCOVERY_DEFAULT_TTL_MS`, `Logger` port (`.info(obj, msg)`).
- Produces: `UpdateDiscovery` (constructor `(discoveries: DiscoveryRepository, log: Logger)`, method
  `execute(id: string, dto: UpdateDiscoveryDto, userId: string): Promise<Discovery>`) and
  `DeleteDiscovery` (constructor `(discoveries: DiscoveryRepository, log: Logger)`, method
  `execute(id: string, userId: string): Promise<void>`) — both consumed by Task 2's controller/module.
  `DiscoveryRepository.update(id, changes)` — consumed by Task 2's `PrismaDiscoveryRepository`.

- [ ] **Step 1: Add `update` to the `DiscoveryRepository` port**

  Modify `packages/domain/src/repositories/discovery-repository.ts` — add a `Price` import and the
  new method:

  ```ts
  import type { Discovery } from "../entities/discovery";
  import type { Coordinates } from "../value-objects/coordinates";
  import type { Price } from "../value-objects/price";

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
    /** Only populated by findByPlace (used to derive `isMine` server-side); absent from findNearbyWithDetails. */
    reporterId?: string;
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
    /** Updates the editable fields of an existing discovery and refreshes its TTL. */
    update(
      id: string,
      changes: { price: Price; quantity: number; note?: string; expiresAt: Date },
    ): Promise<void>;
    delete(id: string): Promise<void>;
  }
  ```

- [ ] **Step 2: Write the failing tests for `UpdateDiscovery`**

  Create `apps/api/src/modules/discovery/application/update-discovery.test.ts`:

  ```ts
  import { UpdateDiscovery } from "./update-discovery.js";
  import {
    Discovery,
    Price,
    Coordinates,
    ForbiddenError,
    NotFoundError,
    type DiscoveryRepository,
    type Logger,
  } from "@aonde-tem/domain";

  const nullLog: Logger = {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    child: () => nullLog,
  };

  const coords = Coordinates.create(-23.55, -46.63);

  function makeDiscovery(overrides: Partial<Parameters<typeof Discovery.create>[0]> = {}): Discovery {
    return Discovery.create({
      id: "d1",
      productId: "p1",
      placeId: "pl1",
      price: Price.create(9.99),
      quantity: 5,
      reporterId: "owner",
      coords,
      ...overrides,
    });
  }

  function makeRepo(discovery: Discovery | null) {
    const updateCalls: { id: string; changes: unknown }[] = [];
    const repo: DiscoveryRepository = {
      findById: async () => discovery,
      findNearby: async () => [],
      findNearbyWithDetails: async () => [],
      findByPlace: async () => [],
      save: async () => {},
      delete: async () => {},
      update: async (id, changes) => {
        updateCalls.push({ id, changes });
      },
    };
    return { repo, updateCalls };
  }

  describe("UpdateDiscovery", () => {
    it("updates price/quantity/note and refreshes the TTL for the owner", async () => {
      const discovery = makeDiscovery();
      const { repo, updateCalls } = makeRepo(discovery);
      const uc = new UpdateDiscovery(repo, nullLog);

      const before = Date.now();
      const result = await uc.execute(
        "d1",
        { priceBrl: 12.5, quantity: 2, note: "preço baixou" },
        "owner",
      );

      expect(result.price.cents).toBe(1250);
      expect(result.quantity).toBe(2);
      expect(result.note).toBe("preço baixou");
      expect(result.expiresAt.getTime()).toBeGreaterThan(discovery.expiresAt.getTime());
      expect(result.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(updateCalls).toHaveLength(1);
      expect(updateCalls[0]!.id).toBe("d1");
    });

    it("throws NotFoundError when the discovery does not exist", async () => {
      const { repo } = makeRepo(null);
      const uc = new UpdateDiscovery(repo, nullLog);

      await expect(
        uc.execute("missing", { priceBrl: 1, quantity: 1 }, "owner"),
      ).rejects.toThrow(NotFoundError);
    });

    it("throws ForbiddenError when the caller is not the current reporter", async () => {
      const discovery = makeDiscovery({ reporterId: "owner" });
      const { repo } = makeRepo(discovery);
      const uc = new UpdateDiscovery(repo, nullLog);

      await expect(
        uc.execute("d1", { priceBrl: 1, quantity: 1 }, "someone-else"),
      ).rejects.toThrow(ForbiddenError);
    });

    it("throws NotFoundError when the discovery has expired", async () => {
      const past = new Date(Date.now() - 1000 * 60 * 60 * 48); // 48h ago
      const discovery = makeDiscovery({ createdAt: past });
      const { repo } = makeRepo(discovery);
      const uc = new UpdateDiscovery(repo, nullLog);

      await expect(
        uc.execute("d1", { priceBrl: 1, quantity: 1 }, "owner"),
      ).rejects.toThrow(NotFoundError);
    });
  });
  ```

- [ ] **Step 3: Run the tests to verify they fail**

  Run: `pnpm --filter @aonde-tem/api test -- update-discovery`
  Expected: FAIL — `Cannot find module './update-discovery.js'`

- [ ] **Step 4: Implement `UpdateDiscovery`**

  Create `apps/api/src/modules/discovery/application/update-discovery.ts`:

  ```ts
  import {
    Discovery,
    Price,
    ForbiddenError,
    NotFoundError,
    DISCOVERY_DEFAULT_TTL_MS,
    type DiscoveryRepository,
    type Logger,
  } from "@aonde-tem/domain";
  import type { UpdateDiscoveryDto } from "@aonde-tem/contracts";

  export class UpdateDiscovery {
    constructor(
      private readonly discoveries: DiscoveryRepository,
      private readonly log: Logger,
    ) {}

    async execute(id: string, dto: UpdateDiscoveryDto, userId: string): Promise<Discovery> {
      const existing = await this.discoveries.findById(id);
      if (!existing) throw new NotFoundError(`Discovery ${id} not found`);
      if (existing.reporterId !== userId) {
        throw new ForbiddenError("You can only edit your own reports");
      }
      if (!existing.isFresh()) throw new NotFoundError(`Discovery ${id} not found`);

      const price = Price.create(dto.priceBrl);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + DISCOVERY_DEFAULT_TTL_MS);

      const updated = Discovery.create({
        id: existing.id,
        productId: existing.productId,
        placeId: existing.placeId,
        price,
        quantity: dto.quantity,
        reporterId: existing.reporterId,
        coords: existing.coords,
        note: dto.note,
        createdAt: now,
        expiresAt,
      });

      await this.discoveries.update(id, { price, quantity: dto.quantity, note: dto.note, expiresAt });

      this.log.info({ discoveryId: id }, "discovery updated");
      return updated;
    }
  }
  ```

  This imports `UpdateDiscoveryDto` from `@aonde-tem/contracts`, which does not exist yet — add the
  minimal type now so this task compiles standalone. Create
  `packages/contracts/src/discovery-update.ts`:

  ```ts
  import { z } from "zod";

  export const updateDiscoverySchema = z.object({
    priceBrl: z.number().positive().max(99_999.99),
    quantity: z.number().int().min(1),
    note: z.string().max(500).optional(),
  });
  export type UpdateDiscoveryDto = z.infer<typeof updateDiscoverySchema>;

  export const updateDiscoveryResponseSchema = z.object({
    id: z.string().uuid(),
    priceBrl: z.number(),
    quantity: z.number().int(),
    note: z.string().nullable(),
    createdAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
  });
  export type UpdateDiscoveryResponse = z.infer<typeof updateDiscoveryResponseSchema>;
  ```

  Modify `packages/contracts/src/index.ts` — add the export next to the sibling discovery file:

  ```ts
  export * from "./place.js";
  export * from "./errors.js";
  export * from "./discovery.js";
  export * from "./auth.js";
  export * from "./product.js";
  export * from "./discovery-create.js";
  export * from "./discovery-update.js";
  export * from "./flag.js";
  ```

- [ ] **Step 5: Run the tests to verify they pass**

  Run: `pnpm --filter @aonde-tem/api test -- update-discovery`
  Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

  ```bash
  git add packages/domain/src/repositories/discovery-repository.ts \
    packages/contracts/src/discovery-update.ts packages/contracts/src/index.ts \
    apps/api/src/modules/discovery/application/update-discovery.ts \
    apps/api/src/modules/discovery/application/update-discovery.test.ts
  git commit -m "feat(api): add UpdateDiscovery use case with ownership/freshness checks"
  ```

- [ ] **Step 7: Write the failing tests for `DeleteDiscovery`**

  Create `apps/api/src/modules/discovery/application/delete-discovery.test.ts`:

  ```ts
  import { DeleteDiscovery } from "./delete-discovery.js";
  import {
    Discovery,
    Price,
    Coordinates,
    ForbiddenError,
    NotFoundError,
    type DiscoveryRepository,
    type Logger,
  } from "@aonde-tem/domain";

  const nullLog: Logger = {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    child: () => nullLog,
  };

  const coords = Coordinates.create(-23.55, -46.63);

  function makeDiscovery(overrides: Partial<Parameters<typeof Discovery.create>[0]> = {}): Discovery {
    return Discovery.create({
      id: "d1",
      productId: "p1",
      placeId: "pl1",
      price: Price.create(9.99),
      quantity: 5,
      reporterId: "owner",
      coords,
      ...overrides,
    });
  }

  function makeRepo(discovery: Discovery | null) {
    const deleteCalls: string[] = [];
    const repo: DiscoveryRepository = {
      findById: async () => discovery,
      findNearby: async () => [],
      findNearbyWithDetails: async () => [],
      findByPlace: async () => [],
      save: async () => {},
      update: async () => {},
      delete: async (id) => {
        deleteCalls.push(id);
      },
    };
    return { repo, deleteCalls };
  }

  describe("DeleteDiscovery", () => {
    it("deletes the discovery for its current owner", async () => {
      const discovery = makeDiscovery();
      const { repo, deleteCalls } = makeRepo(discovery);
      const uc = new DeleteDiscovery(repo, nullLog);

      await uc.execute("d1", "owner");

      expect(deleteCalls).toEqual(["d1"]);
    });

    it("throws NotFoundError when the discovery does not exist", async () => {
      const { repo } = makeRepo(null);
      const uc = new DeleteDiscovery(repo, nullLog);

      await expect(uc.execute("missing", "owner")).rejects.toThrow(NotFoundError);
    });

    it("throws ForbiddenError when the caller is not the current reporter", async () => {
      const discovery = makeDiscovery({ reporterId: "owner" });
      const { repo } = makeRepo(discovery);
      const uc = new DeleteDiscovery(repo, nullLog);

      await expect(uc.execute("d1", "someone-else")).rejects.toThrow(ForbiddenError);
    });

    it("throws NotFoundError when the discovery has expired", async () => {
      const past = new Date(Date.now() - 1000 * 60 * 60 * 48);
      const discovery = makeDiscovery({ createdAt: past });
      const { repo } = makeRepo(discovery);
      const uc = new DeleteDiscovery(repo, nullLog);

      await expect(uc.execute("d1", "owner")).rejects.toThrow(NotFoundError);
    });
  });
  ```

- [ ] **Step 8: Run the tests to verify they fail**

  Run: `pnpm --filter @aonde-tem/api test -- delete-discovery`
  Expected: FAIL — `Cannot find module './delete-discovery.js'`

- [ ] **Step 9: Implement `DeleteDiscovery`**

  Create `apps/api/src/modules/discovery/application/delete-discovery.ts`:

  ```ts
  import {
    ForbiddenError,
    NotFoundError,
    type DiscoveryRepository,
    type Logger,
  } from "@aonde-tem/domain";

  export class DeleteDiscovery {
    constructor(
      private readonly discoveries: DiscoveryRepository,
      private readonly log: Logger,
    ) {}

    async execute(id: string, userId: string): Promise<void> {
      const existing = await this.discoveries.findById(id);
      if (!existing) throw new NotFoundError(`Discovery ${id} not found`);
      if (existing.reporterId !== userId) {
        throw new ForbiddenError("You can only delete your own reports");
      }
      if (!existing.isFresh()) throw new NotFoundError(`Discovery ${id} not found`);

      await this.discoveries.delete(id);
      this.log.info({ discoveryId: id }, "discovery deleted");
    }
  }
  ```

- [ ] **Step 10: Run the tests to verify they pass**

  Run: `pnpm --filter @aonde-tem/api test -- delete-discovery`
  Expected: PASS (4 tests)

- [ ] **Step 11: Commit**

  ```bash
  git add apps/api/src/modules/discovery/application/delete-discovery.ts \
    apps/api/src/modules/discovery/application/delete-discovery.test.ts
  git commit -m "feat(api): add DeleteDiscovery use case with ownership/freshness checks"
  ```

---

## Task 2: API — `PATCH`/`DELETE /discoveries/:id`

**Files:**
- Modify: `apps/api/src/modules/discovery/infrastructure/prisma-discovery.repository.ts`
- Modify: `apps/api/src/modules/discovery/presentation/discovery.controller.ts`
- Modify: `apps/api/src/modules/discovery/discovery.module.ts`
- Create: `apps/api/src/modules/discovery/discovery-mutations.controller.spec.ts`

**Interfaces:**
- Consumes: `UpdateDiscovery`/`DeleteDiscovery` from Task 1; `updateDiscoverySchema`,
  `UpdateDiscoveryResponse` from `@aonde-tem/contracts`; `JwtAuthGuard` (existing,
  `apps/api/src/modules/auth/guards/jwt-auth.guard.ts`).
- Produces: `PATCH /discoveries/:id` (200 `UpdateDiscoveryResponse` | 400 | 401 | 403 | 404),
  `DELETE /discoveries/:id` (204 | 401 | 403 | 404). `PrismaDiscoveryRepository.update()` and the
  `findById`-excludes-hidden fix, consumed by Task 3's `findByPlace` reporterId change (same file).

- [ ] **Step 1: Write the failing integration test**

  Create `apps/api/src/modules/discovery/discovery-mutations.controller.spec.ts`:

  ```ts
  import { Test } from "@nestjs/testing";
  import { INestApplication } from "@nestjs/common";
  import { JwtService } from "@nestjs/jwt";
  import { randomUUID } from "node:crypto";
  import request from "supertest";
  import { AppModule } from "../../app.module.js";
  import { AllExceptionsFilter } from "../../shared/errors/all-exceptions.filter.js";
  import { PrismaService } from "../../shared/prisma.service.js";

  describe("Discovery edit/delete (integration)", () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let jwt: JwtService;

    const ownerId = randomUUID();
    const otherId = randomUUID();
    const productId = randomUUID();
    const placeId = randomUUID();
    const updateTargetId = randomUUID();
    const deleteTargetId = randomUUID();

    let ownerToken: string;
    let otherToken: string;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
      app = moduleRef.createNestApplication();
      app.setGlobalPrefix("api");
      app.useGlobalFilters(new AllExceptionsFilter());
      await app.init();

      prisma = moduleRef.get(PrismaService);
      jwt = moduleRef.get(JwtService);

      ownerToken = jwt.sign({ sub: ownerId, email: `owner-${ownerId}@test.dev`, role: "user" });
      otherToken = jwt.sign({ sub: otherId, email: `other-${otherId}@test.dev`, role: "user" });

      await prisma.user.create({
        data: { id: ownerId, email: `owner-${ownerId}@test.dev`, role: "user" },
      });
      await prisma.user.create({
        data: { id: otherId, email: `other-${otherId}@test.dev`, role: "user" },
      });
      await prisma.$executeRaw`
        INSERT INTO products (id, name, "normalizedKey", "createdById")
        VALUES (${productId}, 'Produto Teste Edicao', ${"produto-teste-edicao-" + productId}, ${ownerId})
      `;
      await prisma.$executeRaw`
        INSERT INTO places (id, name, location, "createdById")
        VALUES (${placeId}, 'Loja Teste Edicao', ST_MakePoint(-46.6, -23.5)::geography, ${ownerId})
      `;

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      for (const id of [updateTargetId, deleteTargetId]) {
        await prisma.$executeRaw`
          INSERT INTO discoveries (id, "productId", "placeId", price, quantity, "reporterId", location, "expiresAt")
          VALUES (${id}, ${productId}, ${placeId}, 9.99, 5, ${ownerId}, ST_MakePoint(-46.6, -23.5)::geography, ${expiresAt})
        `;
      }
    });

    afterAll(async () => {
      await prisma.$executeRaw`DELETE FROM discoveries WHERE "placeId" = ${placeId}`;
      await prisma.$executeRaw`DELETE FROM places WHERE id = ${placeId}`;
      await prisma.$executeRaw`DELETE FROM products WHERE id = ${productId}`;
      await prisma.user.delete({ where: { id: ownerId } });
      await prisma.user.delete({ where: { id: otherId } });
      await app.close();
    });

    it("PATCH without a token returns 401", async () => {
      await request(app.getHttpServer())
        .patch(`/api/discoveries/${updateTargetId}`)
        .send({ priceBrl: 8.5, quantity: 3 })
        .expect(401);
    });

    it("PATCH as a non-owner returns 403", async () => {
      await request(app.getHttpServer())
        .patch(`/api/discoveries/${updateTargetId}`)
        .set("Authorization", `Bearer ${otherToken}`)
        .send({ priceBrl: 8.5, quantity: 3 })
        .expect(403);
    });

    it("PATCH with an invalid price returns 400", async () => {
      await request(app.getHttpServer())
        .patch(`/api/discoveries/${updateTargetId}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ priceBrl: -1, quantity: 3 })
        .expect(400);
    });

    it("PATCH as the owner updates the report and refreshes expiresAt", async () => {
      const before = await prisma.discovery.findUniqueOrThrow({ where: { id: updateTargetId } });

      const res = await request(app.getHttpServer())
        .patch(`/api/discoveries/${updateTargetId}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ priceBrl: 8.5, quantity: 3, note: "preço baixou" })
        .expect(200);

      expect(res.body.priceBrl).toBe(8.5);
      expect(res.body.quantity).toBe(3);
      expect(res.body.note).toBe("preço baixou");
      expect(new Date(res.body.expiresAt).getTime()).toBeGreaterThan(before.expiresAt.getTime());
    });

    it("PATCH on an unknown id returns 404", async () => {
      await request(app.getHttpServer())
        .patch(`/api/discoveries/${randomUUID()}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ priceBrl: 1, quantity: 1 })
        .expect(404);
    });

    it("DELETE as a non-owner returns 403", async () => {
      await request(app.getHttpServer())
        .delete(`/api/discoveries/${deleteTargetId}`)
        .set("Authorization", `Bearer ${otherToken}`)
        .expect(403);
    });

    it("DELETE as the owner returns 204, and the report stops being editable", async () => {
      await request(app.getHttpServer())
        .delete(`/api/discoveries/${deleteTargetId}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .patch(`/api/discoveries/${deleteTargetId}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ priceBrl: 1, quantity: 1 })
        .expect(404);
    });
  });
  ```

- [ ] **Step 2: Run the test to verify it fails**

  Run: `pnpm --filter @aonde-tem/api test -- discovery-mutations`
  Expected: FAIL — 404s on `PATCH`/`DELETE` (routes don't exist yet) instead of the expected statuses

- [ ] **Step 3: Fix `findById` to exclude hidden rows, and add `update()`**

  Modify `apps/api/src/modules/discovery/infrastructure/prisma-discovery.repository.ts` —
  in `findById`, change:

  ```ts
    async findById(id: string): Promise<Discovery | null> {
      const row = await this.prisma.discovery.findUnique({
        where: { id },
      });
      if (!row) return null;
  ```

  to:

  ```ts
    async findById(id: string): Promise<Discovery | null> {
      const row = await this.prisma.discovery.findUnique({
        where: { id },
      });
      if (!row || row.hiddenAt) return null;
  ```

  Then add a new `update` method (placed next to `save`/`delete`):

  ```ts
    async update(
      id: string,
      changes: { price: Price; quantity: number; note?: string; expiresAt: Date },
    ): Promise<void> {
      await this.prisma.$executeRaw`
        UPDATE discoveries
        SET
          price       = ${changes.price.cents / 100},
          quantity    = ${changes.quantity},
          note        = ${changes.note ?? null},
          "expiresAt" = ${changes.expiresAt}
        WHERE id = ${id}
      `;
    }
  ```

- [ ] **Step 4: Wire the use cases into `DiscoveryModule`**

  Modify `apps/api/src/modules/discovery/discovery.module.ts` — add imports and providers:

  ```ts
  import { Module } from "@nestjs/common";
  import type { DiscoveryRepository, Logger, ProductRepository } from "@aonde-tem/domain";
  import { PrismaService } from "../../shared/prisma.service.js";
  import { PinoLoggerAdapter, LOGGER } from "../../shared/logging/pino-logger.adapter.js";
  import { PrismaDiscoveryRepository, PlaceUpsertServiceImpl } from "./infrastructure/prisma-discovery.repository.js";
  import type { DiscoveryRepositoryWithPlace } from "./application/create-discovery.js";
  import { FindNearbyDiscoveries } from "./application/find-nearby-discoveries.js";
  import { CreateDiscovery } from "./application/create-discovery.js";
  import { UpdateDiscovery } from "./application/update-discovery.js";
  import { DeleteDiscovery } from "./application/delete-discovery.js";
  import { DiscoveryController } from "./presentation/discovery.controller.js";
  import { AuthModule } from "../auth/auth.module.js";
  import { ProductModule } from "../product/product.module.js";

  const DISCOVERY_REPOSITORY = Symbol("DiscoveryRepository");

  @Module({
    imports: [AuthModule, ProductModule],
    controllers: [DiscoveryController],
    providers: [
      PrismaService,
      { provide: LOGGER, useClass: PinoLoggerAdapter },
      { provide: DISCOVERY_REPOSITORY, useClass: PrismaDiscoveryRepository },
      PlaceUpsertServiceImpl,
      {
        provide: FindNearbyDiscoveries,
        useFactory: (repo: DiscoveryRepository, log: Logger) =>
          new FindNearbyDiscoveries(repo, log),
        inject: [DISCOVERY_REPOSITORY, LOGGER],
      },
      {
        provide: CreateDiscovery,
        useFactory: (
          repo: DiscoveryRepositoryWithPlace,
          products: ProductRepository,
          log: Logger,
        ) => new CreateDiscovery(repo, products, log),
        inject: [DISCOVERY_REPOSITORY, "ProductRepository", LOGGER],
      },
      {
        provide: UpdateDiscovery,
        useFactory: (repo: DiscoveryRepository, log: Logger) => new UpdateDiscovery(repo, log),
        inject: [DISCOVERY_REPOSITORY, LOGGER],
      },
      {
        provide: DeleteDiscovery,
        useFactory: (repo: DiscoveryRepository, log: Logger) => new DeleteDiscovery(repo, log),
        inject: [DISCOVERY_REPOSITORY, LOGGER],
      },
    ],
  })
  export class DiscoveryModule {}
  ```

- [ ] **Step 5: Add the `PATCH`/`DELETE` routes**

  Modify `apps/api/src/modules/discovery/presentation/discovery.controller.ts` — update the imports
  and constructor, and add the two new handlers:

  ```ts
  import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Query,
    Body,
    Param,
    ParseUUIDPipe,
    Req,
    Inject,
    BadRequestException,
    UseGuards,
    HttpCode,
  } from "@nestjs/common";
  import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
  import { ZodError } from "zod";
  import {
    nearbyDiscoveriesQuerySchema,
    type NearbyDiscoveriesResponse,
    createDiscoverySchema,
    type CreateDiscoveryResponse,
    updateDiscoverySchema,
    type UpdateDiscoveryResponse,
  } from "@aonde-tem/contracts";
  import { Coordinates } from "@aonde-tem/domain";
  import { FindNearbyDiscoveries } from "../application/find-nearby-discoveries.js";
  import { CreateDiscovery } from "../application/create-discovery.js";
  import { UpdateDiscovery } from "../application/update-discovery.js";
  import { DeleteDiscovery } from "../application/delete-discovery.js";
  import { CreateProduct } from "../../product/application/create-product.js";
  import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard.js";

  @Controller("discoveries")
  export class DiscoveryController {
    constructor(
      @Inject(FindNearbyDiscoveries) private readonly findNearby: FindNearbyDiscoveries,
      @Inject(CreateDiscovery) private readonly createDiscovery: CreateDiscovery,
      @Inject(CreateProduct) private readonly createProduct: CreateProduct,
      @Inject(UpdateDiscovery) private readonly updateDiscovery: UpdateDiscovery,
      @Inject(DeleteDiscovery) private readonly deleteDiscovery: DeleteDiscovery,
    ) {}

    @Get("nearby")
    async nearby(@Query() rawQuery: unknown): Promise<NearbyDiscoveriesResponse> {
      let query: ReturnType<typeof nearbyDiscoveriesQuerySchema.parse>;
      try {
        query = nearbyDiscoveriesQuerySchema.parse(rawQuery);
      } catch (err) {
        if (err instanceof ZodError) {
          throw new BadRequestException(err.flatten());
        }
        throw err;
      }

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

    @Post()
    @UseGuards(ThrottlerGuard, JwtAuthGuard)
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    async create(@Body() body: unknown, @Req() req: Request & { user: { sub: string } }): Promise<CreateDiscoveryResponse> {
      let dto: ReturnType<typeof createDiscoverySchema.parse>;
      try {
        dto = createDiscoverySchema.parse(body);
      } catch (err) {
        if (err instanceof ZodError) {
          throw new BadRequestException(err.flatten());
        }
        throw err;
      }

      const reporterId = req.user.sub;

      // If productId is not provided, create or find the product by name
      let productId = dto.productId;
      if (!productId) {
        const product = await this.createProduct.execute(dto.productName!, reporterId);
        productId = product.id;
      }

      const discovery = await this.createDiscovery.execute(
        { ...dto, productId },
        reporterId,
      );

      return {
        id: discovery.id,
        productId: discovery.productId,
        placeId: discovery.placeId,
        createdAt: discovery.createdAt.toISOString(),
      };
    }

    @Patch(":id")
    @UseGuards(JwtAuthGuard)
    async update(
      @Param("id", ParseUUIDPipe) id: string,
      @Body() body: unknown,
      @Req() req: Request & { user: { sub: string } },
    ): Promise<UpdateDiscoveryResponse> {
      let dto: ReturnType<typeof updateDiscoverySchema.parse>;
      try {
        dto = updateDiscoverySchema.parse(body);
      } catch (err) {
        if (err instanceof ZodError) {
          throw new BadRequestException(err.flatten());
        }
        throw err;
      }

      const updated = await this.updateDiscovery.execute(id, dto, req.user.sub);

      return {
        id: updated.id,
        priceBrl: updated.price.cents / 100,
        quantity: updated.quantity,
        note: updated.note ?? null,
        createdAt: updated.createdAt.toISOString(),
        expiresAt: updated.expiresAt.toISOString(),
      };
    }

    @Delete(":id")
    @UseGuards(JwtAuthGuard)
    @HttpCode(204)
    async remove(
      @Param("id", ParseUUIDPipe) id: string,
      @Req() req: Request & { user: { sub: string } },
    ): Promise<void> {
      await this.deleteDiscovery.execute(id, req.user.sub);
    }
  }
  ```

- [ ] **Step 6: Run the test to verify it passes**

  Run: `pnpm --filter @aonde-tem/api test -- discovery-mutations`
  Expected: PASS (8 tests)

- [ ] **Step 7: Run the full API test suite to check for regressions**

  Run: `pnpm --filter @aonde-tem/api test`
  Expected: PASS — in particular `discovery.controller.spec.ts` (unaffected, `findById`'s behavior
  change only excludes rows nothing else currently reads through that path)

- [ ] **Step 8: Commit**

  ```bash
  git add apps/api/src/modules/discovery/infrastructure/prisma-discovery.repository.ts \
    apps/api/src/modules/discovery/discovery.module.ts \
    apps/api/src/modules/discovery/presentation/discovery.controller.ts \
    apps/api/src/modules/discovery/discovery-mutations.controller.spec.ts
  git commit -m "feat(api): add PATCH/DELETE /discoveries/:id for owner-only edit/delete"
  ```

---

## Task 3: API — `isMine` on `GET /places/:id`

**Files:**
- Create: `apps/api/src/modules/auth/guards/optional-jwt-auth.guard.ts`
- Create: `apps/api/src/modules/auth/guards/optional-jwt-auth.guard.test.ts`
- Modify: `packages/contracts/src/place.ts`
- Modify: `apps/api/src/modules/discovery/infrastructure/prisma-discovery.repository.ts`
- Modify: `apps/api/src/modules/place/presentation/place.controller.ts`
- Create: `apps/api/src/modules/place/presentation/place.controller.test.ts`
- Modify: `apps/api/src/modules/place/place.module.ts`
- Create: `apps/api/src/modules/place/place.controller.spec.ts`

**Interfaces:**
- Consumes: `JwtPayload` type (existing, exported from `jwt-auth.guard.ts`); `NearbyDiscoveryRow`
  (Task 1, now has optional `reporterId`).
- Produces: `OptionalJwtAuthGuard` (consumed by `PlaceModule`); `toDiscoveryItem(row, requestingUserId?)`
  pure function (consumed by `PlaceController`, and by Task 4's frontend indirectly via the response
  shape); `isMine: boolean` on every item of `PlaceWithDiscoveriesResponse.discoveries` (consumed by
  Task 4's `PlaceModal`).

- [ ] **Step 1: Write the failing guard unit test**

  Create `apps/api/src/modules/auth/guards/optional-jwt-auth.guard.test.ts`:

  ```ts
  import { OptionalJwtAuthGuard } from "./optional-jwt-auth.guard.js";
  import type { JwtService } from "@nestjs/jwt";
  import type { ExecutionContext } from "@nestjs/common";

  function makeContext(headers: Record<string, string>) {
    const req: { headers: Record<string, string>; user?: unknown } = { headers };
    const context = {
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;
    return { context, req };
  }

  describe("OptionalJwtAuthGuard", () => {
    it("allows requests with no Authorization header and leaves user undefined", () => {
      const jwt = { verify: jest.fn() } as unknown as JwtService;
      const guard = new OptionalJwtAuthGuard(jwt);
      const { context, req } = makeContext({});

      expect(guard.canActivate(context)).toBe(true);
      expect(jwt.verify).not.toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });

    it("sets req.user from a valid Bearer token", () => {
      const payload = { sub: "u1", email: "a@b.com", role: "user" };
      const jwt = { verify: jest.fn().mockReturnValue(payload) } as unknown as JwtService;
      const guard = new OptionalJwtAuthGuard(jwt);
      const { context, req } = makeContext({ authorization: "Bearer good-token" });

      expect(guard.canActivate(context)).toBe(true);
      expect(req.user).toEqual(payload);
    });

    it("allows an invalid Bearer token through anonymously", () => {
      const jwt = {
        verify: jest.fn(() => {
          throw new Error("invalid");
        }),
      } as unknown as JwtService;
      const guard = new OptionalJwtAuthGuard(jwt);
      const { context, req } = makeContext({ authorization: "Bearer bad-token" });

      expect(guard.canActivate(context)).toBe(true);
      expect(req.user).toBeUndefined();
    });
  });
  ```

- [ ] **Step 2: Run the test to verify it fails**

  Run: `pnpm --filter @aonde-tem/api test -- optional-jwt-auth`
  Expected: FAIL — `Cannot find module './optional-jwt-auth.guard.js'`

- [ ] **Step 3: Implement `OptionalJwtAuthGuard`**

  Create `apps/api/src/modules/auth/guards/optional-jwt-auth.guard.ts`:

  ```ts
  import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
  import { JwtService } from "@nestjs/jwt";
  import type { JwtPayload } from "./jwt-auth.guard.js";

  @Injectable()
  export class OptionalJwtAuthGuard implements CanActivate {
    constructor(private readonly jwt: JwtService) {}

    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest();
      const auth: string | undefined = req.headers["authorization"];
      if (!auth?.startsWith("Bearer ")) return true;
      try {
        req.user = this.jwt.verify<JwtPayload>(auth.slice(7));
      } catch {
        // Invalid/expired token on an optionally-authenticated route: proceed
        // anonymously rather than rejecting, since auth isn't required here.
      }
      return true;
    }
  }
  ```

- [ ] **Step 4: Run the test to verify it passes**

  Run: `pnpm --filter @aonde-tem/api test -- optional-jwt-auth`
  Expected: PASS (3 tests)

- [ ] **Step 5: Add `isMine` to the place contract, and `reporterId` to `findByPlace`**

  Modify `packages/contracts/src/place.ts` — add `isMine` to `placeDiscoveryItemSchema`:

  ```ts
  export const placeDiscoveryItemSchema = z.object({
    id: z.string().uuid(),
    productId: z.string().uuid(),
    productName: z.string(),
    priceBrl: z.number(),
    quantity: z.number().int(),
    note: z.string().nullable(),
    isMine: z.boolean(),
    createdAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    ageMinutes: z.number().int(),
  });
  export type PlaceDiscoveryItem = z.infer<typeof placeDiscoveryItemSchema>;
  ```

  Modify `apps/api/src/modules/discovery/infrastructure/prisma-discovery.repository.ts` — in
  `findByPlace`, add `reporterId` to both the raw `SELECT` and the interface it's typed against
  (`RawDiscoveryRow`, declared near the top of the file):

  ```ts
  interface RawDiscoveryRow {
    id: string;
    productId: string;
    productName: string;
    placeId: string;
    placeName: string;
    price: string; // Decimal comes back as string from raw query
    quantity: number;
    note: string | null;
    reporterId?: string;
    lat: number;
    lng: number;
    distanceMeters: number;
    createdAt: Date;
    expiresAt: Date;
  }
  ```

  Then in `findByPlace`'s query and mapping:

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
          d."reporterId",
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
        priceBrl: Number.parseFloat(r.price),
        quantity: r.quantity,
        note: r.note,
        reporterId: r.reporterId,
        lat: r.lat,
        lng: r.lng,
        distanceMeters: 0,
        createdAt: r.createdAt,
        expiresAt: r.expiresAt,
      }));
    }
  ```

  (`findNearbyWithDetails`, just above it in the same file, is unchanged — it doesn't select or map
  `reporterId`, which is fine since `NearbyDiscoveryRow.reporterId` is optional.)

- [ ] **Step 6: Write the failing unit test for the response-shaping helper**

  Create `apps/api/src/modules/place/presentation/place.controller.test.ts`:

  ```ts
  import { toDiscoveryItem } from "./place.controller.js";
  import type { NearbyDiscoveryRow } from "@aonde-tem/domain";

  function makeRow(overrides: Partial<NearbyDiscoveryRow> = {}): NearbyDiscoveryRow {
    return {
      id: "d1",
      productId: "p1",
      productName: "Arroz 5kg",
      placeId: "pl1",
      placeName: "Loja",
      priceBrl: 9.99,
      quantity: 3,
      note: null,
      reporterId: "owner",
      lat: -23.5,
      lng: -46.6,
      distanceMeters: 0,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 3_600_000),
      ...overrides,
    };
  }

  describe("toDiscoveryItem", () => {
    it("marks isMine true when the requesting user matches reporterId", () => {
      const item = toDiscoveryItem(makeRow({ reporterId: "u1" }), "u1");
      expect(item.isMine).toBe(true);
    });

    it("marks isMine false for a different user", () => {
      const item = toDiscoveryItem(makeRow({ reporterId: "u1" }), "u2");
      expect(item.isMine).toBe(false);
    });

    it("marks isMine false for an anonymous (undefined) requester", () => {
      const item = toDiscoveryItem(makeRow({ reporterId: "u1" }), undefined);
      expect(item.isMine).toBe(false);
    });

    it("never includes reporterId on the returned item", () => {
      const item = toDiscoveryItem(makeRow({ reporterId: "u1" }), "u1");
      expect(item).not.toHaveProperty("reporterId");
    });
  });
  ```

- [ ] **Step 7: Run the test to verify it fails**

  Run: `pnpm --filter @aonde-tem/api test -- place.controller.test`
  Expected: FAIL — `toDiscoveryItem` is not exported from `place.controller.ts`

- [ ] **Step 8: Extract `toDiscoveryItem` and wire the optional guard into `PlaceController`**

  Modify `apps/api/src/modules/place/presentation/place.controller.ts`:

  ```ts
  import { Controller, Get, Post, Body, Query, Param, Inject, ParseUUIDPipe, Req, UseGuards } from "@nestjs/common";
  import {
    createPlaceSchema,
    nearbyQuerySchema,
    type PlaceResponse,
    type PlaceDiscoveryItem,
    type PlaceWithDiscoveriesResponse,
  } from "@aonde-tem/contracts";
  import { Place, type NearbyDiscoveryRow } from "@aonde-tem/domain";
  import { FindNearbyPlaces } from "../application/find-nearby-places.js";
  import { CreatePlace } from "../application/create-place.js";
  import { FindPlaceWithDiscoveries } from "../application/find-place-with-discoveries.js";
  import { OptionalJwtAuthGuard } from "../../auth/guards/optional-jwt-auth.guard.js";

  function toResponse(p: Place): PlaceResponse {
    return {
      id: p.id,
      name: p.name,
      category: p.category,
      address: p.address,
      coords: { lat: p.coords.lat, lng: p.coords.lng },
    };
  }

  export function toDiscoveryItem(
    r: NearbyDiscoveryRow,
    requestingUserId?: string,
  ): PlaceDiscoveryItem {
    return {
      id: r.id,
      productId: r.productId,
      productName: r.productName,
      priceBrl: r.priceBrl,
      quantity: r.quantity,
      note: r.note,
      isMine: r.reporterId !== undefined && r.reporterId === requestingUserId,
      createdAt: r.createdAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
      ageMinutes: Math.floor((Date.now() - r.createdAt.getTime()) / 60_000),
    };
  }

  @Controller("places")
  export class PlaceController {
    constructor(
      @Inject(FindNearbyPlaces) private readonly findNearby: FindNearbyPlaces,
      @Inject(CreatePlace) private readonly createPlace: CreatePlace,
      @Inject(FindPlaceWithDiscoveries)
      private readonly findWithDiscoveries: FindPlaceWithDiscoveries,
    ) {}

    @Get("nearby")
    async nearby(@Query() query: unknown): Promise<PlaceResponse[]> {
      const { lat, lng, radius } = nearbyQuerySchema.parse(query);
      const places = await this.findNearby.execute({ lat, lng, radius });
      return places.map(toResponse);
    }

    @Get(":id")
    @UseGuards(OptionalJwtAuthGuard)
    async getWithDiscoveries(
      @Param("id", ParseUUIDPipe) id: string,
      @Req() req: Request & { user?: { sub: string } },
    ): Promise<PlaceWithDiscoveriesResponse> {
      const { place, rows } = await this.findWithDiscoveries.execute(id);
      return {
        id: place.id,
        name: place.name,
        address: place.address,
        coords: { lat: place.coords.lat, lng: place.coords.lng },
        discoveries: rows.map((r) => toDiscoveryItem(r, req.user?.sub)),
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

- [ ] **Step 9: Import `AuthModule` in `PlaceModule`**

  Modify `apps/api/src/modules/place/place.module.ts`:

  ```ts
  import { Module } from "@nestjs/common";
  import type { PlaceRepository, Logger } from "@aonde-tem/domain";
  import { PrismaService } from "../../shared/prisma.service.js";
  import { PinoLoggerAdapter, LOGGER } from "../../shared/logging/pino-logger.adapter.js";
  import { PostgisPlaceRepository } from "./infrastructure/postgis-place.repository.js";
  import { FindNearbyPlaces } from "./application/find-nearby-places.js";
  import { CreatePlace } from "./application/create-place.js";
  import {
    FindPlaceWithDiscoveries,
    type DiscoveryByPlaceFinder,
  } from "./application/find-place-with-discoveries.js";
  import { PrismaDiscoveryRepository } from "../discovery/infrastructure/prisma-discovery.repository.js";
  import { PlaceController } from "./presentation/place.controller.js";
  import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard.js";
  import { AuthModule } from "../auth/auth.module.js";

  const PLACE_REPOSITORY = Symbol("PlaceRepository");
  const DISCOVERY_FINDER = Symbol("DiscoveryByPlaceFinder");

  @Module({
    imports: [AuthModule],
    controllers: [PlaceController],
    providers: [
      PrismaService,
      { provide: LOGGER, useClass: PinoLoggerAdapter },
      { provide: PLACE_REPOSITORY, useClass: PostgisPlaceRepository },
      // A read-only instance of PrismaDiscoveryRepository used only for findByPlace.
      { provide: DISCOVERY_FINDER, useClass: PrismaDiscoveryRepository },
      OptionalJwtAuthGuard,
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

- [ ] **Step 10: Run the unit test to verify it passes**

  Run: `pnpm --filter @aonde-tem/api test -- place.controller.test`
  Expected: PASS (4 tests)

- [ ] **Step 11: Write the failing end-to-end `isMine` integration test**

  Create `apps/api/src/modules/place/place.controller.spec.ts`:

  ```ts
  import { Test } from "@nestjs/testing";
  import { INestApplication } from "@nestjs/common";
  import { JwtService } from "@nestjs/jwt";
  import { randomUUID } from "node:crypto";
  import request from "supertest";
  import { AppModule } from "../../app.module.js";
  import { AllExceptionsFilter } from "../../shared/errors/all-exceptions.filter.js";
  import { PrismaService } from "../../shared/prisma.service.js";

  describe("GET /places/:id — isMine (integration)", () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let jwt: JwtService;

    const ownerId = randomUUID();
    const productId = randomUUID();
    const placeId = randomUUID();
    const discoveryId = randomUUID();
    let ownerToken: string;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
      app = moduleRef.createNestApplication();
      app.setGlobalPrefix("api");
      app.useGlobalFilters(new AllExceptionsFilter());
      await app.init();

      prisma = moduleRef.get(PrismaService);
      jwt = moduleRef.get(JwtService);
      ownerToken = jwt.sign({ sub: ownerId, email: `owner-${ownerId}@test.dev`, role: "user" });

      await prisma.user.create({
        data: { id: ownerId, email: `owner-${ownerId}@test.dev`, role: "user" },
      });
      await prisma.$executeRaw`
        INSERT INTO products (id, name, "normalizedKey", "createdById")
        VALUES (${productId}, 'Produto Teste IsMine', ${"produto-teste-ismine-" + productId}, ${ownerId})
      `;
      await prisma.$executeRaw`
        INSERT INTO places (id, name, location, "createdById")
        VALUES (${placeId}, 'Loja Teste IsMine', ST_MakePoint(-46.6, -23.5)::geography, ${ownerId})
      `;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await prisma.$executeRaw`
        INSERT INTO discoveries (id, "productId", "placeId", price, quantity, "reporterId", location, "expiresAt")
        VALUES (${discoveryId}, ${productId}, ${placeId}, 4.5, 2, ${ownerId}, ST_MakePoint(-46.6, -23.5)::geography, ${expiresAt})
      `;
    });

    afterAll(async () => {
      await prisma.$executeRaw`DELETE FROM discoveries WHERE id = ${discoveryId}`;
      await prisma.$executeRaw`DELETE FROM places WHERE id = ${placeId}`;
      await prisma.$executeRaw`DELETE FROM products WHERE id = ${productId}`;
      await prisma.user.delete({ where: { id: ownerId } });
      await app.close();
    });

    function findItem(body: { discoveries: { id: string; isMine: boolean }[] }) {
      const item = body.discoveries.find((d) => d.id === discoveryId);
      if (!item) throw new Error("fixture discovery not found in response");
      return item;
    }

    it("marks the item isMine:false for an anonymous request", async () => {
      const res = await request(app.getHttpServer()).get(`/api/places/${placeId}`).expect(200);
      expect(findItem(res.body).isMine).toBe(false);
    });

    it("marks the item isMine:true when authenticated as the reporter", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/places/${placeId}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .expect(200);
      expect(findItem(res.body).isMine).toBe(true);
    });

    it("marks the item isMine:false for a different authenticated user", async () => {
      const otherToken = jwt.sign({ sub: randomUUID(), email: "other@test.dev", role: "user" });
      const res = await request(app.getHttpServer())
        .get(`/api/places/${placeId}`)
        .set("Authorization", `Bearer ${otherToken}`)
        .expect(200);
      expect(findItem(res.body).isMine).toBe(false);
    });
  });
  ```

- [ ] **Step 12: Run the test to verify it passes**

  Run: `pnpm --filter @aonde-tem/api test -- place.controller.spec`
  Expected: PASS (3 tests)

- [ ] **Step 13: Run the full API test suite to check for regressions**

  Run: `pnpm --filter @aonde-tem/api test`
  Expected: PASS

- [ ] **Step 14: Commit**

  ```bash
  git add apps/api/src/modules/auth/guards/optional-jwt-auth.guard.ts \
    apps/api/src/modules/auth/guards/optional-jwt-auth.guard.test.ts \
    packages/contracts/src/place.ts \
    apps/api/src/modules/discovery/infrastructure/prisma-discovery.repository.ts \
    apps/api/src/modules/place/presentation/place.controller.ts \
    apps/api/src/modules/place/presentation/place.controller.test.ts \
    apps/api/src/modules/place/place.module.ts \
    apps/api/src/modules/place/place.controller.spec.ts
  git commit -m "feat(api): expose isMine on place discoveries via optional auth"
  ```

---

## Task 4: Frontend — edit/delete controls in `PlaceModal`

**Files:**
- Modify: `apps/web/src/features/report/api/report.api.ts`
- Create: `apps/web/src/features/report/ui/EditDiscoverySheet.tsx`
- Create: `apps/web/src/features/report/ui/EditDiscoverySheet.test.tsx`
- Create: `apps/web/src/features/report/ui/DeleteDiscoveryConfirmSheet.tsx`
- Modify: `apps/web/src/features/map/ui/PlaceModal.tsx`
- Create: `apps/web/src/features/map/ui/PlaceModal.test.tsx`

**Interfaces:**
- Consumes: `updateDiscoveryResponseSchema`, `UpdateDiscoveryDto`, `PlaceDiscoveryItem` (all from
  `@aonde-tem/contracts`, Tasks 1–3); `http`/`ApiError` (`@/shared/api/http.js`); `BottomSheet`
  (`@/shared/ui/BottomSheet.js`); `PriceInput` (`./PriceInput.js`); `useAppStore` (`accessToken`,
  `pushToast`).
- Produces: `useUpdateDiscovery()`, `useDeleteDiscovery()` mutation hooks; `EditDiscoverySheet` and
  `DeleteDiscoveryConfirmSheet` components, both consumed by `PlaceModal`.

- [ ] **Step 1: Add the mutation hooks**

  Modify `apps/web/src/features/report/api/report.api.ts`:

  ```tsx
  import { useMutation, useQueryClient } from "@tanstack/react-query";
  import { z } from "zod";
  import {
    createDiscoveryResponseSchema,
    updateDiscoveryResponseSchema,
    type CreateDiscoveryDto,
    type UpdateDiscoveryDto,
  } from "@aonde-tem/contracts";
  import { http } from "@/shared/api/http.js";
  import { useAppStore } from "@/app/store/index.js";

  export function useCreateDiscovery() {
    const qc = useQueryClient();
    const accessToken = useAppStore((s) => s.accessToken);

    return useMutation({
      mutationFn: async (dto: CreateDiscoveryDto) => {
        return http("/api/discoveries", createDiscoveryResponseSchema, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(dto),
        });
      },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["discoveries", "nearby"] });
      },
    });
  }

  export function useUpdateDiscovery() {
    const qc = useQueryClient();
    const accessToken = useAppStore((s) => s.accessToken);

    return useMutation({
      mutationFn: async ({ id, dto }: { id: string; dto: UpdateDiscoveryDto }) => {
        return http(`/api/discoveries/${id}`, updateDiscoveryResponseSchema, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(dto),
        });
      },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["discoveries", "nearby"] });
        qc.invalidateQueries({ queryKey: ["places"] });
      },
    });
  }

  export function useDeleteDiscovery() {
    const qc = useQueryClient();
    const accessToken = useAppStore((s) => s.accessToken);

    return useMutation({
      mutationFn: async (id: string) => {
        return http(`/api/discoveries/${id}`, z.unknown(), {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["discoveries", "nearby"] });
        qc.invalidateQueries({ queryKey: ["places"] });
      },
    });
  }
  ```

- [ ] **Step 2: Write the failing test for `EditDiscoverySheet`**

  Create `apps/web/src/features/report/ui/EditDiscoverySheet.test.tsx`:

  ```tsx
  import { render, screen, fireEvent, waitFor } from "@testing-library/react";
  import { EditDiscoverySheet } from "./EditDiscoverySheet.js";
  import { useUpdateDiscovery } from "../api/report.api.js";
  import { useAppStore } from "@/app/store/index.js";

  jest.mock("../api/report.api.js", () => ({
    useUpdateDiscovery: jest.fn(),
  }));
  const mockUseUpdateDiscovery = useUpdateDiscovery as jest.MockedFunction<typeof useUpdateDiscovery>;

  jest.mock("@/app/store/index.js");
  const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

  function setup(mutateAsync = jest.fn().mockResolvedValue({})) {
    mockUseUpdateDiscovery.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateDiscovery>);

    const pushToast = jest.fn();
    mockUseAppStore.mockImplementation((selector: (s: { pushToast: typeof pushToast }) => unknown) =>
      selector({ pushToast } as never),
    );

    const onClose = jest.fn();
    render(
      <EditDiscoverySheet
        discoveryId="d1"
        initialPriceBrl={9.99}
        initialQuantity={5}
        initialNote="nota original"
        onClose={onClose}
      />,
    );
    return { mutateAsync, pushToast, onClose };
  }

  describe("EditDiscoverySheet", () => {
    it("pre-fills price, quantity and note from the current item", () => {
      setup();
      expect(screen.getByDisplayValue("9,99")).toBeInTheDocument();
      expect(screen.getByLabelText("Quantidade")).toHaveValue(5);
      expect(screen.getByLabelText("Nota (opcional)")).toHaveValue("nota original");
    });

    it("submits the edited fields and closes on success", async () => {
      const { mutateAsync, onClose } = setup();
      fireEvent.change(screen.getByLabelText("Quantidade"), { target: { value: "2" } });

      fireEvent.click(screen.getByText("Salvar"));

      await waitFor(() =>
        expect(mutateAsync).toHaveBeenCalledWith({
          id: "d1",
          dto: { priceBrl: 9.99, quantity: 2, note: "nota original" },
        }),
      );
      await waitFor(() => expect(onClose).toHaveBeenCalled());
    });

    it("shows an error toast and stays open when the mutation fails", async () => {
      const mutateAsync = jest.fn().mockRejectedValue(new Error("boom"));
      const { pushToast, onClose } = setup(mutateAsync);

      fireEvent.click(screen.getByText("Salvar"));

      await waitFor(() =>
        expect(pushToast).toHaveBeenCalledWith(
          expect.objectContaining({ tone: "error" }),
        ),
      );
      expect(onClose).not.toHaveBeenCalled();
    });
  });
  ```

- [ ] **Step 3: Run the test to verify it fails**

  Run: `pnpm --filter @aonde-tem/web test -- EditDiscoverySheet`
  Expected: FAIL — `Cannot find module './EditDiscoverySheet.js'`

- [ ] **Step 4: Implement `EditDiscoverySheet`**

  Create `apps/web/src/features/report/ui/EditDiscoverySheet.tsx`:

  ```tsx
  import { useState } from "react";
  import { useUpdateDiscovery } from "../api/report.api.js";
  import { BottomSheet } from "@/shared/ui/BottomSheet.js";
  import { PriceInput } from "./PriceInput.js";
  import { useAppStore } from "@/app/store/index.js";

  interface Props {
    readonly discoveryId: string;
    readonly initialPriceBrl: number;
    readonly initialQuantity: number;
    readonly initialNote: string | null;
    readonly onClose: () => void;
  }

  export function EditDiscoverySheet({
    discoveryId,
    initialPriceBrl,
    initialQuantity,
    initialNote,
    onClose,
  }: Props) {
    const [priceBrl, setPriceBrl] = useState<number | null>(initialPriceBrl);
    const [quantity, setQuantity] = useState(initialQuantity);
    const [note, setNote] = useState(initialNote ?? "");
    const updateDiscovery = useUpdateDiscovery();
    const pushToast = useAppStore((s) => s.pushToast);

    async function submit() {
      if (!priceBrl) return;
      try {
        await updateDiscovery.mutateAsync({
          id: discoveryId,
          dto: { priceBrl, quantity, note: note || undefined },
        });
        pushToast({ tone: "success", message: "Relato atualizado." });
        onClose();
      } catch {
        pushToast({ tone: "error", message: "Não foi possível atualizar o relato." });
      }
    }

    return (
      <BottomSheet label="Editar relato" onClose={onClose} className="p-6 pb-10">
        <h2 className="text-lg font-bold text-text mb-4">Editar relato</h2>

        <div className="flex flex-col gap-4 mb-6">
          <PriceInput value={priceBrl} onChange={setPriceBrl} />

          <div>
            <label htmlFor="edit-quantity" className="block text-sm font-medium text-text mb-1">
              Quantidade
            </label>
            <input
              id="edit-quantity"
              type="number"
              inputMode="numeric"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number.parseInt(e.target.value) || 1))}
              className="w-full border border-border rounded-control px-4 py-3 text-text text-base outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label htmlFor="edit-note" className="block text-sm font-medium text-text mb-1">
              Nota (opcional)
            </label>
            <input
              id="edit-note"
              type="text"
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border border-border rounded-control px-4 py-3 text-text text-base outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!priceBrl || updateDiscovery.isPending}
          className="w-full bg-brand text-white font-semibold py-3 rounded-control min-h-11 disabled:opacity-50"
        >
          {updateDiscovery.isPending ? "Salvando…" : "Salvar"}
        </button>
        <button type="button" onClick={onClose} className="w-full text-text-muted py-2 mt-2 min-h-11">
          Cancelar
        </button>
      </BottomSheet>
    );
  }
  ```

- [ ] **Step 5: Run the test to verify it passes**

  Run: `pnpm --filter @aonde-tem/web test -- EditDiscoverySheet`
  Expected: PASS (3 tests)

- [ ] **Step 6: Implement `DeleteDiscoveryConfirmSheet` (no separate test — exercised via `PlaceModal.test.tsx` in Step 9)**

  Create `apps/web/src/features/report/ui/DeleteDiscoveryConfirmSheet.tsx`:

  ```tsx
  import { useDeleteDiscovery } from "../api/report.api.js";
  import { BottomSheet } from "@/shared/ui/BottomSheet.js";
  import { useAppStore } from "@/app/store/index.js";

  interface Props {
    readonly discoveryId: string;
    readonly onClose: () => void;
    readonly onDeleted: () => void;
  }

  export function DeleteDiscoveryConfirmSheet({ discoveryId, onClose, onDeleted }: Props) {
    const deleteDiscovery = useDeleteDiscovery();
    const pushToast = useAppStore((s) => s.pushToast);

    async function confirm() {
      try {
        await deleteDiscovery.mutateAsync(discoveryId);
        pushToast({ tone: "success", message: "Relato excluído." });
        onDeleted();
      } catch {
        pushToast({ tone: "error", message: "Não foi possível excluir o relato." });
      }
    }

    return (
      <BottomSheet label="Excluir relato" onClose={onClose} className="p-6 pb-10">
        <h2 className="text-lg font-bold text-text mb-2">Excluir este relato?</h2>
        <p className="text-text-muted text-sm mb-6">Esta ação não pode ser desfeita.</p>
        <button
          type="button"
          onClick={confirm}
          disabled={deleteDiscovery.isPending}
          className="w-full bg-error text-white font-semibold py-3 rounded-control min-h-11 disabled:opacity-50"
        >
          {deleteDiscovery.isPending ? "Excluindo…" : "Excluir"}
        </button>
        <button type="button" onClick={onClose} className="w-full text-text-muted py-2 mt-2 min-h-11">
          Cancelar
        </button>
      </BottomSheet>
    );
  }
  ```

- [ ] **Step 7: Write the failing test for `PlaceModal`'s edit/delete controls**

  Create `apps/web/src/features/map/ui/PlaceModal.test.tsx`:

  ```tsx
  import { render, screen, fireEvent } from "@testing-library/react";
  import { PlaceModal } from "./PlaceModal.js";
  import { usePlaceDiscoveries } from "../api/place.queries.js";
  import { useAppStore } from "@/app/store/index.js";
  import type { AppStore } from "@/app/store/types.js";

  jest.mock("../api/place.queries.js", () => ({
    usePlaceDiscoveries: jest.fn(),
  }));
  const mockUsePlaceDiscoveries = usePlaceDiscoveries as jest.MockedFunction<
    typeof usePlaceDiscoveries
  >;

  jest.mock("@/app/store/index.js");
  const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

  jest.mock("../../flag/ui/FlagSheet.js", () => ({
    FlagSheet: () => <div data-testid="flag-sheet" />,
  }));
  jest.mock("../../report/ui/EditDiscoverySheet.js", () => ({
    EditDiscoverySheet: () => <div data-testid="edit-sheet" />,
  }));
  jest.mock("../../report/ui/DeleteDiscoveryConfirmSheet.js", () => ({
    DeleteDiscoveryConfirmSheet: () => <div data-testid="delete-sheet" />,
  }));

  function setupStore(isAuthenticated: boolean) {
    const store = {
      clearSelectedPlace: jest.fn(),
      isAuthenticated: () => isAuthenticated,
    };
    mockUseAppStore.mockImplementation((selector: (s: AppStore) => unknown) =>
      selector(store as unknown as AppStore),
    );
    return store;
  }

  function mockData(discoveries: Array<Record<string, unknown>>) {
    mockUsePlaceDiscoveries.mockReturnValue({
      data: {
        id: "place-1",
        name: "Loja Teste",
        address: undefined,
        coords: { lat: -23.5, lng: -46.6 },
        discoveries,
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof usePlaceDiscoveries>);
  }

  const mineItem = {
    id: "d1",
    productId: "p1",
    productName: "Arroz 5kg",
    priceBrl: 9.99,
    quantity: 3,
    note: null,
    isMine: true,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    ageMinutes: 5,
  };

  const othersItem = { ...mineItem, id: "d2", isMine: false };

  describe("PlaceModal — edit/delete controls", () => {
    it("shows Editar/Excluir for a report the user owns", () => {
      setupStore(true);
      mockData([mineItem]);
      render(<PlaceModal placeId="place-1" onFlyTo={jest.fn()} />);

      expect(screen.getByText("Editar")).toBeInTheDocument();
      expect(screen.getByText("Excluir")).toBeInTheDocument();
    });

    it("hides Editar/Excluir for a report the user does not own", () => {
      setupStore(true);
      mockData([othersItem]);
      render(<PlaceModal placeId="place-1" onFlyTo={jest.fn()} />);

      expect(screen.queryByText("Editar")).not.toBeInTheDocument();
      expect(screen.queryByText("Excluir")).not.toBeInTheDocument();
    });

    it("opens the edit sheet when Editar is clicked", () => {
      setupStore(true);
      mockData([mineItem]);
      render(<PlaceModal placeId="place-1" onFlyTo={jest.fn()} />);

      fireEvent.click(screen.getByText("Editar"));
      expect(screen.getByTestId("edit-sheet")).toBeInTheDocument();
    });

    it("opens the delete confirm sheet when Excluir is clicked", () => {
      setupStore(true);
      mockData([mineItem]);
      render(<PlaceModal placeId="place-1" onFlyTo={jest.fn()} />);

      fireEvent.click(screen.getByText("Excluir"));
      expect(screen.getByTestId("delete-sheet")).toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 8: Run the test to verify it fails**

  Run: `pnpm --filter @aonde-tem/web test -- PlaceModal`
  Expected: FAIL — no "Editar"/"Excluir" text found (buttons don't exist yet)

- [ ] **Step 9: Wire the buttons and sheets into `PlaceModal`**

  Modify `apps/web/src/features/map/ui/PlaceModal.tsx`:

  ```tsx
  import { useState } from "react";
  import { useAppStore } from "@/app/store/index.js";
  import { usePlaceDiscoveries } from "../api/place.queries.js";
  import { FlagSheet } from "../../flag/ui/FlagSheet.js";
  import { EditDiscoverySheet } from "../../report/ui/EditDiscoverySheet.js";
  import { DeleteDiscoveryConfirmSheet } from "../../report/ui/DeleteDiscoveryConfirmSheet.js";
  import { BottomSheet } from "@/shared/ui/BottomSheet.js";
  import type { PlaceDiscoveryItem } from "@aonde-tem/contracts";

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
    readonly placeId: string;
    readonly onFlyTo: (coords: { lat: number; lng: number }) => void;
  }

  export function PlaceModal({ placeId, onFlyTo }: Props) {
    const clearSelected = useAppStore((s) => s.clearSelectedPlace);
    const isAuthenticated = useAppStore((s) => s.isAuthenticated());
    const [flagTargetId, setFlagTargetId] = useState<string | null>(null);
    const [editTarget, setEditTarget] = useState<PlaceDiscoveryItem | null>(null);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    const { data, isLoading, isError, refetch } = usePlaceDiscoveries(placeId);

    return (
      <BottomSheet
        label={data?.name ? `Detalhes de ${data.name}` : "Detalhes do local"}
        onClose={clearSelected}
        className="pb-8 animate-slide-up max-h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-4 pb-2 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-text leading-snug">
              {data?.name ?? "Carregando…"}
            </h2>
            {data?.address && <p className="text-text-muted text-sm mt-0.5">{data.address}</p>}
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
          {isLoading && <p className="text-text-muted text-sm py-4 text-center">Carregando itens…</p>}

          {!isLoading && isError && (
            <div className="py-4 text-center">
              <p className="text-text-muted text-sm mb-2">Não foi possível carregar os itens.</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="text-accent text-sm font-semibold min-h-11 px-4"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {!isLoading && !isError && data?.discoveries.length === 0 && (
            <p className="text-text-muted text-sm py-4 text-center">
              Nenhum item disponível aqui no momento.
            </p>
          )}

          {data?.discoveries.map((item) => (
            <div key={item.id} className="py-3 border-b border-border last:border-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-text wrap-break-word min-w-0">{item.productName}</span>
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
              {item.note && <p className="text-text-muted text-sm mt-1 italic">"{item.note}"</p>}
              {(isAuthenticated || item.isMine) && (
                <div className="flex items-center gap-3 mt-1">
                  {isAuthenticated && (
                    <button
                      type="button"
                      onClick={() => setFlagTargetId(item.id)}
                      className="text-text-muted text-xs min-h-11 flex items-center"
                    >
                      Denunciar
                    </button>
                  )}
                  {item.isMine && (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditTarget(item)}
                        className="text-accent text-xs font-semibold min-h-11 flex items-center"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTargetId(item.id)}
                        className="text-error text-xs font-semibold min-h-11 flex items-center"
                      >
                        Excluir
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer actions */}
        {data?.coords && (
          <div className="px-4 pt-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                clearSelected();
                onFlyTo(data.coords);
              }}
              className="block w-full text-center bg-brand text-white font-semibold py-3 rounded-control"
            >
              Ver no mapa
            </button>
          </div>
        )}

        {flagTargetId && (
          <FlagSheet
            targetType="discovery"
            targetId={flagTargetId}
            onClose={() => setFlagTargetId(null)}
          />
        )}

        {editTarget && (
          <EditDiscoverySheet
            discoveryId={editTarget.id}
            initialPriceBrl={editTarget.priceBrl}
            initialQuantity={editTarget.quantity}
            initialNote={editTarget.note}
            onClose={() => setEditTarget(null)}
          />
        )}

        {deleteTargetId && (
          <DeleteDiscoveryConfirmSheet
            discoveryId={deleteTargetId}
            onClose={() => setDeleteTargetId(null)}
            onDeleted={() => setDeleteTargetId(null)}
          />
        )}
      </BottomSheet>
    );
  }
  ```

- [ ] **Step 10: Run the test to verify it passes**

  Run: `pnpm --filter @aonde-tem/web test -- PlaceModal`
  Expected: PASS (4 tests)

- [ ] **Step 11: Run the full web test suite to check for regressions**

  Run: `pnpm --filter @aonde-tem/web test`
  Expected: PASS

- [ ] **Step 12: Typecheck both packages**

  Run: `pnpm --filter @aonde-tem/api typecheck && pnpm --filter @aonde-tem/web typecheck && pnpm --filter @aonde-tem/contracts typecheck && pnpm --filter @aonde-tem/domain typecheck`
  Expected: no errors

- [ ] **Step 13: Commit**

  ```bash
  git add apps/web/src/features/report/api/report.api.ts \
    apps/web/src/features/report/ui/EditDiscoverySheet.tsx \
    apps/web/src/features/report/ui/EditDiscoverySheet.test.tsx \
    apps/web/src/features/report/ui/DeleteDiscoveryConfirmSheet.tsx \
    apps/web/src/features/map/ui/PlaceModal.tsx \
    apps/web/src/features/map/ui/PlaceModal.test.tsx
  git commit -m "feat(web): let users edit/delete their own reports from the place sheet"
  ```

---

## Task 5: Documentation

**Files:**
- Modify: `docs/backlog/BACKLOG.en.md`
- Modify: `docs/backlog/BACKLOG.pt.md`
- Modify: `docs/specs/report-discovery.spec.md`
- Modify: `docs/PRODUCT.en.md`
- Modify: `docs/PRODUTO.pt.md`

No tests apply to this task — it's documentation only. Each step is a direct edit.

- [ ] **Step 1: Mark AT-136 done in the English backlog**

  Modify `docs/backlog/BACKLOG.en.md` (line 234) — change the `AT-136` row's status column from
  `Todo` to `✅ Done` (matching the label already used by e.g. the `AT-001` row):

  ```diff
  -| AT-136 | **Edit/delete your own** recent discovery | feature | P1 | 2 | S | Todo | R-03 |
  +| AT-136 | **Edit/delete your own** recent discovery | feature | P1 | 2 | S | ✅ Done | R-03 |
  ```

- [ ] **Step 2: Mirror the same row change in the Portuguese backlog**

  Modify `docs/backlog/BACKLOG.pt.md` — find the equivalent `AT-136` row and flip its status column
  to `✅ Feito` (matching the label already used by e.g. the `AT-001` row in that file).

- [ ] **Step 3: Finalize the P1 bullet in the report-discovery spec**

  Modify `docs/specs/report-discovery.spec.md` — replace:

  ```md
  - **Edit/delete your own recent discovery (R-03)** — let people fix mistakes.
  ```

  with:

  ```md
  - **Edit/delete your own recent discovery (R-03)** — let people fix mistakes. Ownership means the
    *current* reporter (`reporterId`), which can move between users through the existing re-report
    upsert. Editable/deletable while `hiddenAt IS NULL` and `expiresAt > now` — no separate time
    window. Editing price/quantity/note refreshes `createdAt`/`expiresAt` like a new report.
    `PATCH`/`DELETE /discoveries/:id`, owner-only. See
    [`2026-07-05-edit-delete-own-report-design.md`](../superpowers/specs/2026-07-05-edit-delete-own-report-design.md).
  ```

- [ ] **Step 4: Document the capability in the product docs**

  Modify `docs/PRODUCT.en.md` — find the section describing the report/contribute flow (the same
  place that documents "report a discovery") and add one sentence: users can edit or delete a report
  they currently own from the place detail sheet, for as long as it's still active (not expired or
  removed).

  Modify `docs/PRODUTO.pt.md` — add the equivalent sentence in Portuguese in the same section, so the
  two docs stay in sync per this repo's bilingual-docs convention.

- [ ] **Step 5: Commit**

  ```bash
  git add docs/backlog/BACKLOG.en.md docs/backlog/BACKLOG.pt.md docs/specs/report-discovery.spec.md \
    docs/PRODUCT.en.md docs/PRODUTO.pt.md
  git commit -m "docs: mark AT-136 done and document edit/delete own report"
  ```

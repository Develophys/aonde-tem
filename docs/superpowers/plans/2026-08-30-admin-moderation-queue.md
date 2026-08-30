# Admin Moderation Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give an admin a screen at `/admin/denuncias` that lists open flags grouped by the content they target, and lets them remove or dismiss each one.

**Architecture:** The flag backend already exists but is addressed per-flag, which cannot express "this content was flagged five times". Both admin endpoints are replaced by target-scoped ones: `GET /admin/queue` returns one entry per flagged target (a raw SQL group-by with polymorphic left joins), and `PATCH /admin/queue/:targetType/:targetId` resolves every open flag on that target in one action. The web side adds a `features/admin` slice and an `AdminRoute` role gate, both outside the tab-bar shell.

**Tech Stack:** NestJS 10 + Prisma 7 (raw `$queryRaw`), Zod contracts, React 18 + Vite, Tailwind v4 CSS-first tokens, TanStack Query, Zustand, Jest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-30-admin-moderation-queue-design.md`

## Global Constraints

- **Clean Architecture.** `packages/domain` imports nothing framework-specific. Ports live in `packages/domain/src/repositories/`; Prisma implementations live in `apps/api/src/modules/flag/infrastructure/`. Use-cases never touch `PrismaService` directly.
- **Every import of a local TS file ends in `.js`** — this is an ESM/NodeNext codebase. `import { X } from "./x.js"` even though the file is `x.ts`.
- **All ids in the database are `TEXT`, not `uuid`.** Never write `::uuid` in a query. The Zod contracts still validate `targetId` as a UUID because that is what the values are.
- **The `discoveries` price column is `price`, `DECIMAL(10,2)`** — `$queryRaw` returns it as a **string**, so it must be `Number.parseFloat`'d. There is no `priceBrl` column; that is only the contract's name for it.
- **Do not add `.spec.ts` files.** In this repo `*.spec.ts` means a supertest run against the real database, `DATABASE_URL` currently points at the production Neon instance, and those tests are already flaky. New tests are `.test.ts` / `.test.tsx` with in-memory fakes.
- **Touch targets are ≥44×44px, no exceptions**, including on this admin-only screen.
- **Tailwind:** use existing tokens only (`bg-surface`, `border-border`, `text-text-muted`, `text-error`, `rounded-control`, …). No hardcoded hex, no new `@theme` entries.
- **Two-Radius Rule:** `rounded-control` for controls and cards, `rounded-sheet` for sheets. No third radius.
- **Floating-Only Rule:** shadows only on things covering the map. Nothing on this screen covers the map, so nothing on it gets a shadow.
- **One Accent Rule:** this screen's single saturated colour is `error`. Brand green appears nowhere on it.
- Copy is **pt-BR**, verbatim as written in each task.
- Gate for every task: `pnpm lint`, `pnpm typecheck`, `pnpm test`.

---

### Task 1: Queue contracts, read port, and the list use-case

The grouping happens in SQL (Task 2). This task builds the shape that grouping produces and the use-case that turns a raw group into what the screen renders — chiefly composing `targetContext`, the one piece of formatting the spec puts on the server.

**Files:**
- Create: `packages/domain/src/repositories/moderation-queue-reader.ts`
- Modify: `packages/domain/src/index.ts` (add the export)
- Modify: `packages/contracts/src/flag.ts`
- Create: `apps/api/src/modules/flag/application/list-moderation-queue.ts`
- Test: `apps/api/src/modules/flag/application/list-moderation-queue.test.ts`

**Interfaces:**
- Consumes: `FlagReason`, `FlagTargetType`, `Logger` from `@aonde-tem/domain` (all already exist).
- Produces:
  - `ModerationQueueRow` and `ModerationQueueReader` (port, method `findOpenGroupedByTarget(limit?: number): Promise<ModerationQueueRow[]>`) — Task 2 implements this.
  - `ListModerationQueue` class with `execute(): Promise<ModerationQueueEntry[]>` — Task 2 wires it into the controller.
  - `flagReasonSchema`, `flagTargetTypeSchema`, `adminQueueItemSchema`, `adminQueueResponseSchema`, `AdminQueueItem`, `AdminQueueResponse` — Tasks 2, 4 and 5 consume these.

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/modules/flag/application/list-moderation-queue.test.ts`:

```ts
import { ListModerationQueue } from "./list-moderation-queue.js";
import type { Logger, ModerationQueueRow, ModerationQueueReader } from "@aonde-tem/domain";

const nullLog: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  child: () => nullLog,
};

const LATEST = new Date("2026-08-30T12:00:00.000Z");

function row(overrides: Partial<ModerationQueueRow> = {}): ModerationQueueRow {
  return {
    targetType: "discovery",
    targetId: "d1",
    targetName: "Arroz 5kg",
    placeName: "Mercadinho do Zé",
    priceBrl: 24.9,
    flagCount: 1,
    reasons: ["spam"],
    latestComment: null,
    latestReporterEmail: "quem@denunciou.com",
    latestAt: LATEST,
    ...overrides,
  };
}

function makeReader(rows: ModerationQueueRow[]) {
  const calls: (number | undefined)[] = [];
  const reader: ModerationQueueReader = {
    findOpenGroupedByTarget: async (limit?: number) => {
      calls.push(limit);
      return rows;
    },
  };
  return { reader, calls };
}

describe("ListModerationQueue", () => {
  it("describes a flagged discovery with its place and price", async () => {
    const { reader } = makeReader([row()]);

    const [entry] = await new ListModerationQueue(reader, nullLog).execute();

    expect(entry.targetName).toBe("Arroz 5kg");
    expect(entry.targetContext).toBe("Mercadinho do Zé · R$ 24,90");
  });

  it("gives a flagged product no context line — it has no place or price", async () => {
    const { reader } = makeReader([
      row({ targetType: "product", targetId: "p1", placeName: null, priceBrl: null }),
    ]);

    const [entry] = await new ListModerationQueue(reader, nullLog).execute();

    expect(entry.targetContext).toBeNull();
  });

  it("keeps a deleted target's null name instead of dropping the entry", async () => {
    const { reader } = makeReader([row({ targetName: null, placeName: null, priceBrl: null })]);

    const entries = await new ListModerationQueue(reader, nullLog).execute();

    expect(entries).toHaveLength(1);
    expect(entries[0].targetName).toBeNull();
    expect(entries[0].targetContext).toBeNull();
  });

  it("passes every grouped field through, including the flag count and reasons", async () => {
    const { reader } = makeReader([
      row({ flagCount: 3, reasons: ["illegal", "spam"], latestComment: "produto proibido" }),
    ]);

    const [entry] = await new ListModerationQueue(reader, nullLog).execute();

    expect(entry.flagCount).toBe(3);
    expect(entry.reasons).toEqual(["illegal", "spam"]);
    expect(entry.latestComment).toBe("produto proibido");
    expect(entry.latestReporterEmail).toBe("quem@denunciou.com");
    expect(entry.latestAt).toEqual(LATEST);
  });

  it("caps the queue at 100 targets", async () => {
    const { reader, calls } = makeReader([]);

    await new ListModerationQueue(reader, nullLog).execute();

    expect(calls).toEqual([100]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @aonde-tem/api test -- list-moderation-queue`
Expected: FAIL — `Cannot find module './list-moderation-queue.js'`.

- [ ] **Step 3: Add the read port to the domain**

Create `packages/domain/src/repositories/moderation-queue-reader.ts`:

```ts
import type { FlagReason, FlagTargetType } from "../entities/flag";

/**
 * One flagged target with its open flags already collapsed. Grouping happens in the
 * query rather than in memory: the queue is read far more often than it is written,
 * and Postgres counts and de-duplicates reasons in the same pass as the join.
 */
export interface ModerationQueueRow {
  targetType: FlagTargetType;
  targetId: string;
  /** Null when the flagged content no longer exists. */
  targetName: string | null;
  /** Discovery targets only; null for products and for deleted content. */
  placeName: string | null;
  /** Discovery targets only; null for products and for deleted content. */
  priceBrl: number | null;
  flagCount: number;
  /** Distinct reasons across the target's open flags. */
  reasons: FlagReason[];
  latestComment: string | null;
  latestReporterEmail: string;
  latestAt: Date;
}

export interface ModerationQueueReader {
  /** Open flags grouped by target, newest first. */
  findOpenGroupedByTarget(limit?: number): Promise<ModerationQueueRow[]>;
}
```

Add to `packages/domain/src/index.ts`, directly after the `flag-repository` line:

```ts
export * from "./repositories/moderation-queue-reader";
```

- [ ] **Step 4: Write the use-case**

Create `apps/api/src/modules/flag/application/list-moderation-queue.ts`:

```ts
import type {
  FlagReason,
  FlagTargetType,
  Logger,
  ModerationQueueReader,
} from "@aonde-tem/domain";

/** Matches the ceiling the old admin endpoint used. Paging is deliberately out of scope. */
const MODERATION_QUEUE_LIMIT = 100;

export interface ModerationQueueEntry {
  targetType: FlagTargetType;
  targetId: string;
  targetName: string | null;
  /** "Mercadinho do Zé · R$ 24,90" for a discovery; null for a product. */
  targetContext: string | null;
  flagCount: number;
  reasons: FlagReason[];
  latestComment: string | null;
  latestReporterEmail: string;
  latestAt: Date;
}

/**
 * Formatted by hand rather than through Intl: pt-BR currency from Intl inserts a
 * non-breaking space after "R$", which is invisible in the UI but makes every
 * assertion about this string a guessing game.
 */
function brl(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

/**
 * Use case: the open moderation queue, one entry per flagged target.
 *
 * The grouping is the reader's job. What lives here is the one piece of formatting
 * the design puts on the server — the context line — so that the price is rendered
 * in exactly one place instead of being reassembled by every client.
 */
export class ListModerationQueue {
  constructor(
    private readonly queue: ModerationQueueReader,
    private readonly log: Logger,
  ) {}

  async execute(): Promise<ModerationQueueEntry[]> {
    const rows = await this.queue.findOpenGroupedByTarget(MODERATION_QUEUE_LIMIT);

    const entries = rows.map((row) => ({
      targetType: row.targetType,
      targetId: row.targetId,
      targetName: row.targetName,
      targetContext:
        row.placeName && row.priceBrl !== null ? `${row.placeName} · ${brl(row.priceBrl)}` : null,
      flagCount: row.flagCount,
      reasons: row.reasons,
      latestComment: row.latestComment,
      latestReporterEmail: row.latestReporterEmail,
      latestAt: row.latestAt,
    }));

    this.log.info({ targets: entries.length }, "moderation queue listed");
    return entries;
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @aonde-tem/api test -- list-moderation-queue`
Expected: PASS, 5 tests.

- [ ] **Step 6: Rewrite the flag contracts**

Replace the whole of `packages/contracts/src/flag.ts` with:

```ts
import { z } from "zod";

export const flagTargetTypeSchema = z.enum(["product", "discovery"]);
export type FlagTargetTypeDto = z.infer<typeof flagTargetTypeSchema>;

export const flagReasonSchema = z.enum([
  "illegal",
  "inappropriate",
  "spam",
  "wrong_info",
  "other",
]);
export type FlagReasonDto = z.infer<typeof flagReasonSchema>;

export const createFlagSchema = z.object({
  targetType: flagTargetTypeSchema,
  targetId: z.string().uuid(),
  reason: flagReasonSchema,
  comment: z.string().max(500).optional(),
});
export type CreateFlagDto = z.infer<typeof createFlagSchema>;

export const flagResponseSchema = z.object({
  id: z.string().uuid(),
  targetType: flagTargetTypeSchema,
  targetId: z.string(),
  reason: flagReasonSchema,
  status: z.string(),
  createdAt: z.string().datetime(),
});
export type FlagResponse = z.infer<typeof flagResponseSchema>;

/** One flagged target in the admin queue — every open flag on it, collapsed. */
export const adminQueueItemSchema = z.object({
  targetType: flagTargetTypeSchema,
  targetId: z.string().uuid(),
  /** Null when the flagged content no longer exists; the card says "Conteúdo removido". */
  targetName: z.string().nullable(),
  /** "Mercadinho do Zé · R$ 24,90" for a discovery; null for a product. */
  targetContext: z.string().nullable(),
  flagCount: z.number().int().positive(),
  // `.min(1)` rather than `.nonempty()`: the latter types the field as the tuple
  // `[FlagReasonDto, ...FlagReasonDto[]]`, which a plain `FlagReason[]` from the
  // domain cannot be assigned to. Both validate the same thing.
  reasons: z.array(flagReasonSchema).min(1),
  latestComment: z.string().nullable(),
  latestReporterEmail: z.string().email(),
  latestAt: z.string().datetime(),
});
export type AdminQueueItem = z.infer<typeof adminQueueItemSchema>;

export const adminQueueResponseSchema = z.object({ items: z.array(adminQueueItemSchema) });
export type AdminQueueResponse = z.infer<typeof adminQueueResponseSchema>;

export const adminActionSchema = z.object({
  action: z.enum(["hide", "dismiss"]),
});
export type AdminActionDto = z.infer<typeof adminActionSchema>;
```

Note what left: `adminFlagResponseSchema` and `AdminFlagResponse` are **deleted** — the endpoint they described is replaced in Task 2. `admin.controller.ts` still imports `AdminFlagResponse` and will not compile until then; that is expected and is why steps 7 and 8 only build, and do not typecheck the API.

- [ ] **Step 7: Build the changed packages**

Run: `pnpm --filter @aonde-tem/domain build && pnpm --filter @aonde-tem/contracts build`
Expected: both succeed. (`apps/api` and `apps/web` resolve these packages through `dist/`, so a stale build produces confusing "module has no exported member" errors later.)

- [ ] **Step 8: Run the domain and API suites**

Run: `pnpm --filter @aonde-tem/domain test && pnpm --filter @aonde-tem/api test`
Expected: PASS. The API's `.spec.ts` files need a reachable database; if they fail on connection, that is the pre-existing condition noted in Global Constraints — the `.test.ts` files must all pass.

- [ ] **Step 9: Commit**

```bash
git add packages/domain/src/repositories/moderation-queue-reader.ts packages/domain/src/index.ts packages/contracts/src/flag.ts apps/api/src/modules/flag/application/list-moderation-queue.ts apps/api/src/modules/flag/application/list-moderation-queue.test.ts
git commit -m "feat(api): model the moderation queue as flagged targets, not flags"
```

---

### Task 2: Read the queue from Postgres and serve `GET /admin/queue`

**Files:**
- Create: `apps/api/src/modules/flag/infrastructure/prisma-moderation-queue.reader.ts`
- Test: `apps/api/src/modules/flag/infrastructure/prisma-moderation-queue.reader.test.ts`
- Modify: `prisma/schema.prisma` (index on `Flag`)
- Create: `prisma/migrations/<timestamp>_index_flags_status_target/migration.sql` (generated)
- Modify: `apps/api/src/modules/flag/presentation/admin.controller.ts`
- Modify: `apps/api/src/modules/flag/flag.module.ts`

**Interfaces:**
- Consumes: `ModerationQueueRow`, `ModerationQueueReader` (Task 1), `ListModerationQueue` (Task 1), `adminQueueResponseSchema`/`AdminQueueResponse` (Task 1), `PrismaService` and `AdminGuard` (both already exist).
- Produces: `PrismaModerationQueueReader` (class), `toQueueRow` (exported pure mapper, tested here), and the live `GET /admin/queue` endpoint that Task 5 fetches.

- [ ] **Step 1: Write the failing test**

The SQL itself is verified by hand in Step 7 — this repo has no database-free way to test a query, and a `.spec.ts` would hit production. What *is* unit-testable, and what actually breaks in practice, is the row mapping: `$queryRaw` hands back `DECIMAL` as a string and `COUNT(*)` as a `BigInt`.

Create `apps/api/src/modules/flag/infrastructure/prisma-moderation-queue.reader.test.ts`:

```ts
import { toQueueRow, type RawQueueRow } from "./prisma-moderation-queue.reader.js";

const LATEST = new Date("2026-08-30T12:00:00.000Z");

function raw(overrides: Partial<RawQueueRow> = {}): RawQueueRow {
  return {
    targetType: "discovery",
    targetId: "d1",
    targetName: "Arroz 5kg",
    placeName: "Mercadinho do Zé",
    price: "24.90",
    flagCount: 1n,
    reasons: ["spam"],
    latestComment: null,
    latestReporterEmail: "quem@denunciou.com",
    latestAt: LATEST,
    ...overrides,
  };
}

describe("toQueueRow", () => {
  it("parses the DECIMAL price string into a number", () => {
    expect(toQueueRow(raw()).priceBrl).toBe(24.9);
  });

  it("narrows the BigInt count from COUNT(*) to a number", () => {
    const row = toQueueRow(raw({ flagCount: 3n }));
    expect(row.flagCount).toBe(3);
    expect(typeof row.flagCount).toBe("number");
  });

  it("leaves a product target with no place and no price", () => {
    const row = toQueueRow(
      raw({ targetType: "product", targetId: "p1", placeName: null, price: null }),
    );
    expect(row.placeName).toBeNull();
    expect(row.priceBrl).toBeNull();
  });

  it("keeps a deleted target's null name", () => {
    expect(toQueueRow(raw({ targetName: null, price: null })).targetName).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @aonde-tem/api test -- prisma-moderation-queue`
Expected: FAIL — `Cannot find module './prisma-moderation-queue.reader.js'`.

- [ ] **Step 3: Write the reader**

Create `apps/api/src/modules/flag/infrastructure/prisma-moderation-queue.reader.ts`:

```ts
import { Injectable } from "@nestjs/common";
import type {
  FlagReason,
  FlagTargetType,
  ModerationQueueReader,
  ModerationQueueRow,
} from "@aonde-tem/domain";
import { PrismaService } from "../../../shared/prisma.service.js";

/** Exactly what `$queryRaw` hands back: DECIMAL as string, COUNT(*) as BigInt. */
export interface RawQueueRow {
  targetType: string;
  targetId: string;
  targetName: string | null;
  placeName: string | null;
  price: string | null;
  flagCount: bigint;
  reasons: string[];
  latestComment: string | null;
  latestReporterEmail: string;
  latestAt: Date;
}

export function toQueueRow(raw: RawQueueRow): ModerationQueueRow {
  return {
    targetType: raw.targetType as FlagTargetType,
    targetId: raw.targetId,
    targetName: raw.targetName,
    placeName: raw.placeName,
    priceBrl: raw.price === null ? null : Number.parseFloat(raw.price),
    flagCount: Number(raw.flagCount),
    reasons: raw.reasons as FlagReason[],
    latestComment: raw.latestComment,
    latestReporterEmail: raw.latestReporterEmail,
    latestAt: raw.latestAt,
  };
}

@Injectable()
export class PrismaModerationQueueReader implements ModerationQueueReader {
  constructor(private readonly prisma: PrismaService) {}

  async findOpenGroupedByTarget(limit = 100): Promise<ModerationQueueRow[]> {
    // `flags.targetId` is polymorphic with no foreign key — it addresses either
    // products.id or discoveries.id depending on targetType, which Prisma's relation
    // model cannot express. Hence raw SQL with two conditional LEFT JOINs.
    //
    // `latest` is a separate DISTINCT ON pass because the newest flag's comment and
    // reporter are per-row facts, not aggregates: MAX() would give the largest string,
    // not the most recent one.
    //
    // No ::uuid casts anywhere — every id column in this schema is TEXT.
    const rows = await this.prisma.$queryRaw<RawQueueRow[]>`
      WITH latest AS (
        SELECT DISTINCT ON (f."targetType", f."targetId")
               f."targetType", f."targetId", f.comment, f."reporterId", f."createdAt"
          FROM flags f
         WHERE f.status = 'open'
         ORDER BY f."targetType", f."targetId", f."createdAt" DESC
      )
      SELECT
        g."targetType",
        g."targetId",
        COALESCE(tp.name, dp.name)              AS "targetName",
        pl.name                                 AS "placeName",
        d.price::text                           AS price,
        g.flag_count                            AS "flagCount",
        g.reasons                               AS reasons,
        l.comment                               AS "latestComment",
        u.email                                 AS "latestReporterEmail",
        l."createdAt"                           AS "latestAt"
      FROM (
        SELECT f."targetType", f."targetId",
               COUNT(*)                    AS flag_count,
               ARRAY_AGG(DISTINCT f.reason) AS reasons
          FROM flags f
         WHERE f.status = 'open'
         GROUP BY f."targetType", f."targetId"
      ) g
      JOIN latest l
        ON l."targetType" = g."targetType" AND l."targetId" = g."targetId"
      JOIN users u ON u.id = l."reporterId"
      LEFT JOIN products    tp ON g."targetType" = 'product'   AND tp.id = g."targetId"
      LEFT JOIN discoveries d  ON g."targetType" = 'discovery' AND d.id  = g."targetId"
      LEFT JOIN products    dp ON dp.id = d."productId"
      LEFT JOIN places      pl ON pl.id = d."placeId"
      ORDER BY l."createdAt" DESC
      LIMIT ${limit}
    `;

    return rows.map(toQueueRow);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @aonde-tem/api test -- prisma-moderation-queue`
Expected: PASS, 4 tests.

- [ ] **Step 5: Add the index to the schema**

In `prisma/schema.prisma`, inside `model Flag`, add an index line directly above `@@map("flags")`:

```prisma
  @@index([status, targetType, targetId])
  @@map("flags")
```

`flags` currently has no index at all. Every query this feature runs filters on `status` and groups by the other two columns.

- [ ] **Step 6: Generate the migration WITHOUT applying it**

Run: `pnpm --filter @aonde-tem/api prisma migrate dev --create-only --name index_flags_status_target`

> **STOP AND ASK before applying.** `DATABASE_URL` in `.env` points at the **production** Neon database — this was established earlier in the project and is unchanged. `--create-only` writes the migration file and applies nothing. Show the generated SQL to the human partner and let them decide when it runs. Expect a single `CREATE INDEX "flags_status_targetType_targetId_idx" ON "flags"("status", "targetType", "targetId");`.

- [ ] **Step 7: Replace `GET /admin/flags` with `GET /admin/queue`**

In `apps/api/src/modules/flag/presentation/admin.controller.ts`, delete the `listOpenFlags` method entirely and replace the imports and the read endpoint. The `PATCH` method stays untouched in this task — Task 3 replaces it. After this step the file is:

```ts
import { Controller, Get, Patch, Param, Body, UseGuards, NotFoundException } from "@nestjs/common";
import { adminActionSchema, type AdminQueueResponse } from "@aonde-tem/contracts";
import { AdminGuard } from "../guards/admin.guard.js";
import { PrismaFlagRepository } from "../infrastructure/prisma-flag.repository.js";
import { ListModerationQueue } from "../application/list-moderation-queue.js";
import { PrismaService } from "../../../shared/prisma.service.js";

@Controller("admin")
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly flags: PrismaFlagRepository,
    private readonly listQueue: ListModerationQueue,
    private readonly prisma: PrismaService,
  ) {}

  @Get("queue")
  async queue(): Promise<AdminQueueResponse> {
    const entries = await this.listQueue.execute();
    return {
      items: entries.map((e) => ({
        targetType: e.targetType,
        targetId: e.targetId,
        targetName: e.targetName,
        targetContext: e.targetContext,
        flagCount: e.flagCount,
        reasons: e.reasons,
        latestComment: e.latestComment,
        latestReporterEmail: e.latestReporterEmail,
        latestAt: e.latestAt.toISOString(),
      })),
    };
  }

  @Patch("flags/:id")
  async actionFlag(@Param("id") id: string, @Body() body: unknown): Promise<{ ok: boolean }> {
    const dto = adminActionSchema.parse(body);
    const flag = await this.flags.findById(id);
    if (!flag) throw new NotFoundException(`Flag ${id} not found`);

    if (dto.action === "hide") {
      if (flag.targetType === "discovery") {
        await this.prisma.discovery.update({
          where: { id: flag.targetId },
          data: { hiddenAt: new Date() },
        });
      } else if (flag.targetType === "product") {
        await this.prisma.product.update({
          where: { id: flag.targetId },
          data: { status: "blocked" },
        });
      }
      await this.flags.updateStatus(id, "actioned");
    } else {
      await this.flags.updateStatus(id, "dismissed");
    }

    return { ok: true };
  }
}
```

- [ ] **Step 8: Wire the reader and the use-case into the module**

In `apps/api/src/modules/flag/flag.module.ts`, add the imports and providers. The `ModerationQueueReader` port gets its own DI symbol, matching how `FLAG_REPOSITORY` is done in this file:

```ts
import type { FlagRepository, Logger, ModerationQueueReader } from "@aonde-tem/domain";
import { PrismaModerationQueueReader } from "./infrastructure/prisma-moderation-queue.reader.js";
import { ListModerationQueue } from "./application/list-moderation-queue.js";

const FLAG_REPOSITORY = Symbol("FlagRepository");
const MODERATION_QUEUE_READER = Symbol("ModerationQueueReader");
```

and inside `providers`, after the `CreateFlag` factory:

```ts
    { provide: MODERATION_QUEUE_READER, useClass: PrismaModerationQueueReader },
    {
      provide: ListModerationQueue,
      useFactory: (queue: ModerationQueueReader, log: Logger) =>
        new ListModerationQueue(queue, log),
      inject: [MODERATION_QUEUE_READER, LOGGER],
    },
```

- [ ] **Step 9: Typecheck and run the suite**

Run: `pnpm typecheck && pnpm --filter @aonde-tem/api test`
Expected: typecheck PASS (the `AdminFlagResponse` break from Task 1 is now resolved); all `.test.ts` PASS.

- [ ] **Step 10: Verify the SQL against a real database**

Start the API (`pnpm --filter @aonde-tem/api dev`), get an admin token, and call the endpoint:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@aonde-tem.dev","password":"<admin password>"}' | jq -r .accessToken)

curl -s http://localhost:3000/api/admin/queue -H "Authorization: Bearer $TOKEN" | jq
```

Expected: `200` and `{"items":[...]}`. If the database has no open flags the array is empty, which is a valid pass — create one first via `POST /api/flags` with a non-admin token to see a populated row, and check that `targetName`, `targetContext`, `flagCount` and `reasons` are all populated. Flag the *same* target twice and confirm it stays **one** item with `flagCount: 2`.

Also confirm the guard still holds: the same call with a non-admin token must return `403`.

- [ ] **Step 11: Commit**

```bash
git add apps/api/src/modules/flag prisma/schema.prisma prisma/migrations
git commit -m "feat(api): serve the moderation queue grouped by flagged target"
```

---

### Task 3: Action a target — `PATCH /admin/queue/:targetType/:targetId`

The single-flag `PATCH` leaves orphans: remove a product flagged five times and four flags stay `open` pointing at content that is already gone. This task replaces it with an action on the target that resolves all of them.

**Files:**
- Create: `packages/domain/src/repositories/moderatable-content.ts`
- Modify: `packages/domain/src/index.ts`
- Modify: `packages/domain/src/repositories/flag-repository.ts`
- Create: `apps/api/src/modules/flag/application/action-moderation-target.ts`
- Test: `apps/api/src/modules/flag/application/action-moderation-target.test.ts`
- Modify: `apps/api/src/modules/flag/infrastructure/prisma-flag.repository.ts`
- Create: `apps/api/src/modules/flag/infrastructure/prisma-moderatable-content.repository.ts`
- Modify: `apps/api/src/modules/flag/presentation/admin.controller.ts`
- Modify: `apps/api/src/modules/flag/flag.module.ts`

**Interfaces:**
- Consumes: `FlagRepository`, `FlagStatus`, `FlagTargetType`, `NotFoundError`, `Logger` (all exist); `adminActionSchema`, `flagTargetTypeSchema` (Task 1).
- Produces:
  - `ModeratableContentRepository` port — `hideDiscovery(id: string): Promise<void>`, `blockProduct(id: string): Promise<void>`.
  - `FlagRepository.countOpenByTarget(targetType, targetId): Promise<number>` and `FlagRepository.updateStatusByTarget(targetType, targetId, status): Promise<number>`.
  - `ActionModerationTarget` with `execute({ targetType, targetId, action }): Promise<{ resolved: number }>`.
  - The live `PATCH /admin/queue/:targetType/:targetId` endpoint that Task 5 calls.

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/modules/flag/application/action-moderation-target.test.ts`:

```ts
import { ActionModerationTarget } from "./action-moderation-target.js";
import { NotFoundError } from "@aonde-tem/domain";
import type {
  FlagRepository,
  FlagStatus,
  FlagTargetType,
  Logger,
  ModeratableContentRepository,
} from "@aonde-tem/domain";

const nullLog: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  child: () => nullLog,
};

function makeFlags(openCount: number) {
  const bulkCalls: { targetType: FlagTargetType; targetId: string; status: FlagStatus }[] = [];
  const repo = {
    findById: async () => null,
    findOpen: async () => [],
    save: async () => {},
    updateStatus: async () => {},
    countOpenByTarget: async () => openCount,
    updateStatusByTarget: async (
      targetType: FlagTargetType,
      targetId: string,
      status: FlagStatus,
    ) => {
      bulkCalls.push({ targetType, targetId, status });
      return openCount;
    },
  } as unknown as FlagRepository;
  return { repo, bulkCalls };
}

function makeContent() {
  const hidden: string[] = [];
  const blocked: string[] = [];
  const content: ModeratableContentRepository = {
    hideDiscovery: async (id: string) => {
      hidden.push(id);
    },
    blockProduct: async (id: string) => {
      blocked.push(id);
    },
  };
  return { content, hidden, blocked };
}

describe("ActionModerationTarget", () => {
  it("hides a flagged discovery and resolves every open flag on it at once", async () => {
    const { repo, bulkCalls } = makeFlags(3);
    const { content, hidden } = makeContent();

    const result = await new ActionModerationTarget(repo, content, nullLog).execute({
      targetType: "discovery",
      targetId: "d1",
      action: "hide",
    });

    expect(hidden).toEqual(["d1"]);
    expect(bulkCalls).toEqual([{ targetType: "discovery", targetId: "d1", status: "actioned" }]);
    expect(result.resolved).toBe(3);
  });

  it("blocks a flagged product rather than hiding a discovery", async () => {
    const { repo } = makeFlags(1);
    const { content, hidden, blocked } = makeContent();

    await new ActionModerationTarget(repo, content, nullLog).execute({
      targetType: "product",
      targetId: "p1",
      action: "hide",
    });

    expect(blocked).toEqual(["p1"]);
    expect(hidden).toEqual([]);
  });

  it("dismisses without touching the content", async () => {
    const { repo, bulkCalls } = makeFlags(2);
    const { content, hidden, blocked } = makeContent();

    await new ActionModerationTarget(repo, content, nullLog).execute({
      targetType: "discovery",
      targetId: "d1",
      action: "dismiss",
    });

    expect(hidden).toEqual([]);
    expect(blocked).toEqual([]);
    expect(bulkCalls).toEqual([{ targetType: "discovery", targetId: "d1", status: "dismissed" }]);
  });

  it("refuses a target with no open flags instead of hiding content for nothing", async () => {
    const { repo } = makeFlags(0);
    const { content, hidden } = makeContent();

    await expect(
      new ActionModerationTarget(repo, content, nullLog).execute({
        targetType: "discovery",
        targetId: "gone",
        action: "hide",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(hidden).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @aonde-tem/api test -- action-moderation-target`
Expected: FAIL — `Cannot find module './action-moderation-target.js'`.

- [ ] **Step 3: Add the content port and extend the flag port**

Create `packages/domain/src/repositories/moderatable-content.ts`:

```ts
/**
 * The two things moderation can do to content. Deliberately not a generic
 * `hide(targetType, id)`: the two operations are different columns on different
 * tables, and collapsing them would hide that from the caller.
 */
export interface ModeratableContentRepository {
  /** Sets `hiddenAt`, removing the discovery from every read endpoint. */
  hideDiscovery(id: string): Promise<void>;
  /** Sets `status = 'blocked'`, removing the product and its discoveries from reads. */
  blockProduct(id: string): Promise<void>;
}
```

Add to `packages/domain/src/index.ts`, after the `moderation-queue-reader` line:

```ts
export * from "./repositories/moderatable-content";
```

Replace `packages/domain/src/repositories/flag-repository.ts` with:

```ts
import type { Flag, FlagStatus, FlagTargetType } from "../entities/flag";

export interface FlagRepository {
  findById(id: string): Promise<Flag | null>;
  findOpen(limit?: number): Promise<Flag[]>;
  save(flag: Flag): Promise<void>;
  updateStatus(id: string, status: FlagStatus): Promise<void>;
  /** How many flags on this target are still `open`. */
  countOpenByTarget(targetType: FlagTargetType, targetId: string): Promise<number>;
  /**
   * Resolves every `open` flag on a target in one statement, returning how many were
   * updated. Moderation judges the content, so one decision has to settle all of its
   * flags — otherwise removing a five-times-flagged product leaves four open flags
   * pointing at content that is already gone.
   */
  updateStatusByTarget(
    targetType: FlagTargetType,
    targetId: string,
    status: FlagStatus,
  ): Promise<number>;
}
```

- [ ] **Step 4: Write the use-case**

Create `apps/api/src/modules/flag/application/action-moderation-target.ts`:

```ts
import {
  NotFoundError,
  type FlagRepository,
  type FlagTargetType,
  type Logger,
  type ModeratableContentRepository,
} from "@aonde-tem/domain";

export interface ActionModerationTargetCommand {
  targetType: FlagTargetType;
  targetId: string;
  action: "hide" | "dismiss";
}

/**
 * Use case: resolve one flagged target.
 *
 * The order matters. The open-flag check comes first so a stale card cannot hide
 * content that nobody currently objects to, and the content change comes before the
 * flags are resolved so that a failure mid-way leaves the flags open and the queue
 * still showing the work — the opposite order would lose the flag and leave the
 * content up.
 */
export class ActionModerationTarget {
  constructor(
    private readonly flags: FlagRepository,
    private readonly content: ModeratableContentRepository,
    private readonly log: Logger,
  ) {}

  async execute(command: ActionModerationTargetCommand): Promise<{ resolved: number }> {
    const { targetType, targetId, action } = command;

    const open = await this.flags.countOpenByTarget(targetType, targetId);
    if (open === 0) {
      throw new NotFoundError(`No open flags for ${targetType} ${targetId}`);
    }

    if (action === "hide") {
      if (targetType === "discovery") {
        await this.content.hideDiscovery(targetId);
      } else {
        await this.content.blockProduct(targetId);
      }
    }

    const resolved = await this.flags.updateStatusByTarget(
      targetType,
      targetId,
      action === "hide" ? "actioned" : "dismissed",
    );

    this.log.info({ targetType, targetId, action, resolved }, "moderation target actioned");
    return { resolved };
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @aonde-tem/domain build && pnpm --filter @aonde-tem/api test -- action-moderation-target`
Expected: PASS, 4 tests.

- [ ] **Step 6: Implement the two new repository methods**

Append to the class in `apps/api/src/modules/flag/infrastructure/prisma-flag.repository.ts`, after `updateStatus`:

```ts
  async countOpenByTarget(targetType: FlagTargetType, targetId: string): Promise<number> {
    return this.prisma.flag.count({ where: { targetType, targetId, status: "open" } });
  }

  async updateStatusByTarget(
    targetType: FlagTargetType,
    targetId: string,
    status: FlagStatus,
  ): Promise<number> {
    const { count } = await this.prisma.flag.updateMany({
      where: { targetType, targetId, status: "open" },
      data: { status },
    });
    return count;
  }
```

Create `apps/api/src/modules/flag/infrastructure/prisma-moderatable-content.repository.ts`:

```ts
import { Injectable } from "@nestjs/common";
import type { ModeratableContentRepository } from "@aonde-tem/domain";
import { PrismaService } from "../../../shared/prisma.service.js";

@Injectable()
export class PrismaModeratableContentRepository implements ModeratableContentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async hideDiscovery(id: string): Promise<void> {
    await this.prisma.discovery.update({ where: { id }, data: { hiddenAt: new Date() } });
  }

  async blockProduct(id: string): Promise<void> {
    await this.prisma.product.update({ where: { id }, data: { status: "blocked" } });
  }
}
```

- [ ] **Step 7: Replace the endpoint**

In `apps/api/src/modules/flag/presentation/admin.controller.ts`, delete the `actionFlag` method and the now-unused `PrismaFlagRepository` and `PrismaService` constructor dependencies. The file becomes:

```ts
import { Controller, Get, Patch, Param, Body, UseGuards } from "@nestjs/common";
import {
  adminActionSchema,
  flagTargetTypeSchema,
  type AdminQueueResponse,
} from "@aonde-tem/contracts";
import { AdminGuard } from "../guards/admin.guard.js";
import { ListModerationQueue } from "../application/list-moderation-queue.js";
import { ActionModerationTarget } from "../application/action-moderation-target.js";

@Controller("admin")
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly listQueue: ListModerationQueue,
    private readonly actionTarget: ActionModerationTarget,
  ) {}

  @Get("queue")
  async queue(): Promise<AdminQueueResponse> {
    const entries = await this.listQueue.execute();
    return {
      items: entries.map((e) => ({
        targetType: e.targetType,
        targetId: e.targetId,
        targetName: e.targetName,
        targetContext: e.targetContext,
        flagCount: e.flagCount,
        reasons: e.reasons,
        latestComment: e.latestComment,
        latestReporterEmail: e.latestReporterEmail,
        latestAt: e.latestAt.toISOString(),
      })),
    };
  }

  // A bad targetType or body throws ZodError, which AllExceptionsFilter already maps
  // to a 400; NotFoundError from the use-case maps to 404. No try/catch needed here.
  @Patch("queue/:targetType/:targetId")
  async action(
    @Param("targetType") targetType: string,
    @Param("targetId") targetId: string,
    @Body() body: unknown,
  ): Promise<{ ok: boolean; resolved: number }> {
    const { action } = adminActionSchema.parse(body);
    const { resolved } = await this.actionTarget.execute({
      targetType: flagTargetTypeSchema.parse(targetType),
      targetId,
      action,
    });
    return { ok: true, resolved };
  }
}
```

- [ ] **Step 8: Wire the new providers**

In `apps/api/src/modules/flag/flag.module.ts`, add:

```ts
import type {
  FlagRepository,
  Logger,
  ModerationQueueReader,
  ModeratableContentRepository,
} from "@aonde-tem/domain";
import { PrismaModeratableContentRepository } from "./infrastructure/prisma-moderatable-content.repository.js";
import { ActionModerationTarget } from "./application/action-moderation-target.js";

const MODERATABLE_CONTENT = Symbol("ModeratableContentRepository");
```

and in `providers`, after the `ListModerationQueue` factory:

```ts
    { provide: MODERATABLE_CONTENT, useClass: PrismaModeratableContentRepository },
    {
      provide: ActionModerationTarget,
      useFactory: (
        flags: FlagRepository,
        content: ModeratableContentRepository,
        log: Logger,
      ) => new ActionModerationTarget(flags, content, log),
      inject: [FLAG_REPOSITORY, MODERATABLE_CONTENT, LOGGER],
    },
```

- [ ] **Step 9: Typecheck and run the suite**

Run: `pnpm typecheck && pnpm --filter @aonde-tem/api test`
Expected: PASS.

- [ ] **Step 10: Verify against a real database**

With the API running and `$TOKEN` from Task 2 Step 10, flag one discovery twice with a non-admin account, then:

```bash
curl -s -X PATCH "http://localhost:3000/api/admin/queue/discovery/<id>" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"action":"dismiss"}' | jq
```

Expected: `{"ok":true,"resolved":2}` — **2**, not 1, is the whole point of this task. Then `GET /admin/queue` no longer lists that target, and repeating the same PATCH returns `404`. Confirm `{"action":"hide"}` on a discovery makes it disappear from `GET /api/discoveries/nearby`.

- [ ] **Step 11: Commit**

```bash
git add packages/domain apps/api/src/modules/flag
git commit -m "feat(api): resolve every open flag on a target in one moderation action"
```

---

### Task 4: The queue card

A presentational component taking an item and an `onAction` callback. Keeping the mutation out of it is what makes both the card and the page testable without a QueryClient.

**Files:**
- Create: `apps/web/src/shared/model/time.ts`
- Modify: `apps/web/src/features/map/ui/PlaceModal.tsx:13-17` (use the shared helper)
- Create: `apps/web/src/features/admin/ui/QueueCard.tsx`
- Test: `apps/web/src/features/admin/ui/QueueCard.test.tsx`

**Interfaces:**
- Consumes: `AdminQueueItem` (Task 1).
- Produces:
  - `formatAge(minutes: number): string` from `@/shared/model/time.js`.
  - `QueueCard` with props `{ item: AdminQueueItem; onAction: (action: "hide" | "dismiss") => void; isPending: boolean }` — Task 5 renders it.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/features/admin/ui/QueueCard.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import type { AdminQueueItem } from "@aonde-tem/contracts";
import { QueueCard } from "./QueueCard.js";

function item(overrides: Partial<AdminQueueItem> = {}): AdminQueueItem {
  return {
    targetType: "discovery",
    targetId: "00000000-0000-0000-0000-0000000000d1",
    targetName: "Arroz 5kg",
    targetContext: "Mercadinho do Zé · R$ 24,90",
    flagCount: 1,
    reasons: ["spam"],
    latestComment: null,
    latestReporterEmail: "quem@denunciou.com",
    latestAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  } as AdminQueueItem;
}

function setup(overrides: Partial<AdminQueueItem> = {}, isPending = false) {
  const onAction = jest.fn();
  render(<QueueCard item={item(overrides)} onAction={onAction} isPending={isPending} />);
  return { onAction };
}

describe("QueueCard", () => {
  it("shows what was flagged and where", () => {
    setup();
    expect(screen.getByText("Arroz 5kg")).toBeInTheDocument();
    expect(screen.getByText("Mercadinho do Zé · R$ 24,90")).toBeInTheDocument();
  });

  it("names the reporter and how long ago they flagged it", () => {
    setup();
    expect(screen.getByText(/quem@denunciou\.com/)).toBeInTheDocument();
    expect(screen.getByText(/2h atrás/)).toBeInTheDocument();
  });

  it("counts the flags only when there is more than one", () => {
    const { unmount } = render(
      <QueueCard item={item()} onAction={jest.fn()} isPending={false} />,
    );
    expect(screen.queryByText(/denúncias/)).not.toBeInTheDocument();
    unmount();

    render(
      <QueueCard
        item={item({ flagCount: 3, reasons: ["illegal", "spam"] })}
        onAction={jest.fn()}
        isPending={false}
      />,
    );
    expect(screen.getByText("3 denúncias")).toBeInTheDocument();
  });

  it("colours harmful reasons differently from quality ones", () => {
    setup({ reasons: ["illegal", "spam"] });

    expect(screen.getByText("Ilegal").className).toContain("text-error");
    expect(screen.getByText("Spam").className).toContain("text-text-muted");
  });

  it("dismisses immediately — nothing is destroyed by ignoring a flag", () => {
    const { onAction } = setup();

    fireEvent.click(screen.getByRole("button", { name: "Ignorar Arroz 5kg" }));

    expect(onAction).toHaveBeenCalledWith("dismiss");
  });

  it("does not remove on the first tap", () => {
    const { onAction } = setup();

    fireEvent.click(screen.getByRole("button", { name: "Remover Arroz 5kg" }));

    expect(onAction).not.toHaveBeenCalled();
    expect(screen.getByText("Remover mesmo?")).toBeInTheDocument();
  });

  it("removes once confirmed", () => {
    const { onAction } = setup();

    fireEvent.click(screen.getByRole("button", { name: "Remover Arroz 5kg" }));
    fireEvent.click(screen.getByRole("button", { name: "Sim, remover" }));

    expect(onAction).toHaveBeenCalledWith("hide");
  });

  it("restores the original actions when the confirmation is cancelled", () => {
    const { onAction } = setup();

    fireEvent.click(screen.getByRole("button", { name: "Remover Arroz 5kg" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onAction).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Remover Arroz 5kg" })).toBeInTheDocument();
  });

  it("offers only Ignorar when the flagged content is already gone", () => {
    setup({ targetName: null, targetContext: null });

    expect(screen.getByText("Conteúdo removido")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ignorar denúncia" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Remover/ })).not.toBeInTheDocument();
  });

  it("shows the reporter's comment when they left one", () => {
    setup({ latestComment: "produto proibido" });
    expect(screen.getByText("“produto proibido”")).toBeInTheDocument();
  });

  it("disables both actions while an action is in flight", () => {
    setup({}, true);

    expect(screen.getByRole("button", { name: "Remover Arroz 5kg" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Ignorar Arroz 5kg" })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @aonde-tem/web test -- QueueCard`
Expected: FAIL — `Cannot find module './QueueCard.js'`.

- [ ] **Step 3: Extract the age formatter into shared**

Create `apps/web/src/shared/model/time.ts`:

```ts
/**
 * The app's one relative-age format: "45min atrás", "2h atrás", "3d atrás".
 * Lives here because both the place sheet (from a server-computed ageMinutes) and
 * the moderation queue (from a timestamp) render it, and two copies would drift.
 */
export function formatAge(minutes: number): string {
  if (minutes < 60) return `${minutes}min atrás`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h atrás`;
  return `${Math.floor(minutes / 1440)}d atrás`;
}

export function minutesSince(iso: string, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000));
}
```

In `apps/web/src/features/map/ui/PlaceModal.tsx`, delete the private `freshnessLabel` function (lines 13-17) and import the shared one instead. Add to the existing import block:

```tsx
import { formatAge } from "@/shared/model/time.js";
```

and replace the one call site — `{freshnessLabel(item.ageMinutes)}` becomes `{formatAge(item.ageMinutes)}`. The logic is identical, so `PlaceModal.test.tsx` must keep passing untouched; Step 6 verifies that.

- [ ] **Step 4: Write the card**

Create `apps/web/src/features/admin/ui/QueueCard.tsx`:

```tsx
import { useState } from "react";
import type { AdminQueueItem, FlagReasonDto } from "@aonde-tem/contracts";
import { formatAge, minutesSince } from "@/shared/model/time.js";

const REASON_LABEL: Record<FlagReasonDto, string> = {
  illegal: "Ilegal",
  inappropriate: "Inapropriado",
  spam: "Spam",
  wrong_info: "Informação errada",
  other: "Outro",
};

// Two categories, not five colours. Five saturated hues on one screen would break the
// One Accent Rule; the handoff asks for one colour per reason *category*. This screen's
// single accent is `error`, shared by the harmful chips and the Remover button.
const HARMFUL: ReadonlySet<FlagReasonDto> = new Set(["illegal", "inappropriate"]);

function ReasonChip({ reason }: { readonly reason: FlagReasonDto }) {
  const harmful = HARMFUL.has(reason);
  return (
    <span
      className={`px-2 py-1 rounded-control text-xs font-medium ${
        harmful ? "bg-error/10 text-error" : "bg-surface-alt text-text-muted"
      }`}
    >
      {REASON_LABEL[reason]}
    </span>
  );
}

interface Props {
  readonly item: AdminQueueItem;
  readonly onAction: (action: "hide" | "dismiss") => void;
  readonly isPending: boolean;
}

export function QueueCard({ item, onAction, isPending }: Props) {
  const [confirming, setConfirming] = useState(false);

  // A target whose content is already gone cannot be removed again; dismissing is the
  // only resolution left, and offering "Remover" would be a button that does nothing.
  const isGone = item.targetName === null;
  // Buttons name their target: a list of identical "Remover" buttons is unusable by
  // screen reader rotor or by voice control.
  const suffix = isGone ? "denúncia" : item.targetName;

  return (
    <li className="bg-surface border border-border rounded-control p-4">
      <p className={`font-medium truncate ${isGone ? "text-text-muted italic" : "text-text"}`}>
        {item.targetName ?? "Conteúdo removido"}
      </p>
      {item.targetContext && (
        <p className="text-text-muted text-sm truncate">{item.targetContext}</p>
      )}

      <div className="flex flex-wrap gap-2 mt-3">
        {item.reasons.map((r) => (
          <ReasonChip key={r} reason={r} />
        ))}
        {item.flagCount > 1 && (
          <span className="px-2 py-1 rounded-control text-xs font-medium bg-surface-alt text-text-muted tabular-nums">
            {item.flagCount} denúncias
          </span>
        )}
      </div>

      {item.latestComment && (
        <p className="text-text-muted text-sm italic mt-2 wrap-break-word">
          “{item.latestComment}”
        </p>
      )}

      <p className="text-text-muted text-xs mt-2 truncate">
        por {item.latestReporterEmail} · {formatAge(minutesSince(item.latestAt))}
      </p>

      <div className="mt-3" aria-live="polite">
        {confirming ? (
          <>
            <p className="text-text text-sm font-medium mb-2">Remover mesmo?</p>
            <div className="flex gap-2 animate-toast-in">
              <button
                type="button"
                disabled={isPending}
                onClick={() => onAction("hide")}
                className="flex-1 min-h-11 rounded-control bg-error text-white font-semibold disabled:opacity-50"
              >
                {isPending ? "Removendo…" : "Sim, remover"}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => setConfirming(false)}
                className="flex-1 min-h-11 rounded-control border border-border text-text font-semibold disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <div className="flex gap-2">
            {!isGone && (
              <button
                type="button"
                disabled={isPending}
                aria-label={`Remover ${suffix}`}
                onClick={() => setConfirming(true)}
                className="flex-1 min-h-11 rounded-control bg-error text-white font-semibold disabled:opacity-50"
              >
                Remover
              </button>
            )}
            <button
              type="button"
              disabled={isPending}
              aria-label={`Ignorar ${suffix}`}
              onClick={() => onAction("dismiss")}
              className="flex-1 min-h-11 rounded-control border border-border text-text font-semibold disabled:opacity-50"
            >
              {isPending ? "Ignorando…" : "Ignorar"}
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @aonde-tem/web test -- QueueCard`
Expected: PASS, 11 tests.

- [ ] **Step 6: Verify the PlaceModal refactor changed nothing**

Run: `pnpm --filter @aonde-tem/web test -- PlaceModal`
Expected: PASS, unchanged. If any test fails, the extraction was not behaviour-preserving — fix `formatAge` rather than the test.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/shared/model/time.ts apps/web/src/features/map/ui/PlaceModal.tsx apps/web/src/features/admin
git commit -m "feat(web): add the moderation queue card with a confirm-to-remove action"
```

---

### Task 5: The Denúncias screen and its data layer

**Files:**
- Create: `apps/web/src/features/admin/api/moderation.api.ts`
- Create: `apps/web/src/features/admin/api/moderation.queries.ts`
- Create: `apps/web/src/features/admin/ui/DenunciasPage.tsx`
- Test: `apps/web/src/features/admin/ui/DenunciasPage.test.tsx`

**Interfaces:**
- Consumes: `QueueCard` (Task 4); `adminQueueResponseSchema`, `AdminQueueItem` (Task 1); `http` from `@/shared/api/http.js`; `ComingSoon` from `@/shared/ui/ComingSoon.js`.
- Produces: `useModerationQueue()`, `useActionTarget()`, `DenunciasPage` — Task 6 routes to it.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/features/admin/ui/DenunciasPage.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { AdminQueueItem } from "@aonde-tem/contracts";
import { DenunciasPage } from "./DenunciasPage.js";
import { useModerationQueue, useActionTarget } from "../api/moderation.queries.js";
import { useAppStore } from "@/app/store/index.js";
import type { AppStore } from "@/app/store/types.js";

jest.mock("../api/moderation.queries.js", () => ({
  useModerationQueue: jest.fn(),
  useActionTarget: jest.fn(),
}));
const mockUseQueue = useModerationQueue as jest.MockedFunction<typeof useModerationQueue>;
const mockUseAction = useActionTarget as jest.MockedFunction<typeof useActionTarget>;

jest.mock("@/app/store/index.js");
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

function item(overrides: Partial<AdminQueueItem> = {}): AdminQueueItem {
  return {
    targetType: "discovery",
    targetId: "00000000-0000-0000-0000-0000000000d1",
    targetName: "Arroz 5kg",
    targetContext: "Mercadinho do Zé · R$ 24,90",
    flagCount: 1,
    reasons: ["spam"],
    latestComment: null,
    latestReporterEmail: "quem@denunciou.com",
    latestAt: "2026-08-30T12:00:00.000Z",
    ...overrides,
  } as AdminQueueItem;
}

function setup(
  query: Partial<{ data: unknown; isLoading: boolean; isError: boolean }> = {},
  mutateAsync = jest.fn().mockResolvedValue({ ok: true, resolved: 1 }),
) {
  const pushToast = jest.fn();
  mockUseAppStore.mockImplementation((selector: (s: AppStore) => unknown) =>
    selector({ pushToast } as unknown as AppStore),
  );
  mockUseQueue.mockReturnValue({
    data: query.data,
    isLoading: query.isLoading ?? false,
    isError: query.isError ?? false,
  } as unknown as ReturnType<typeof useModerationQueue>);
  mockUseAction.mockReturnValue({
    mutateAsync,
    isPending: false,
  } as unknown as ReturnType<typeof useActionTarget>);

  render(
    <MemoryRouter>
      <DenunciasPage />
    </MemoryRouter>,
  );
  return { mutateAsync, pushToast };
}

describe("DenunciasPage", () => {
  it("shows a loading line while the queue is in flight", () => {
    setup({ isLoading: true });
    expect(screen.getByText("Carregando denúncias…")).toBeInTheDocument();
  });

  it("reports a fetch failure instead of implying the queue is empty", () => {
    setup({ isError: true });
    expect(screen.getByText("Não foi possível carregar as denúncias.")).toBeInTheDocument();
    expect(screen.queryByText("Nenhuma denúncia aberta")).not.toBeInTheDocument();
  });

  it("says so plainly when there is nothing to moderate", () => {
    setup({ data: { items: [] } });
    expect(screen.getByText("Nenhuma denúncia aberta")).toBeInTheDocument();
  });

  it("counts the open targets next to the title", () => {
    setup({ data: { items: [item(), item({ targetId: "00000000-0000-0000-0000-0000000000d2" })] } });
    expect(screen.getByText("2 abertas")).toBeInTheDocument();
  });

  it("renders one card per flagged target", () => {
    setup({
      data: {
        items: [
          item(),
          item({ targetId: "00000000-0000-0000-0000-0000000000p1", targetName: "Cerveja" }),
        ],
      },
    });
    expect(screen.getByText("Arroz 5kg")).toBeInTheDocument();
    expect(screen.getByText("Cerveja")).toBeInTheDocument();
  });

  it("sends the target and the action to the API when a card is ignored", async () => {
    const { mutateAsync } = setup({ data: { items: [item()] } });

    fireEvent.click(screen.getByRole("button", { name: "Ignorar Arroz 5kg" }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        targetType: "discovery",
        targetId: "00000000-0000-0000-0000-0000000000d1",
        action: "dismiss",
      }),
    );
  });

  it("confirms the removal to the moderator", async () => {
    const { pushToast } = setup({ data: { items: [item()] } });

    fireEvent.click(screen.getByRole("button", { name: "Remover Arroz 5kg" }));
    fireEvent.click(screen.getByRole("button", { name: "Sim, remover" }));

    await waitFor(() =>
      expect(pushToast).toHaveBeenCalledWith({ tone: "success", message: "Conteúdo removido." }),
    );
  });

  it("keeps the card and explains itself when the action fails", async () => {
    const mutateAsync = jest.fn().mockRejectedValue(new Error("boom"));
    const { pushToast } = setup({ data: { items: [item()] } }, mutateAsync);

    fireEvent.click(screen.getByRole("button", { name: "Ignorar Arroz 5kg" }));

    await waitFor(() =>
      expect(pushToast).toHaveBeenCalledWith({
        tone: "error",
        message: "Não foi possível concluir a ação.",
      }),
    );
    expect(screen.getByText("Arroz 5kg")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @aonde-tem/web test -- DenunciasPage`
Expected: FAIL — `Cannot find module './DenunciasPage.js'`.

- [ ] **Step 3: Write the API client**

Create `apps/web/src/features/admin/api/moderation.api.ts`:

```ts
import { z } from "zod";
import { adminQueueResponseSchema, type AdminQueueResponse } from "@aonde-tem/contracts";
import { http } from "@/shared/api/http.js";

const actionResultSchema = z.object({ ok: z.boolean(), resolved: z.number().int() });

export async function fetchModerationQueue(accessToken: string): Promise<AdminQueueResponse> {
  return http("/api/admin/queue", adminQueueResponseSchema, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export interface ActionTargetInput {
  targetType: "product" | "discovery";
  targetId: string;
  action: "hide" | "dismiss";
}

export async function actionModerationTarget(
  accessToken: string,
  input: ActionTargetInput,
): Promise<{ ok: boolean; resolved: number }> {
  return http(`/api/admin/queue/${input.targetType}/${input.targetId}`, actionResultSchema, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ action: input.action }),
  });
}
```

- [ ] **Step 4: Write the query and mutation hooks**

Create `apps/web/src/features/admin/api/moderation.queries.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchModerationQueue,
  actionModerationTarget,
  type ActionTargetInput,
} from "./moderation.api.js";
import { useAppStore } from "@/app/store/index.js";

const keys = {
  // Token in the key for the same reason useMyDiscoveries does it: signing out and back
  // in as someone else must not serve the previous account's data from cache.
  queue: (accessToken: string | null) => ["admin", "queue", accessToken] as const,
};

export function useModerationQueue() {
  const accessToken = useAppStore((s) => s.accessToken);

  return useQuery({
    queryKey: keys.queue(accessToken),
    queryFn: () => fetchModerationQueue(accessToken!),
    enabled: !!accessToken,
    // No staleTime: a moderation queue is shared mutable state between admins, and
    // acting on something another admin already resolved is the failure to avoid.
    staleTime: 0,
  });
}

export function useActionTarget() {
  const accessToken = useAppStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ActionTargetInput) => actionModerationTarget(accessToken!, input),
    // Prefix match — the full key carries the token, which this call site does not need.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "queue"] }),
  });
}
```

- [ ] **Step 5: Write the page**

Create `apps/web/src/features/admin/ui/DenunciasPage.tsx`:

```tsx
import { useNavigate } from "react-router-dom";
import type { AdminQueueItem } from "@aonde-tem/contracts";
import { useAppStore } from "@/app/store/index.js";
import { ComingSoon } from "@/shared/ui/ComingSoon.js";
import { useModerationQueue, useActionTarget } from "../api/moderation.queries.js";
import { QueueCard } from "./QueueCard.js";

function QueueBody({ items }: { readonly items: AdminQueueItem[] }) {
  const action = useActionTarget();
  const pushToast = useAppStore((s) => s.pushToast);

  if (items.length === 0) {
    return (
      <ComingSoon
        title="Nenhuma denúncia aberta"
        description="Quando alguém denunciar um produto ou relato, ele aparece aqui."
      />
    );
  }

  async function run(item: AdminQueueItem, kind: "hide" | "dismiss") {
    try {
      await action.mutateAsync({
        targetType: item.targetType,
        targetId: item.targetId,
        action: kind,
      });
      pushToast({
        tone: "success",
        message: kind === "hide" ? "Conteúdo removido." : "Denúncia ignorada.",
      });
    } catch {
      pushToast({ tone: "error", message: "Não foi possível concluir a ação." });
    }
  }

  return (
    <ul className="px-4 py-4 flex flex-col gap-3">
      {items.map((item) => (
        <QueueCard
          key={`${item.targetType}:${item.targetId}`}
          item={item}
          isPending={action.isPending}
          onAction={(kind) => void run(item, kind)}
        />
      ))}
    </ul>
  );
}

/**
 * The moderation queue. Lives outside AppShell, so there is no tab bar and no
 * --bottom-nav-clearance padding — the back arrow is the only way out, exactly like
 * /report.
 */
export function DenunciasPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useModerationQueue();

  return (
    <div className="w-full min-h-screen bg-surface-alt">
      <div
        className="px-4 py-4 border-b border-border bg-surface flex items-center gap-3"
        style={{ paddingTop: "var(--header-inset-top)" }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="text-text-muted min-h-11 min-w-11 flex items-center justify-center shrink-0"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-text truncate">Denúncias</h1>
        {data && data.items.length > 0 && (
          <span className="text-text-muted text-sm tabular-nums shrink-0">
            {data.items.length} abertas
          </span>
        )}
      </div>

      {isLoading && <p className="px-4 py-6 text-text-muted text-sm">Carregando denúncias…</p>}
      {/* Distinct from the empty state on purpose: a failed request must never read as
          "there is nothing to moderate". */}
      {isError && (
        <p className="px-4 py-6 text-error text-sm">Não foi possível carregar as denúncias.</p>
      )}
      {data && <QueueBody items={data.items} />}
    </div>
  );
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter @aonde-tem/web test -- DenunciasPage`
Expected: PASS, 8 tests.

- [ ] **Step 7: Correct the `ComingSoon` doc comment**

`ComingSoon` is now used for a real empty state, not only for unbuilt routes, so its comment
in `apps/web/src/shared/ui/ComingSoon.tsx` is no longer true. Replace the first sentence:

```tsx
// Badge-and-copy panel for any screen with nothing to show — an unbuilt route, or a
// list that is legitimately empty. Shares EmptyState's badge vocabulary (80px
// surface-alt circle, muted stroke icon, animate-badge-in) but takes its copy as
// props — EmptyState's own copy is hardcoded about reports and cannot be reused here.
```

Copying the component's 25 lines into a third near-identical panel to avoid editing one
comment would be the worse trade.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/features/admin apps/web/src/shared/ui/ComingSoon.tsx
git commit -m "feat(web): build the Denúncias screen on the grouped moderation queue"
```

---

### Task 6: Route it, gate it, and make it reachable

**Files:**
- Create: `apps/web/src/features/auth/ui/AdminRoute.tsx`
- Test: `apps/web/src/features/auth/ui/AdminRoute.test.tsx`
- Modify: `apps/web/src/app/router.tsx`
- Modify: `apps/web/src/features/profile/ui/PerfilPage.tsx`
- Modify: `apps/web/src/features/profile/ui/PerfilPage.test.tsx`

**Interfaces:**
- Consumes: `DenunciasPage` (Task 5), `useAppStore`, `PageSuspense` (already in `router.tsx`).
- Produces: the `/admin/denuncias` route and `AdminRoute`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/features/auth/ui/AdminRoute.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminRoute } from "./AdminRoute.js";
import { useAppStore } from "@/app/store/index.js";
import type { AppStore } from "@/app/store/types.js";

jest.mock("../../../app/store/index.js");
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

function makeStoreSelector(sessionUser: AppStore["sessionUser"]) {
  return (selector: (s: AppStore) => unknown) =>
    selector({
      sessionUser,
      isAuthenticated: () => sessionUser !== null,
    } as unknown as AppStore);
}

const admin = {
  id: "00000000-0000-0000-0000-000000000002",
  email: "admin@aonde-tem.dev",
  displayName: "Admin",
  role: "admin" as const,
};
const plainUser = { ...admin, id: "00000000-0000-0000-0000-000000000001", role: "user" as const };

function renderAt() {
  return render(
    <MemoryRouter initialEntries={["/admin/denuncias"]}>
      <Routes>
        <Route path="/" element={<div>Mapa</div>} />
        <Route path="/signin" element={<div>Sign In Page</div>} />
        <Route
          path="/admin/denuncias"
          element={
            <AdminRoute>
              <div>Fila de denúncias</div>
            </AdminRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AdminRoute", () => {
  it("renders the page for an admin", () => {
    mockUseAppStore.mockImplementation(makeStoreSelector(admin));
    renderAt();
    expect(screen.getByText("Fila de denúncias")).toBeInTheDocument();
  });

  it("sends a signed-out visitor to sign in", () => {
    mockUseAppStore.mockImplementation(makeStoreSelector(null));
    renderAt();
    expect(screen.getByText("Sign In Page")).toBeInTheDocument();
  });

  it("sends a signed-in non-admin to the map, not to sign-in", () => {
    mockUseAppStore.mockImplementation(makeStoreSelector(plainUser));
    renderAt();

    // Bouncing them to /signin would tell them, by implication, that a page exists
    // here that they are not allowed to see.
    expect(screen.getByText("Mapa")).toBeInTheDocument();
    expect(screen.queryByText("Sign In Page")).not.toBeInTheDocument();
    expect(screen.queryByText("Fila de denúncias")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @aonde-tem/web test -- AdminRoute`
Expected: FAIL — `Cannot find module './AdminRoute.js'`.

- [ ] **Step 3: Write the gate**

Create `apps/web/src/features/auth/ui/AdminRoute.tsx`:

```tsx
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAppStore } from "@/app/store/index.js";

/**
 * Role gate, beside ProtectedRoute. The two failure modes are answered differently on
 * purpose: no session goes to /signin so the visitor can act on it, while a session
 * without the role goes to the map silently — redirecting them to sign in would imply
 * there is something here worth signing in for.
 */
export function AdminRoute({ children }: { readonly children: ReactNode }) {
  const sessionUser = useAppStore((s) => s.sessionUser);
  const location = useLocation();

  if (!sessionUser) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }
  if (sessionUser.role !== "admin") {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @aonde-tem/web test -- AdminRoute`
Expected: PASS, 3 tests.

- [ ] **Step 5: Add the route**

In `apps/web/src/app/router.tsx`, add the import beside `ProtectedRoute`:

```tsx
import { AdminRoute } from "../features/auth/ui/AdminRoute.js";
```

the lazy import beside the other pages:

```tsx
const DenunciasPage = lazy(() =>
  import("../features/admin/ui/DenunciasPage.js").then((m) => ({ default: m.DenunciasPage })),
);
```

and the route as the last child of `RootLayout`, after `/report` — outside `AppShell`, so the screen has no tab bar:

```tsx
      {
        path: "/admin/denuncias",
        element: (
          <AdminRoute>
            <PageSuspense>
              <DenunciasPage />
            </PageSuspense>
          </AdminRoute>
        ),
      },
```

- [ ] **Step 6: Write the failing test for the Perfil entry point**

Append to `apps/web/src/features/profile/ui/PerfilPage.test.tsx`:

```tsx
describe("PerfilPage — admin entry point", () => {
  it("offers the moderation queue to an admin", () => {
    setupStore({ sessionUser: { ...authenticatedUser, role: "admin" } });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Denúncias" }));

    expect(mockNavigate).toHaveBeenCalledWith("/admin/denuncias");
  });

  it("hides it from everyone else", () => {
    setupStore({ sessionUser: authenticatedUser });
    renderPage();

    expect(screen.queryByRole("button", { name: "Denúncias" })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run it to verify it fails**

Run: `pnpm --filter @aonde-tem/web test -- PerfilPage`
Expected: FAIL — `Unable to find an accessible element with the role "button" and name "Denúncias"`.

- [ ] **Step 8: Add the row**

In `apps/web/src/features/profile/ui/PerfilPage.tsx`, add a component after `ThemeRow`:

```tsx
/**
 * The only way into the moderation queue. Deliberately carries no open count: fetching
 * the admin queue on every Perfil render, for every admin, to decorate a link is a cost
 * the screen it points at can pay instead.
 */
function AdminRow() {
  const navigate = useNavigate();
  const sessionUser = useAppStore((s) => s.sessionUser);

  if (sessionUser?.role !== "admin") return null;

  return (
    <button
      type="button"
      onClick={() => navigate("/admin/denuncias")}
      className="w-full flex items-center justify-between px-4 min-h-14 text-left"
    >
      <span className="text-text text-base">Denúncias</span>
      <svg
        className="w-5 h-5 text-text-muted"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  );
}
```

and render it in the Ajustes section, between `<ThemeRow />` and `<SessionRow />`:

```tsx
        <ThemeRow />
        <AdminRow />
        <SessionRow />
```

- [ ] **Step 9: Run the web suite**

Run: `pnpm --filter @aonde-tem/web test`
Expected: PASS, all files. `PerfilPage` now has 2 more tests than before.

- [ ] **Step 10: Run the full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test && npx impeccable detect apps/web/src/`
Expected: all green. `impeccable detect` must report no new findings.

- [ ] **Step 11: Verify the screen by hand**

With the API and web dev server running, sign in as `admin@aonde-tem.dev`, open Perfil, and confirm:

1. The "Denúncias" row is there, and navigates.
2. The screen has **no bottom tab bar**, and the back arrow returns to Perfil.
3. A flagged item shows its name, place and price, the reason chip, the reporter and the age.
4. "Remover" asks "Remover mesmo?" before doing anything; "Cancelar" restores the buttons.
5. Confirming removes the card and the toast appears; the item is gone from the map.
6. Sign in as `seed@aonde-tem.dev` (role `user`), open Perfil — no Denúncias row — then type `/admin/denuncias` into the address bar and confirm you land on the map.
7. Check both light and dark themes.

- [ ] **Step 12: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): route /admin/denuncias behind a role gate and link it from Perfil"
```

---

### Task 7: Documentation

**Files:**
- Modify: `DESIGN.md` (regenerated)
- Modify: `docs/specs/feedback-flags.spec.md`
- Modify: `docs/specs/MVP-OVERVIEW.md:32`

`docs/ROADMAP.md` is deliberately **not** touched: moderation has no task list there. E10 lives
in `MVP-OVERVIEW.md`, as the note at `ROADMAP.md:30` explains.

- [ ] **Step 1: Regenerate the design system doc**

Run: `/impeccable document`
This rewrites `DESIGN.md` from the current `apps/web` source. Review the diff — the new screen should appear with its card and chip patterns.

- [ ] **Step 2: Record that the admin surface exists**

In `docs/specs/feedback-flags.spec.md`, under **Backlog mapping**, change the line to note the queue has shipped:

```markdown
Flag (denúncia) + admin hide + minimal queue (E10/E6, P0) — **shipped**, see
`docs/superpowers/specs/2026-08-30-admin-moderation-queue-design.md`; comments + thresholds (E6, P1).
```

- [ ] **Step 3: Keep the non-goal honest**

`docs/specs/MVP-OVERVIEW.md:32` currently reads:

```markdown
- ❌ **No rich admin dashboard.** Minimal queue / direct DB for v1. *(Build tooling once there's volume.)*
```

The non-goal still holds — what shipped is a minimal queue, not a dashboard — but "direct DB"
is now out of date. Replace it with:

```markdown
- ❌ **No rich admin dashboard.** A minimal queue at `/admin/denuncias` (list, remove, ignore) is all there is for v1. *(Build tooling once there's volume.)*
```

- [ ] **Step 4: Commit**

```bash
git add DESIGN.md docs/
git commit -m "docs: record the shipped moderation queue"
```

---

## What this plan does not do

Stated so no one implements them by accident:

- **No un-hide.** Nothing here un-blocks a product or clears `hiddenAt`. Reversing a removal remains a database operation, which is why Task 4 puts a confirmation in front of it.
- **No pagination.** The queue stops at 100 targets.
- **No comments, no auto-hide thresholds, no `BlockedTerm` UI.**
- **No migration is applied.** Task 2 Step 6 generates it with `--create-only` and stops, because `DATABASE_URL` points at production.

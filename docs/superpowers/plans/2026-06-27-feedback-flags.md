# Feedback & Flags (Denúncia + Moderation) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the flag (denúncia) flow — logged-in users flag bad content, admin reviews open flags and hides items. No illegal discovery stays visible > 24h after a valid flag is actioned.

**Architecture:** `FlagModule` in NestJS. `CreateFlag` use case. `AdminModule` with admin-only guard. Hidden filter already in `findNearby` (Plan B — `hidden_at IS NULL`). Minimal admin surface: a list of flags + hide/resolve action (API-only for v1).

**Tech Stack:** NestJS, Prisma, Zod, TypeScript strict. Frontend: flag button in `SightingPopup` (Plan D), simple flag form sheet.

## Global Constraints

- **Prerequisite:** Plans A, C, D must be complete — Flag entity, auth, SightingPopup must exist
- Flag submission requires valid JWT (`JwtAuthGuard`)
- Admin endpoints require `role === "admin"` in JWT payload (checked by `AdminGuard`)
- When admin actions a flag: set `discovery.hiddenAt = now()` or `product.status = "blocked"`
- `GET /discoveries/nearby` already excludes `hidden_at IS NOT NULL` (Plan B)
- Backlog items: AT-080 (confirm still there), AT-082 (flag + admin queue)

---

## File Structure

**New files:**
- `packages/contracts/src/flag.ts` — Zod schemas for flag create + response
- `apps/api/src/modules/flag/application/create-flag.ts`
- `apps/api/src/modules/flag/infrastructure/prisma-flag.repository.ts`
- `apps/api/src/modules/flag/presentation/flag.controller.ts`
- `apps/api/src/modules/flag/presentation/admin.controller.ts`
- `apps/api/src/modules/flag/guards/admin.guard.ts`
- `apps/api/src/modules/flag/flag.module.ts`
- `apps/web/src/features/flag/api/flag.api.ts`
- `apps/web/src/features/flag/ui/FlagSheet.tsx`

**Modified files:**
- `packages/contracts/src/index.ts` — export flag contracts
- `apps/api/src/app.module.ts` — register FlagModule
- `apps/web/src/features/map/ui/SightingPopup.tsx` — add "Denunciar" button

---

### Task 1: Flag Zod contracts

**Files:**
- Create: `packages/contracts/src/flag.ts`
- Modify: `packages/contracts/src/index.ts`

- [ ] **Step 1: Write flag contracts**

```typescript
// packages/contracts/src/flag.ts
import { z } from "zod";

export const createFlagSchema = z.object({
  targetType: z.enum(["product", "discovery"]),
  targetId: z.string().uuid(),
  reason: z.enum(["illegal", "inappropriate", "spam", "wrong_info", "other"]),
  comment: z.string().max(500).optional(),
});
export type CreateFlagDto = z.infer<typeof createFlagSchema>;

export const flagResponseSchema = z.object({
  id: z.string().uuid(),
  targetType: z.string(),
  targetId: z.string(),
  reason: z.string(),
  status: z.string(),
  createdAt: z.string().datetime(),
});
export type FlagResponse = z.infer<typeof flagResponseSchema>;

export const adminFlagResponseSchema = flagResponseSchema.extend({
  reporterEmail: z.string().email(),
  comment: z.string().nullable(),
});
export type AdminFlagResponse = z.infer<typeof adminFlagResponseSchema>;

export const adminActionSchema = z.object({
  action: z.enum(["hide", "dismiss"]),
});
export type AdminActionDto = z.infer<typeof adminActionSchema>;
```

- [ ] **Step 2: Export from contracts index**

```typescript
// Add to packages/contracts/src/index.ts:
export * from "./flag.js";
```

- [ ] **Step 3: Build contracts**

```bash
pnpm --filter @app/contracts build
```

Expected: no TS errors.

- [ ] **Step 4: Commit**

```bash
git add packages/contracts/src/flag.ts packages/contracts/src/index.ts
git commit -m "feat(contracts): Flag Zod schemas (AT-082)"
```

---

### Task 2: CreateFlag use case

**Files:**
- Create: `apps/api/src/modules/flag/application/create-flag.ts`

**Interfaces:**
- Consumes: `FlagRepository` (port from `@app/domain`)
- Produces: `CreateFlag.execute(dto, reporterId)` → `Flag`

- [ ] **Step 1: Write CreateFlag use case**

```typescript
// apps/api/src/modules/flag/application/create-flag.ts
import { Flag } from "@app/domain";
import type { FlagRepository } from "@app/domain";
import type { Logger } from "@app/domain";
import type { CreateFlagDto } from "@app/contracts";
import { randomUUID } from "crypto";

export class CreateFlag {
  constructor(
    private readonly flags: FlagRepository,
    private readonly log: Logger,
  ) {}

  async execute(dto: CreateFlagDto, reporterId: string): Promise<Flag> {
    const flag = Flag.create({
      id: randomUUID(),
      targetType: dto.targetType,
      targetId: dto.targetId,
      reason: dto.reason,
      reporterId,
      comment: dto.comment,
    });

    await this.flags.save(flag);
    this.log.info({ flagId: flag.id, targetType: dto.targetType, targetId: dto.targetId, reason: dto.reason }, "flag created");
    return flag;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/flag/application/create-flag.ts
git commit -m "feat(api): CreateFlag use case"
```

---

### Task 3: FlagRepository implementation + AdminGuard

**Files:**
- Create: `apps/api/src/modules/flag/infrastructure/prisma-flag.repository.ts`
- Create: `apps/api/src/modules/flag/guards/admin.guard.ts`

- [ ] **Step 1: Write PrismaFlagRepository**

```typescript
// apps/api/src/modules/flag/infrastructure/prisma-flag.repository.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/prisma.service.js";
import type { FlagRepository, FlagStatus } from "@app/domain";
import { Flag } from "@app/domain";

@Injectable()
export class PrismaFlagRepository implements FlagRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Flag | null> {
    const row = await this.prisma.flag.findUnique({ where: { id } });
    if (!row) return null;
    return Flag.create({ id: row.id, targetType: row.targetType as any, targetId: row.targetId, reason: row.reason as any, reporterId: row.reporterId, comment: row.comment ?? undefined, status: row.status as any, createdAt: row.createdAt });
  }

  async findOpen(limit = 50): Promise<Flag[]> {
    const rows = await this.prisma.flag.findMany({
      where: { status: "open" },
      orderBy: { createdAt: "asc" },
      take: limit,
      include: { reporter: true },
    });
    return rows.map((r) =>
      Flag.create({ id: r.id, targetType: r.targetType as any, targetId: r.targetId, reason: r.reason as any, reporterId: r.reporterId, comment: r.comment ?? undefined, status: r.status as any, createdAt: r.createdAt })
    );
  }

  async save(flag: Flag): Promise<void> {
    await this.prisma.flag.upsert({
      where: { id: flag.id },
      create: {
        id: flag.id, targetType: flag.targetType, targetId: flag.targetId,
        reason: flag.reason, reporterId: flag.reporterId, comment: flag.comment,
        status: flag.status,
      },
      update: { status: flag.status },
    });
  }

  async updateStatus(id: string, status: FlagStatus): Promise<void> {
    await this.prisma.flag.update({ where: { id }, data: { status } });
  }
}
```

- [ ] **Step 2: Write AdminGuard**

```typescript
// apps/api/src/modules/flag/guards/admin.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { JwtPayload } from "../../auth/guards/jwt-auth.guard.js";

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth: string | undefined = req.headers["authorization"];
    if (!auth?.startsWith("Bearer ")) throw new ForbiddenException("Missing token");
    const payload = this.jwt.verify<JwtPayload>(auth.slice(7));
    if (payload.role !== "admin") throw new ForbiddenException("Admin only");
    req.user = payload;
    return true;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/flag/infrastructure/ apps/api/src/modules/flag/guards/
git commit -m "feat(api): PrismaFlagRepository + AdminGuard"
```

---

### Task 4: FlagController + AdminController + FlagModule

**Files:**
- Create: `apps/api/src/modules/flag/presentation/flag.controller.ts`
- Create: `apps/api/src/modules/flag/presentation/admin.controller.ts`
- Create: `apps/api/src/modules/flag/flag.module.ts`

**Interfaces:**
- Produces: `POST /flags`, `GET /admin/flags`, `PATCH /admin/flags/:id`

- [ ] **Step 1: Write FlagController**

```typescript
// apps/api/src/modules/flag/presentation/flag.controller.ts
import { Controller, Post, Body, Req, UseGuards, Inject } from "@nestjs/common";
import { createFlagSchema, type FlagResponse } from "@app/contracts";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard.js";
import type { CreateFlag } from "../application/create-flag.js";

@Controller("flags")
export class FlagController {
  constructor(@Inject(CreateFlag) private readonly createFlag: CreateFlag) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() body: unknown, @Req() req: any): Promise<FlagResponse> {
    const dto = createFlagSchema.parse(body);
    const flag = await this.createFlag.execute(dto, req.user.sub);
    return {
      id: flag.id,
      targetType: flag.targetType,
      targetId: flag.targetId,
      reason: flag.reason,
      status: flag.status,
      createdAt: flag.createdAt.toISOString(),
    };
  }
}
```

- [ ] **Step 2: Write AdminController**

```typescript
// apps/api/src/modules/flag/presentation/admin.controller.ts
import { Controller, Get, Patch, Param, Body, UseGuards, Inject } from "@nestjs/common";
import { adminActionSchema, type AdminFlagResponse } from "@app/contracts";
import { AdminGuard } from "../guards/admin.guard.js";
import type { FlagRepository } from "@app/domain";
import { PrismaService } from "../../../shared/prisma.service.js";

@Controller("admin")
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    @Inject("FlagRepository") private readonly flags: FlagRepository,
    private readonly prisma: PrismaService,
  ) {}

  @Get("flags")
  async listOpenFlags(): Promise<{ flags: AdminFlagResponse[] }> {
    const openFlags = await this.flags.findOpen(100);
    // Enrich with reporter email
    const enriched = await Promise.all(
      openFlags.map(async (f) => {
        const reporter = await this.prisma.user.findUnique({ where: { id: f.reporterId } });
        return {
          id: f.id,
          targetType: f.targetType,
          targetId: f.targetId,
          reason: f.reason,
          status: f.status,
          comment: f.comment ?? null,
          createdAt: f.createdAt.toISOString(),
          reporterEmail: reporter?.email ?? "unknown",
        };
      })
    );
    return { flags: enriched };
  }

  @Patch("flags/:id")
  async actionFlag(
    @Param("id") id: string,
    @Body() body: unknown,
  ): Promise<{ ok: boolean }> {
    const dto = adminActionSchema.parse(body);
    const flag = await this.flags.findById(id);
    if (!flag) return { ok: false };

    if (dto.action === "hide") {
      // Hide the target
      if (flag.targetType === "discovery") {
        await this.prisma.discovery.update({ where: { id: flag.targetId }, data: { hiddenAt: new Date() } });
      } else if (flag.targetType === "product") {
        await this.prisma.product.update({ where: { id: flag.targetId }, data: { status: "blocked" } });
      }
      await this.flags.updateStatus(id, "actioned");
    } else {
      await this.flags.updateStatus(id, "dismissed");
    }

    return { ok: true };
  }
}
```

- [ ] **Step 3: Write FlagModule**

```typescript
// apps/api/src/modules/flag/flag.module.ts
import { Module } from "@nestjs/common";
import { PrismaService } from "../../shared/prisma.service.js";
import { PrismaFlagRepository } from "./infrastructure/prisma-flag.repository.js";
import { CreateFlag } from "./application/create-flag.js";
import { FlagController } from "./presentation/flag.controller.js";
import { AdminController } from "./presentation/admin.controller.js";
import { AdminGuard } from "./guards/admin.guard.js";
import { AuthModule } from "../auth/auth.module.js";

@Module({
  imports: [AuthModule],
  controllers: [FlagController, AdminController],
  providers: [
    PrismaService,
    { provide: "FlagRepository", useClass: PrismaFlagRepository },
    PrismaFlagRepository,
    AdminGuard,
    {
      provide: CreateFlag,
      useFactory: (repo: PrismaFlagRepository, log: any) => new CreateFlag(repo, log),
      inject: [PrismaFlagRepository, "PinoLogger"],
    },
  ],
})
export class FlagModule {}
```

- [ ] **Step 4: Register FlagModule in AppModule**

```typescript
// apps/api/src/app.module.ts — add to imports:
import { FlagModule } from "./modules/flag/flag.module.js";
// FlagModule,
```

- [ ] **Step 5: Build API**

```bash
pnpm --filter @app/api build
```

Expected: no TS errors.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/flag/ apps/api/src/app.module.ts
git commit -m "feat(api): POST /flags + GET /admin/flags + PATCH /admin/flags/:id (AT-082)"
```

---

### Task 5: Flag button in SightingPopup (frontend)

**Files:**
- Create: `apps/web/src/features/flag/api/flag.api.ts`
- Create: `apps/web/src/features/flag/ui/FlagSheet.tsx`
- Modify: `apps/web/src/features/map/ui/SightingPopup.tsx`

- [ ] **Step 1: Write flag.api.ts**

```typescript
// apps/web/src/features/flag/api/flag.api.ts
import { useMutation } from "@tanstack/react-query";
import { flagResponseSchema, type CreateFlagDto } from "@app/contracts";
import { http } from "../../../shared/api/http.js";
import { useAppStore } from "../../../app/store/index.js";

export function useCreateFlag() {
  const accessToken = useAppStore((s) => s.accessToken);

  return useMutation({
    mutationFn: (dto: CreateFlagDto) =>
      http("/api/flags", flagResponseSchema, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(dto),
      }),
  });
}
```

- [ ] **Step 2: Write FlagSheet**

```tsx
// apps/web/src/features/flag/ui/FlagSheet.tsx
import { useState } from "react";
import { useCreateFlag } from "../api/flag.api.js";
import type { FlagReason, FlagTargetType } from "@app/domain";

const REASONS: { value: FlagReason; label: string }[] = [
  { value: "illegal", label: "Produto ilegal" },
  { value: "inappropriate", label: "Conteúdo inapropriado" },
  { value: "spam", label: "Spam / enganoso" },
  { value: "wrong_info", label: "Informação errada" },
  { value: "other", label: "Outro" },
];

interface Props {
  targetType: FlagTargetType;
  targetId: string;
  onClose: () => void;
}

export function FlagSheet({ targetType, targetId, onClose }: Props) {
  const [reason, setReason] = useState<FlagReason | "">("");
  const createFlag = useCreateFlag();

  async function submit() {
    if (!reason) return;
    await createFlag.mutateAsync({ targetType, targetId, reason });
    onClose();
  }

  if (createFlag.isSuccess) {
    return (
      <div className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-2xl shadow-xl p-6 pb-10 z-20 flex flex-col items-center gap-4">
        <div className="text-4xl">✅</div>
        <p className="text-text font-semibold">Denúncia enviada</p>
        <p className="text-text-muted text-sm text-center">Nossa equipe revisará em breve.</p>
        <button onClick={onClose} className="text-brand font-medium">Fechar</button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-2xl shadow-xl p-6 pb-10 z-20">
      <h2 className="text-lg font-bold text-text mb-4">Denunciar</h2>
      <div className="flex flex-col gap-2 mb-6">
        {REASONS.map((r) => (
          <button
            key={r.value}
            onClick={() => setReason(r.value)}
            className={`text-left px-4 py-3 rounded-xl border text-sm font-medium ${
              reason === r.value
                ? "border-brand bg-brand/10 text-brand"
                : "border-border text-text"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <button
        onClick={submit}
        disabled={!reason || createFlag.isPending}
        className="w-full bg-red-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
      >
        {createFlag.isPending ? "Enviando…" : "Enviar denúncia"}
      </button>
      <button onClick={onClose} className="w-full text-text-muted py-2 mt-2">
        Cancelar
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Add flag button to SightingPopup**

Open `apps/web/src/features/map/ui/SightingPopup.tsx` and add:

```tsx
// At top, add import:
import { useState } from "react";
import { FlagSheet } from "../../../features/flag/ui/FlagSheet.js";
import { useAppStore } from "../../../app/store/index.js";

// Inside the component, add:
const [showFlag, setShowFlag] = useState(false);
const isAuthenticated = useAppStore((s) => s.isAuthenticated());

// In the JSX, add below the "Ver no mapa" button:
{isAuthenticated && (
  <button
    onClick={() => setShowFlag(true)}
    className="w-full text-text-muted text-sm py-2 mt-1"
  >
    Denunciar
  </button>
)}

{showFlag && (
  <FlagSheet
    targetType="discovery"
    targetId={discovery.id}
    onClose={() => setShowFlag(false)}
  />
)}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/flag/ apps/web/src/features/map/ui/SightingPopup.tsx
git commit -m "feat(web): Denunciar (flag) button in SightingPopup + FlagSheet (AT-082)"
```

---

### Task 6: Manual end-to-end test of flag → admin hide flow

- [ ] **Step 1: Test flag submission**

```bash
# Sign in and get a token (from Plan C)
TOKEN="<accessToken>"
DISCOVERY_ID="<a discovery id from seed>"

# Submit a flag
curl -X POST http://localhost:3000/flags \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"targetType\":\"discovery\",\"targetId\":\"$DISCOVERY_ID\",\"reason\":\"spam\"}"
```

Expected: `{ "id": "...", "status": "open", ... }`

- [ ] **Step 2: Check admin flag queue**

```bash
# Get admin JWT (use admin@aondetem.com.br from seed — magic code flow)
ADMIN_TOKEN="<adminAccessToken>"

curl http://localhost:3000/admin/flags \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Expected: `{ "flags": [{ ..., "reason": "spam", "status": "open" }] }`

- [ ] **Step 3: Admin hides the discovery**

```bash
FLAG_ID="<flag id from previous response>"

curl -X PATCH http://localhost:3000/admin/flags/$FLAG_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"action":"hide"}'
```

Expected: `{ "ok": true }`

- [ ] **Step 4: Verify discovery no longer appears in nearby**

```bash
curl "http://localhost:3000/discoveries/nearby?lat=-23.55&lng=-46.63&radius=10000"
```

Expected: the hidden discovery no longer appears in results.

- [ ] **Step 5: Commit test notes**

```bash
git commit --allow-empty -m "test(manual): flag → admin hide flow verified end-to-end (AT-082)"
```

---

## Self-Review Checklist

- [x] **AT-082** — `POST /flags` (auth required) + admin flag queue + admin hide/resolve
- [x] **AT-080** — (partial) flag with `wrong_info` reason covers "gone" / "wrong price" signal (full "Ainda tem?" confirm flow is P1 — tracked in backlog)
- [x] `GET /discoveries/nearby` already excludes `hidden_at IS NOT NULL` (Plan B) — admin hide takes effect immediately
- [x] Non-admin JWT on `GET /admin/flags` returns 403 (AdminGuard)
- [x] FlagSheet shows confirmation on success; closes on cancel
- [x] Flag button only visible to authenticated users

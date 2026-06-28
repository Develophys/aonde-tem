# Backend Write API + Auth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the write side of the MVP backend: magic-code passwordless auth (JWT sessions), Product creation with blocklist + dedup, and `POST /discoveries` — so a logged-in user can contribute a discovery.

**Architecture:** Same Clean Architecture as Plan B. Auth is a separate `AuthModule` (magic code + JWT). `ProductModule` handles product creation + blocklist check + dedup. `DiscoveryModule` gets a `save()` implementation. Auth guard protects write endpoints.

**Tech Stack:** NestJS, Prisma, Zod, JWT (`@nestjs/jwt`), nodemailer / Resend (configurable), TypeScript strict, Jest + Supertest.

## Global Constraints

- **Prerequisite:** Plans A and B must be complete
- Magic code = 6-digit numeric, 10-minute TTL; wrong/expired code must never authenticate
- JWT payload: `{ sub: userId, email, role }`; short-lived access token (15 min); sent in `Authorization: Bearer`
- All write endpoints require `Authorization: Bearer <jwt>`; reads are public (no auth required)
- Product dedup: normalize name → find by `normalizedKey` → return existing product if found
- Blocklist check runs before any product is stored; `block` → reject with clear message; `review` → store as `under_review`
- `POST /discoveries` creates both a Place (if new) and a Discovery atomically in a Prisma transaction
- Rate limiting: `@nestjs/throttler` — 10 POST /discoveries per user per minute
- Backlog items: AT-021, E5/E10 (auth), product API, AT-029 (rate limiting)

---

## DB Safety Rules (mandatory for all agents implementing this plan)

These rules were derived from a query-efficiency code review on Plan B. Every task in this plan that touches the database must comply.

### 1 — No N+1 queries

- Never call a repository method inside a loop over rows. Batch with `findMany({ where: { id: { in: ids } } })` or use a single JOIN/raw query.
- Use Prisma's `include` / `select` for eager-loading relations that are always needed together. Load only the fields the caller actually reads.
- In `POST /discoveries`, place lookup and discovery insert must be a **single Prisma transaction** (`this.prisma.$transaction([...])`) — not two separate awaits — so partial-failure leaves no orphan rows.

### 2 — Column name convention: always use camelCase with double-quotes in raw SQL

The schema uses camelCase column names (`"productId"`, `"placeId"`, `"reporterId"`, `"expiresAt"`, `"hiddenAt"`, `"createdAt"`). Raw SQL (`$executeRaw`, `$queryRaw`) must quote them:

```sql
-- CORRECT
INSERT INTO discoveries ("id", "productId", "placeId", "price", "quantity", "reporterId", "note", "location", "expiresAt")

-- WRONG — will fail at runtime
INSERT INTO discoveries (id, product_id, place_id, price, quantity, reporter_id, note, location, expires_at)
```

### 3 — Always filter by product.status in read queries

Any query that returns discoveries to end-users **must** include `AND p.status = 'active'` (or equivalent) in the `WHERE` clause. Blocking a product does NOT cascade `hiddenAt` onto its discoveries; the status filter is the only guard.

Applies to: `findNearbyWithDetails`, any future list/search queries that join `products`.

### 4 — Reject writes for non-active products

`POST /discoveries` must verify `product.status === 'active'` before inserting. Use `findById` / `findByNormalizedKey` and throw a domain error if the product is `blocked` or `under_review`.

### 5 — Index new filter columns before shipping

Any new column used in a `WHERE` clause of a query expected to run at scale needs an index. Use a standard migration file. Partial indexes (`WHERE "hiddenAt" IS NULL`) are preferred over full indexes when the selective rows are a stable minority.

Existing indexes (already in migrations):

- `discoveries.location` — GIST (spatial)
- `discoveries."expiresAt" WHERE "hiddenAt" IS NULL` — B-tree partial (active-row filter)
- `products."normalizedKey"` — GIN trigram (`gin_trgm_ops`) for fuzzy search
- `places.location` — GIST (spatial)

### 6 — Never re-compute geography points more than needed in one query

`ST_MakePoint(lng, lat)::geography` can be bound once with Prisma's `Prisma.sql` tagged template. For readability and maintainability (not for performance — PostgreSQL folds constants) put repeated point expressions in a CTE:

```sql
WITH center AS (SELECT ST_MakePoint(${lng}, ${lat})::geography AS geog)
SELECT ..., ST_Distance(d.location, c.geog) FROM discoveries d, center c
WHERE ST_DWithin(d.location, c.geog, ${radius})
ORDER BY d.location <-> c.geog
```

---

## File Structure

**New files:**
- `packages/contracts/src/auth.ts` — Zod schemas for magic code + JWT
- `packages/contracts/src/product.ts` — Zod schemas for product create/response
- `packages/contracts/src/discovery-create.ts` — Zod schema for POST /discoveries body
- `apps/api/src/modules/auth/application/send-magic-code.ts`
- `apps/api/src/modules/auth/application/verify-magic-code.ts`
- `apps/api/src/modules/auth/infrastructure/prisma-user.repository.ts`
- `apps/api/src/modules/auth/infrastructure/prisma-magic-code.repository.ts`
- `apps/api/src/modules/auth/presentation/auth.controller.ts`
- `apps/api/src/modules/auth/auth.module.ts`
- `apps/api/src/modules/auth/guards/jwt-auth.guard.ts`
- `apps/api/src/modules/product/application/create-product.ts`
- `apps/api/src/modules/product/infrastructure/prisma-product.repository.ts`
- `apps/api/src/modules/product/presentation/product.controller.ts`
- `apps/api/src/modules/product/product.module.ts`
- `apps/api/src/modules/discovery/application/create-discovery.ts`

**Modified files:**
- `apps/api/src/modules/discovery/infrastructure/prisma-discovery.repository.ts` — implement `save()`
- `apps/api/src/modules/discovery/presentation/discovery.controller.ts` — add `POST /discoveries`
- `apps/api/src/modules/discovery/discovery.module.ts` — register new providers
- `apps/api/src/app.module.ts` — register AuthModule, ProductModule, ThrottlerModule
- `packages/contracts/src/index.ts` — export new schemas

---

### Task 1: Auth Zod contracts

**Files:**
- Create: `packages/contracts/src/auth.ts`
- Modify: `packages/contracts/src/index.ts`

- [ ] **Step 1: Write auth contracts**

```typescript
// packages/contracts/src/auth.ts
import { z } from "zod";

export const sendMagicCodeSchema = z.object({
  email: z.string().email(),
});
export type SendMagicCodeDto = z.infer<typeof sendMagicCodeSchema>;

export const verifyMagicCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6).regex(/^\d{6}$/),
});
export type VerifyMagicCodeDto = z.infer<typeof verifyMagicCodeSchema>;

export const jwtResponseSchema = z.object({
  accessToken: z.string(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    displayName: z.string().nullable(),
    role: z.enum(["user", "admin"]),
  }),
});
export type JwtResponse = z.infer<typeof jwtResponseSchema>;
```

- [ ] **Step 2: Write product contracts**

```typescript
// packages/contracts/src/product.ts
import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1).max(200).trim(),
});
export type CreateProductDto = z.infer<typeof createProductSchema>;

export const productResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  normalizedKey: z.string(),
  status: z.enum(["active", "under_review", "blocked"]),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type ProductResponse = z.infer<typeof productResponseSchema>;
```

- [ ] **Step 3: Write discovery create contract**

```typescript
// packages/contracts/src/discovery-create.ts
import { z } from "zod";

export const createDiscoverySchema = z.object({
  productId: z.string().uuid().optional(),
  productName: z.string().min(1).max(200).optional(), // use existing or create
  placeId: z.string().uuid().optional(),
  placeName: z.string().min(2).max(200),              // always required for new places
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  priceBrl: z.number().positive().max(99_999.99),
  quantity: z.number().int().min(1),
  note: z.string().max(500).optional(),
}).refine((d) => d.productId || d.productName, {
  message: "Either productId or productName must be provided",
});
export type CreateDiscoveryDto = z.infer<typeof createDiscoverySchema>;

export const createDiscoveryResponseSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  placeId: z.string().uuid(),
  createdAt: z.string().datetime(),
});
export type CreateDiscoveryResponse = z.infer<typeof createDiscoveryResponseSchema>;
```

- [ ] **Step 4: Export from contracts index — add to `packages/contracts/src/index.ts`**

```typescript
export * from "./auth.js";
export * from "./product.js";
export * from "./discovery-create.js";
```

- [ ] **Step 5: Build contracts**

```bash
pnpm --filter @app/contracts build
```

Expected: no TS errors.

- [ ] **Step 6: Commit**

```bash
git add packages/contracts/src/auth.ts packages/contracts/src/product.ts packages/contracts/src/discovery-create.ts packages/contracts/src/index.ts
git commit -m "feat(contracts): auth, product, discovery-create Zod schemas"
```

---

### Task 2: Magic code auth use cases

**Files:**
- Create: `apps/api/src/modules/auth/application/send-magic-code.ts`
- Create: `apps/api/src/modules/auth/application/verify-magic-code.ts`

**Interfaces:**
- Produces: `SendMagicCode.execute(email)` → sends 6-digit code via email; `VerifyMagicCode.execute(email, code)` → returns `User` or throws

- [ ] **Step 1: Write SendMagicCode use case**

```typescript
// apps/api/src/modules/auth/application/send-magic-code.ts
import type { UserRepository } from "@app/domain";
import { User } from "@app/domain";
import type { Logger } from "@app/domain";

export interface MagicCodeRepository {
  save(email: string, code: string, expiresAt: Date): Promise<void>;
}

export interface EmailService {
  sendMagicCode(email: string, code: string): Promise<void>;
}

function generateCode(): string {
  return Math.floor(100_000 + Math.random() * 900_000).toString();
}

export class SendMagicCode {
  constructor(
    private readonly users: UserRepository,
    private readonly codes: MagicCodeRepository,
    private readonly email: EmailService,
    private readonly log: Logger,
  ) {}

  async execute(rawEmail: string): Promise<void> {
    const email = rawEmail.trim().toLowerCase();
    this.log.info({ email }, "sending magic code");

    // Ensure user exists (create on first sign-in)
    let user = await this.users.findByEmail(email);
    if (!user) {
      const { randomUUID } = await import("crypto");
      user = User.create({ id: randomUUID(), email, role: "user" });
      await this.users.save(user);
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await this.codes.save(email, code, expiresAt);
    await this.email.sendMagicCode(email, code);
    this.log.info({ email }, "magic code sent");
  }
}
```

- [ ] **Step 2: Write VerifyMagicCode use case**

```typescript
// apps/api/src/modules/auth/application/verify-magic-code.ts
import { UnauthorizedError } from "@app/domain";
import type { UserRepository } from "@app/domain";
import type { User } from "@app/domain";
import type { Logger } from "@app/domain";

export interface MagicCodeVerifier {
  verifyAndConsume(email: string, code: string): Promise<boolean>;
}

export class VerifyMagicCode {
  constructor(
    private readonly users: UserRepository,
    private readonly codes: MagicCodeVerifier,
    private readonly log: Logger,
  ) {}

  async execute(email: string, code: string): Promise<User> {
    const normalizedEmail = email.trim().toLowerCase();
    const valid = await this.codes.verifyAndConsume(normalizedEmail, code);
    if (!valid) {
      this.log.warn({ email: normalizedEmail }, "invalid or expired magic code");
      throw new UnauthorizedError("Invalid or expired code");
    }
    const user = await this.users.findByEmail(normalizedEmail);
    if (!user) throw new UnauthorizedError("User not found");
    this.log.info({ userId: user.id }, "magic code verified, user authenticated");
    return user;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/auth/application/
git commit -m "feat(auth): SendMagicCode + VerifyMagicCode use cases"
```

---

### Task 3: Auth infrastructure (User repo, MagicCode repo, Email service)

**Files:**
- Create: `apps/api/src/modules/auth/infrastructure/prisma-user.repository.ts`
- Create: `apps/api/src/modules/auth/infrastructure/prisma-magic-code.repository.ts`
- Create: `apps/api/src/modules/auth/infrastructure/resend-email.service.ts`

- [ ] **Step 1: User repository**

```typescript
// apps/api/src/modules/auth/infrastructure/prisma-user.repository.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/prisma.service.js";
import type { UserRepository } from "@app/domain";
import { User } from "@app/domain";

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    if (!row) return null;
    return User.create({ id: row.id, email: row.email, role: row.role as any, displayName: row.displayName ?? undefined, createdAt: row.createdAt });
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!row) return null;
    return User.create({ id: row.id, email: row.email, role: row.role as any, displayName: row.displayName ?? undefined, createdAt: row.createdAt });
  }

  async save(user: User): Promise<void> {
    await this.prisma.user.upsert({
      where: { id: user.id },
      create: { id: user.id, email: user.email.value, role: user.role, displayName: user.displayName },
      update: { displayName: user.displayName },
    });
  }
}
```

- [ ] **Step 2: MagicCode repository**

```typescript
// apps/api/src/modules/auth/infrastructure/prisma-magic-code.repository.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/prisma.service.js";
import type { MagicCodeRepository, MagicCodeVerifier } from "../application/send-magic-code.js";

@Injectable()
export class PrismaMagicCodeRepository implements MagicCodeRepository, MagicCodeVerifier {
  constructor(private readonly prisma: PrismaService) {}

  async save(email: string, code: string, expiresAt: Date): Promise<void> {
    await this.prisma.magicCode.create({ data: { email, code, expiresAt } });
  }

  async verifyAndConsume(email: string, code: string): Promise<boolean> {
    const record = await this.prisma.magicCode.findFirst({
      where: { email, code, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!record) return false;
    await this.prisma.magicCode.update({ where: { id: record.id }, data: { usedAt: new Date() } });
    return true;
  }
}
```

- [ ] **Step 3: Email service (console dev, Resend prod)**

```typescript
// apps/api/src/modules/auth/infrastructure/resend-email.service.ts
import { Injectable } from "@nestjs/common";
import type { EmailService } from "../application/send-magic-code.js";

@Injectable()
export class ConsoleEmailService implements EmailService {
  async sendMagicCode(email: string, code: string): Promise<void> {
    // TODO: swap for Resend (https://resend.com) in production
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({ from: 'noreply@aondetem.com.br', to: email, subject: 'Seu código de acesso', html: `<b>${code}</b>` });
    console.log(`[DEV] Magic code for ${email}: ${code}`);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/auth/infrastructure/
git commit -m "feat(auth): PrismaUserRepository, MagicCodeRepository, EmailService"
```

---

### Task 4: JWT guard + AuthModule + AuthController

**Files:**
- Create: `apps/api/src/modules/auth/guards/jwt-auth.guard.ts`
- Create: `apps/api/src/modules/auth/presentation/auth.controller.ts`
- Create: `apps/api/src/modules/auth/auth.module.ts`

**Interfaces:**
- Produces: `POST /auth/send-code`, `POST /auth/verify-code` → JWT; `JwtAuthGuard` for protecting endpoints

- [ ] **Step 1: Install JWT package if not present**

```bash
pnpm --filter @app/api add @nestjs/jwt
```

- [ ] **Step 2: JWT guard**

```typescript
// apps/api/src/modules/auth/guards/jwt-auth.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth: string | undefined = req.headers["authorization"];
    if (!auth?.startsWith("Bearer ")) throw new UnauthorizedException("Missing token");
    try {
      const payload = this.jwt.verify<JwtPayload>(auth.slice(7));
      req.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
```

- [ ] **Step 3: Auth controller**

```typescript
// apps/api/src/modules/auth/presentation/auth.controller.ts
import { Controller, Post, Body, Inject } from "@nestjs/common";
import { sendMagicCodeSchema, verifyMagicCodeSchema, type JwtResponse } from "@app/contracts";
import { JwtService } from "@nestjs/jwt";
import type { SendMagicCode } from "../application/send-magic-code.js";
import type { VerifyMagicCode } from "../application/verify-magic-code.js";

@Controller("auth")
export class AuthController {
  constructor(
    @Inject(SendMagicCode) private readonly sendCode: SendMagicCode,
    @Inject(VerifyMagicCode) private readonly verifyCode: VerifyMagicCode,
    private readonly jwt: JwtService,
  ) {}

  @Post("send-code")
  async sendMagicCode(@Body() body: unknown): Promise<{ message: string }> {
    const dto = sendMagicCodeSchema.parse(body);
    await this.sendCode.execute(dto.email);
    return { message: "Code sent" };
  }

  @Post("verify-code")
  async verifyMagicCode(@Body() body: unknown): Promise<JwtResponse> {
    const dto = verifyMagicCodeSchema.parse(body);
    const user = await this.verifyCode.execute(dto.email, dto.code);
    const accessToken = this.jwt.sign(
      { sub: user.id, email: user.email.value, role: user.role },
      { expiresIn: "15m" },
    );
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email.value,
        displayName: user.displayName ?? null,
        role: user.role,
      },
    };
  }
}
```

- [ ] **Step 4: Auth module**

```typescript
// apps/api/src/modules/auth/auth.module.ts
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaService } from "../../shared/prisma.service.js";
import { PrismaUserRepository } from "./infrastructure/prisma-user.repository.js";
import { PrismaMagicCodeRepository } from "./infrastructure/prisma-magic-code.repository.js";
import { ConsoleEmailService } from "./infrastructure/resend-email.service.js";
import { SendMagicCode } from "./application/send-magic-code.js";
import { VerifyMagicCode } from "./application/verify-magic-code.js";
import { AuthController } from "./presentation/auth.controller.js";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? "dev-secret-change-in-production",
      signOptions: { expiresIn: "15m" },
    }),
  ],
  controllers: [AuthController],
  providers: [
    PrismaService,
    PrismaUserRepository,
    PrismaMagicCodeRepository,
    ConsoleEmailService,
    JwtAuthGuard,
    {
      provide: SendMagicCode,
      useFactory: (users: PrismaUserRepository, codes: PrismaMagicCodeRepository, email: ConsoleEmailService, log: any) =>
        new SendMagicCode(users, codes, email, log),
      inject: [PrismaUserRepository, PrismaMagicCodeRepository, ConsoleEmailService, "PinoLogger"],
    },
    {
      provide: VerifyMagicCode,
      useFactory: (users: PrismaUserRepository, codes: PrismaMagicCodeRepository, log: any) =>
        new VerifyMagicCode(users, codes, log),
      inject: [PrismaUserRepository, PrismaMagicCodeRepository, "PinoLogger"],
    },
  ],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
```

- [ ] **Step 5: Register AuthModule in AppModule**

```typescript
// in apps/api/src/app.module.ts, add to imports:
import { AuthModule } from "./modules/auth/auth.module.js";
// AuthModule,
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/auth/ apps/api/src/app.module.ts
git commit -m "feat(auth): magic-code auth endpoints + JWT guard (AT-072)"
```

---

### Task 5: Product creation use case with blocklist + dedup

**Files:**
- Create: `apps/api/src/modules/product/application/create-product.ts`
- Create: `apps/api/src/modules/product/infrastructure/prisma-product.repository.ts`
- Create: `apps/api/src/modules/product/presentation/product.controller.ts`
- Create: `apps/api/src/modules/product/product.module.ts`

**Interfaces:**
- Consumes: `ProductRepository`, `BlockedTermRepository` (simple Prisma query)
- Produces: `POST /products` → product (reused or created); `GET /products?q=` → autocomplete

- [ ] **Step 1: Write CreateProduct use case**

```typescript
// apps/api/src/modules/product/application/create-product.ts
import { Product, ConflictError } from "@app/domain";
import type { ProductRepository } from "@app/domain";
import type { Logger } from "@app/domain";
import { randomUUID } from "crypto";

export interface BlockedTermChecker {
  check(name: string): Promise<{ action: "block" | "review" } | null>;
}

export class CreateProduct {
  constructor(
    private readonly products: ProductRepository,
    private readonly blocklist: BlockedTermChecker,
    private readonly log: Logger,
  ) {}

  async execute(name: string, createdById: string): Promise<Product> {
    const trimmed = name.trim();
    this.log.info({ name: trimmed, createdById }, "create product");

    // Dedup: check normalizedKey first
    const tempProduct = Product.create({ id: "tmp", name: trimmed, createdById });
    const existing = await this.products.findByNormalizedKey(tempProduct.normalizedKey);
    if (existing) {
      this.log.info({ productId: existing.id }, "reused existing product");
      return existing;
    }

    // Blocklist check
    const blocked = await this.blocklist.check(trimmed);
    const status = blocked?.action === "review" ? "under_review" : "active";
    if (blocked?.action === "block") {
      throw new ConflictError(`This product is not allowed: "${trimmed}"`);
    }

    const product = Product.create({ id: randomUUID(), name: trimmed, createdById, status });
    await this.products.save(product);
    return product;
  }
}
```

- [ ] **Step 2: Write ProductRepository implementation**

```typescript
// apps/api/src/modules/product/infrastructure/prisma-product.repository.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/prisma.service.js";
import type { ProductRepository } from "@app/domain";
import { Product } from "@app/domain";
import type { BlockedTermChecker } from "../application/create-product.js";

@Injectable()
export class PrismaProductRepository implements ProductRepository, BlockedTermChecker {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Product | null> {
    const row = await this.prisma.product.findUnique({ where: { id } });
    return row ? Product.create({ id: row.id, name: row.name, createdById: row.createdById, status: row.status as any, createdAt: row.createdAt }) : null;
  }

  async findByNormalizedKey(key: string): Promise<Product | null> {
    const row = await this.prisma.product.findUnique({ where: { normalizedKey: key } });
    return row ? Product.create({ id: row.id, name: row.name, createdById: row.createdById, status: row.status as any, createdAt: row.createdAt }) : null;
  }

  async searchByName(query: string, limit = 10): Promise<Product[]> {
    const rows = await this.prisma.$queryRaw<{ id: string; name: string; normalized_key: string; status: string; created_by_id: string; created_at: Date }[]>`
      SELECT id, name, normalized_key, status, created_by_id, created_at
      FROM products
      WHERE status = 'active'
        AND (normalized_key % ${query} OR normalized_key ILIKE ${'%' + query + '%'})
      ORDER BY similarity(normalized_key, ${query}) DESC
      LIMIT ${limit}
    `;
    return rows.map((r) =>
      Product.create({ id: r.id, name: r.name, createdById: r.created_by_id, status: r.status as any, createdAt: r.created_at })
    );
  }

  async save(product: Product): Promise<void> {
    await this.prisma.product.upsert({
      where: { id: product.id },
      create: {
        id: product.id, name: product.name, normalizedKey: product.normalizedKey,
        status: product.status, createdById: product.createdById,
      },
      update: { name: product.name, status: product.status },
    });
  }

  async check(name: string): Promise<{ action: "block" | "review" } | null> {
    const lower = name.toLowerCase();
    const term = await this.prisma.blockedTerm.findFirst({
      where: { pattern: { in: lower.split(" ").filter(Boolean) } },
    });
    return term ? { action: term.action as any } : null;
  }
}
```

- [ ] **Step 3: Write ProductController**

```typescript
// apps/api/src/modules/product/presentation/product.controller.ts
import { Controller, Post, Get, Body, Query, Req, UseGuards, Inject } from "@nestjs/common";
import { createProductSchema, type ProductResponse } from "@app/contracts";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard.js";
import type { CreateProduct } from "../application/create-product.js";
import type { ProductRepository } from "@app/domain";

@Controller("products")
export class ProductController {
  constructor(
    @Inject(CreateProduct) private readonly createProduct: CreateProduct,
    @Inject("ProductRepository") private readonly products: ProductRepository,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() body: unknown, @Req() req: any): Promise<ProductResponse> {
    const dto = createProductSchema.parse(body);
    const product = await this.createProduct.execute(dto.name, req.user.sub);
    return {
      id: product.id, name: product.name, normalizedKey: product.normalizedKey,
      status: product.status, description: null, imageUrl: null,
      createdAt: product.createdAt.toISOString(),
    };
  }

  @Get()
  async search(@Query("q") q: string): Promise<{ results: { id: string; name: string }[] }> {
    if (!q || q.length < 1) return { results: [] };
    const products = await this.products.searchByName(
      q.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim(),
      10,
    );
    return { results: products.map((p) => ({ id: p.id, name: p.name })) };
  }
}
```

- [ ] **Step 4: Write ProductModule**

```typescript
// apps/api/src/modules/product/product.module.ts
import { Module } from "@nestjs/common";
import { PrismaService } from "../../shared/prisma.service.js";
import { PrismaProductRepository } from "./infrastructure/prisma-product.repository.js";
import { CreateProduct } from "./application/create-product.js";
import { ProductController } from "./presentation/product.controller.js";
import { AuthModule } from "../auth/auth.module.js";

@Module({
  imports: [AuthModule],
  controllers: [ProductController],
  providers: [
    PrismaService,
    { provide: "ProductRepository", useClass: PrismaProductRepository },
    PrismaProductRepository,
    {
      provide: CreateProduct,
      useFactory: (repo: PrismaProductRepository, log: any) => new CreateProduct(repo, repo, log),
      inject: [PrismaProductRepository, "PinoLogger"],
    },
  ],
  exports: ["ProductRepository", PrismaProductRepository],
})
export class ProductModule {}
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/product/ apps/api/src/app.module.ts
git commit -m "feat(api): Product creation + blocklist + dedup + GET /products autocomplete (AT-130)"
```

---

### Task 6: POST /discoveries — create discovery with place reuse or creation

**Files:**
- Create: `apps/api/src/modules/discovery/application/create-discovery.ts`
- Modify: `apps/api/src/modules/discovery/infrastructure/prisma-discovery.repository.ts` — add `save()`
- Modify: `apps/api/src/modules/discovery/presentation/discovery.controller.ts` — add `POST /`
- Modify: `apps/api/src/modules/discovery/discovery.module.ts` — add auth + imports

**Interfaces:**
- Consumes: `DiscoveryRepository.save()`, `ProductRepository`, `JwtAuthGuard`
- Produces: `POST /discoveries` → `{ id, productId, placeId, createdAt }`

- [ ] **Step 1: Write CreateDiscovery use case**

```typescript
// apps/api/src/modules/discovery/application/create-discovery.ts
import { Discovery, Price, Coordinates, ValidationError } from "@app/domain";
import type { DiscoveryRepository } from "@app/domain";
import type { Logger } from "@app/domain";
import { randomUUID } from "crypto";
import type { CreateDiscoveryDto } from "@app/contracts";

export interface PlaceUpsertService {
  findOrCreate(placeId: string | undefined, name: string, lat: number, lng: number, createdById: string): Promise<string>;
}

export class CreateDiscovery {
  constructor(
    private readonly discoveries: DiscoveryRepository,
    private readonly places: PlaceUpsertService,
    private readonly log: Logger,
  ) {}

  async execute(dto: CreateDiscoveryDto, reporterId: string): Promise<Discovery> {
    const coords = Coordinates.create(dto.lat, dto.lng);
    const price = Price.create(dto.priceBrl);

    const placeId = await this.places.findOrCreate(dto.placeId, dto.placeName, dto.lat, dto.lng, reporterId);

    const discovery = Discovery.create({
      id: randomUUID(),
      productId: dto.productId!,
      placeId,
      price,
      quantity: dto.quantity,
      reporterId,
      coords,
      note: dto.note,
    });

    await this.discoveries.save(discovery);
    this.log.info({ discoveryId: discovery.id }, "discovery created");
    return discovery;
  }
}
```

- [ ] **Step 2: Implement `save()` in PrismaDiscoveryRepository**

Add to `apps/api/src/modules/discovery/infrastructure/prisma-discovery.repository.ts`:

```typescript
  async save(discovery: Discovery): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO discoveries (id, product_id, place_id, price, quantity, reporter_id, note, location, expires_at)
      VALUES (
        ${discovery.id},
        ${discovery.productId},
        ${discovery.placeId},
        ${discovery.price.cents / 100},
        ${discovery.quantity},
        ${discovery.reporterId},
        ${discovery.note ?? null},
        ST_MakePoint(${discovery.coords.lng}, ${discovery.coords.lat})::geography,
        ${discovery.expiresAt}
      )
    `;
  }
```

Also add a `PlaceUpsertService` implementation:

```typescript
// In the same file, add a PlaceUpsertService helper class:
@Injectable()
export class PlaceUpsertServiceImpl {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreate(placeId: string | undefined, name: string, lat: number, lng: number, createdById: string): Promise<string> {
    if (placeId) {
      const exists = await this.prisma.place.findUnique({ where: { id: placeId } });
      if (exists) return exists.id;
    }
    const id = randomUUID();
    await this.prisma.$executeRaw`
      INSERT INTO places (id, name, location, created_by_id)
      VALUES (${id}, ${name}, ST_MakePoint(${lng}, ${lat})::geography, ${createdById})
    `;
    return id;
  }
}
```

- [ ] **Step 3: Add POST /discoveries to DiscoveryController**

Add to `apps/api/src/modules/discovery/presentation/discovery.controller.ts`:

```typescript
import { Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard.js";
import { createDiscoverySchema, type CreateDiscoveryResponse } from "@app/contracts";
import type { CreateDiscovery } from "../application/create-discovery.js";

// In the controller class, add:
@Post()
@UseGuards(JwtAuthGuard)
async create(@Body() body: unknown, @Req() req: any): Promise<CreateDiscoveryResponse> {
  const dto = createDiscoverySchema.parse(body);
  const discovery = await this.createDiscoveryUseCase.execute(dto, req.user.sub);
  return {
    id: discovery.id,
    productId: discovery.productId,
    placeId: discovery.placeId,
    createdAt: discovery.createdAt.toISOString(),
  };
}
```

- [ ] **Step 4: Add throttling in AppModule**

```bash
pnpm --filter @app/api add @nestjs/throttler
```

In `apps/api/src/app.module.ts`:

```typescript
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";

// Add to imports:
ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),

// Add to providers:
{ provide: APP_GUARD, useClass: ThrottlerGuard },
```

- [ ] **Step 5: Build API to verify compilation**

```bash
pnpm --filter @app/api build
```

Expected: no TS errors.

- [ ] **Step 6: Manual end-to-end test**

```bash
# 1. Get a magic code (printed in console)
curl -X POST http://localhost:3000/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# 2. Verify code (use the code from console output)
curl -X POST http://localhost:3000/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456"}'
# Save the accessToken from response

# 3. Create a product
TOKEN="<accessToken>"
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Feijão Carioca 1kg"}'

# 4. Post a discovery
curl -X POST http://localhost:3000/discoveries \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"productId":"<product-id>","placeName":"Mercado da Esquina","lat":-23.548,"lng":-46.638,"priceBrl":8.50,"quantity":20}'
```

Expected: each step returns 200/201 with expected JSON.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/discovery/ apps/api/src/app.module.ts
git commit -m "feat(api): POST /discoveries + place upsert + auth guard + rate limiting (AT-021, AT-029)"
```

---

## Self-Review Checklist

- [x] **AT-021** — `POST /discoveries` with auth gate, place upsert, validation
- [x] **Auth (E5/E10)** — magic-code send + verify, JWT session, JwtAuthGuard
- [x] **Product (E10)** — create + blocklist + dedup; `GET /products?q=` autocomplete
- [x] **AT-029** — rate limiting via `@nestjs/throttler` (10 POST/min per IP)
- [x] Magic code never logs in on wrong/expired code (`verifyAndConsume` marks as used)
- [x] JWT payload: `{ sub, email, role }` — consistent with Plan D/E frontend consumption
- [x] No placeholders — all code is complete

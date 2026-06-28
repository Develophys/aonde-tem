# Foundation + Domain Model Evolution — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the monorepo foundation and evolve the generic scaffold into the real MVP domain model (User, Product, Place, Discovery, Flag, BlockedTerm) with PostGIS schema and full domain unit tests.

**Architecture:** Pure domain entities in `packages/domain` (no framework deps); PostGIS schema in `prisma/schema.prisma`; migrations applied via `pnpm db:migrate`. All entities enforce their own invariants via factory methods.

**Tech Stack:** TypeScript strict, pnpm workspaces, Prisma + PostGIS, Jest (ts-jest), Docker Compose.

## Global Constraints

- `packages/domain` must import **nothing** framework-specific — no Prisma, NestJS, or HTTP deps
- All entity properties validated in the `static create()` factory — throw `ValidationError` on bad input
- Use the `DomainError` hierarchy already in `packages/domain/src/errors/domain-error.ts`
- `Coordinates` VO already exists at `packages/domain/src/value-objects/coordinates.ts` — reuse it
- Domain tests run with: `pnpm --filter @app/domain test`
- DB migrations run with: `pnpm db:migrate` (from root); verify against Docker Compose PostGIS
- `normalizedKey` on Product = `name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]/g,' ').replace(/\s+/g,' ').trim()`
- `expiresAt` on Discovery defaults to `createdAt + 24h` (configurable TTL via constant)
- Backlog items: AT-005, AT-013, AT-014, AT-015, AT-016, AT-100

---

## File Structure

**New files:**
- `packages/domain/src/value-objects/email.ts`
- `packages/domain/src/value-objects/price.ts`
- `packages/domain/src/entities/user.ts`
- `packages/domain/src/entities/product.ts`
- `packages/domain/src/entities/discovery.ts`
- `packages/domain/src/entities/flag.ts`
- `packages/domain/src/entities/blocked-term.ts`
- `packages/domain/src/repositories/user-repository.ts`
- `packages/domain/src/repositories/product-repository.ts`
- `packages/domain/src/repositories/discovery-repository.ts`
- `packages/domain/src/repositories/flag-repository.ts`
- `packages/domain/src/value-objects/email.test.ts`
- `packages/domain/src/value-objects/price.test.ts`
- `packages/domain/src/entities/user.test.ts`
- `packages/domain/src/entities/product.test.ts`
- `packages/domain/src/entities/discovery.test.ts`
- `packages/domain/src/entities/flag.test.ts`
- `prisma/migrations/<timestamp>_full_mvp_schema/migration.sql`

**Modified files:**
- `packages/domain/src/entities/place.ts` — drop `category`, add optional `createdById`
- `packages/domain/src/index.ts` — export all new entities/VOs/repos
- `prisma/schema.prisma` — add User, Product, Discovery, Flag, BlockedTerm; update Place
- `packages/domain/src/repositories/place-repository.ts` — add `findNearby` by coords + radius

---

### Task 1: Verify pnpm lockfile and clean install (AT-005)

**Files:**
- Verify: `pnpm-lock.yaml` (must exist after `pnpm install`)

**Interfaces:**
- Produces: clean `node_modules`, lockfile committed

- [ ] **Step 1: Run install and verify**

```bash
pnpm install
```

Expected output: `Lockfile is up to date` or list of installed packages — no errors.

- [ ] **Step 2: Confirm lockfile exists**

```bash
ls pnpm-lock.yaml
```

Expected: file listed (non-zero size).

- [ ] **Step 3: Commit lockfile if missing from repo**

```bash
git add pnpm-lock.yaml
git commit -m "chore: add pnpm lockfile (AT-005)"
```

---

### Task 2: Email value object

**Files:**
- Create: `packages/domain/src/value-objects/email.ts`
- Create: `packages/domain/src/value-objects/email.test.ts`

**Interfaces:**
- Produces: `Email` class with `value: string` and `static create(raw: string): Email`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/domain/src/value-objects/email.test.ts
import { Email } from "./email.js";
import { ValidationError } from "../errors/domain-error.js";

describe("Email", () => {
  it("normalises to lowercase", () => {
    expect(Email.create("User@Example.COM").value).toBe("user@example.com");
  });

  it("rejects missing @", () => {
    expect(() => Email.create("notanemail")).toThrow(ValidationError);
  });

  it("rejects empty string", () => {
    expect(() => Email.create("")).toThrow(ValidationError);
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
pnpm --filter @app/domain test -- --testPathPattern="email.test"
```

Expected: `Cannot find module './email.js'`

- [ ] **Step 3: Write implementation**

```typescript
// packages/domain/src/value-objects/email.ts
import { ValidationError } from "../errors/domain-error.js";

export class Email {
  private constructor(public readonly value: string) {}

  static create(raw: string): Email {
    const v = raw.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) {
      throw new ValidationError("Invalid email address");
    }
    return new Email(v);
  }
}
```

- [ ] **Step 4: Run to confirm it passes**

```bash
pnpm --filter @app/domain test -- --testPathPattern="email.test"
```

Expected: `PASS` — 3 tests passing.

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/value-objects/email.ts packages/domain/src/value-objects/email.test.ts
git commit -m "feat(domain): Email value object (AT-100)"
```

---

### Task 3: Price value object

**Files:**
- Create: `packages/domain/src/value-objects/price.ts`
- Create: `packages/domain/src/value-objects/price.test.ts`

**Interfaces:**
- Produces: `Price` class with `cents: number` (integer), `formatted: string` (R$X,XX), `static create(raw: number): Price`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/domain/src/value-objects/price.test.ts
import { Price } from "./price.js";
import { ValidationError } from "../errors/domain-error.js";

describe("Price", () => {
  it("stores cents as integer", () => {
    expect(Price.create(9.99).cents).toBe(999);
  });

  it("formats BRL string", () => {
    expect(Price.create(9.99).formatted).toBe("R$ 9,99");
  });

  it("rejects zero", () => {
    expect(() => Price.create(0)).toThrow(ValidationError);
  });

  it("rejects negative", () => {
    expect(() => Price.create(-1)).toThrow(ValidationError);
  });

  it("rejects above max (R$99999.99)", () => {
    expect(() => Price.create(100_000)).toThrow(ValidationError);
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
pnpm --filter @app/domain test -- --testPathPattern="price.test"
```

Expected: `Cannot find module './price.js'`

- [ ] **Step 3: Write implementation**

```typescript
// packages/domain/src/value-objects/price.ts
import { ValidationError } from "../errors/domain-error.js";

const MAX_PRICE = 99_999.99;

export class Price {
  private constructor(public readonly cents: number) {}

  static create(brl: number): Price {
    if (brl <= 0) throw new ValidationError("Price must be greater than zero");
    if (brl > MAX_PRICE) throw new ValidationError(`Price cannot exceed R$${MAX_PRICE}`);
    return new Price(Math.round(brl * 100));
  }

  get formatted(): string {
    const value = this.cents / 100;
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  }
}
```

- [ ] **Step 4: Run to confirm it passes**

```bash
pnpm --filter @app/domain test -- --testPathPattern="price.test"
```

Expected: `PASS` — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/value-objects/price.ts packages/domain/src/value-objects/price.test.ts
git commit -m "feat(domain): Price value object with BRL validation (AT-100)"
```

---

### Task 4: User entity + UserRepository port

**Files:**
- Create: `packages/domain/src/entities/user.ts`
- Create: `packages/domain/src/entities/user.test.ts`
- Create: `packages/domain/src/repositories/user-repository.ts`

**Interfaces:**
- Produces: `User` class; `UserRepository` interface with `findById`, `findByEmail`, `save`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/domain/src/entities/user.test.ts
import { User } from "./user.js";
import { ValidationError } from "../errors/domain-error.js";

describe("User", () => {
  it("creates valid user", () => {
    const u = User.create({ id: "1", email: "a@b.com", role: "user" });
    expect(u.email.value).toBe("a@b.com");
    expect(u.role).toBe("user");
  });

  it("rejects invalid email", () => {
    expect(() => User.create({ id: "1", email: "bad", role: "user" })).toThrow(ValidationError);
  });

  it("allows admin role", () => {
    const u = User.create({ id: "1", email: "admin@b.com", role: "admin" });
    expect(u.isAdmin()).toBe(true);
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
pnpm --filter @app/domain test -- --testPathPattern="user.test"
```

Expected: `Cannot find module './user.js'`

- [ ] **Step 3: Write User entity**

```typescript
// packages/domain/src/entities/user.ts
import { Email } from "../value-objects/email.js";
import { ValidationError } from "../errors/domain-error.js";

export type UserRole = "user" | "admin";

export class User {
  private constructor(
    public readonly id: string,
    public readonly email: Email,
    public readonly role: UserRole,
    public readonly displayName: string | undefined,
    public readonly createdAt: Date,
  ) {}

  static create(props: {
    id: string;
    email: string;
    role: UserRole;
    displayName?: string;
    createdAt?: Date;
  }): User {
    if (!props.id.trim()) throw new ValidationError("User id is required");
    return new User(
      props.id,
      Email.create(props.email),
      props.role,
      props.displayName,
      props.createdAt ?? new Date(),
    );
  }

  isAdmin(): boolean {
    return this.role === "admin";
  }
}
```

- [ ] **Step 4: Write UserRepository port**

```typescript
// packages/domain/src/repositories/user-repository.ts
import type { User } from "../entities/user.js";

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
}
```

- [ ] **Step 5: Run to confirm tests pass**

```bash
pnpm --filter @app/domain test -- --testPathPattern="user.test"
```

Expected: `PASS` — 3 tests passing.

- [ ] **Step 6: Commit**

```bash
git add packages/domain/src/entities/user.ts packages/domain/src/entities/user.test.ts packages/domain/src/repositories/user-repository.ts
git commit -m "feat(domain): User entity + UserRepository port (AT-013)"
```

---

### Task 5: Product entity + ProductRepository port

**Files:**
- Create: `packages/domain/src/entities/product.ts`
- Create: `packages/domain/src/entities/product.test.ts`
- Create: `packages/domain/src/repositories/product-repository.ts`

**Interfaces:**
- Produces: `Product` class with `normalizedKey` computed; `ProductStatus = "active" | "under_review" | "blocked"`; `ProductRepository` interface

- [ ] **Step 1: Write the failing test**

```typescript
// packages/domain/src/entities/product.test.ts
import { Product } from "./product.js";
import { ValidationError } from "../errors/domain-error.js";

describe("Product", () => {
  it("normalises key: strips accents, punctuation, lowercases", () => {
    const p = Product.create({ id: "1", name: "Coca-Cola 2L", createdById: "u1" });
    expect(p.normalizedKey).toBe("coca cola 2l");
  });

  it("creates with active status by default", () => {
    const p = Product.create({ id: "1", name: "Arroz", createdById: "u1" });
    expect(p.status).toBe("active");
  });

  it("rejects empty name", () => {
    expect(() => Product.create({ id: "1", name: "  ", createdById: "u1" })).toThrow(ValidationError);
  });

  it("allows under_review status", () => {
    const p = Product.create({ id: "1", name: "X", createdById: "u1", status: "under_review" });
    expect(p.isVisible()).toBe(false);
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
pnpm --filter @app/domain test -- --testPathPattern="product.test"
```

Expected: `Cannot find module './product.js'`

- [ ] **Step 3: Write Product entity**

```typescript
// packages/domain/src/entities/product.ts
import { ValidationError } from "../errors/domain-error.js";

export type ProductStatus = "active" | "under_review" | "blocked";

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export class Product {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly normalizedKey: string,
    public readonly status: ProductStatus,
    public readonly createdById: string,
    public readonly description: string | undefined,
    public readonly imageUrl: string | undefined,
    public readonly createdAt: Date,
  ) {}

  static create(props: {
    id: string;
    name: string;
    createdById: string;
    status?: ProductStatus;
    description?: string;
    imageUrl?: string;
    createdAt?: Date;
  }): Product {
    const name = props.name.trim();
    if (name.length === 0) throw new ValidationError("Product name is required");
    return new Product(
      props.id,
      name,
      normalize(name),
      props.status ?? "active",
      props.createdById,
      props.description,
      props.imageUrl,
      props.createdAt ?? new Date(),
    );
  }

  isVisible(): boolean {
    return this.status === "active";
  }
}
```

- [ ] **Step 4: Write ProductRepository port**

```typescript
// packages/domain/src/repositories/product-repository.ts
import type { Product } from "../entities/product.js";

export interface ProductRepository {
  findById(id: string): Promise<Product | null>;
  findByNormalizedKey(key: string): Promise<Product | null>;
  searchByName(query: string, limit?: number): Promise<Product[]>;
  save(product: Product): Promise<void>;
}
```

- [ ] **Step 5: Run to confirm tests pass**

```bash
pnpm --filter @app/domain test -- --testPathPattern="product.test"
```

Expected: `PASS` — 4 tests passing.

- [ ] **Step 6: Commit**

```bash
git add packages/domain/src/entities/product.ts packages/domain/src/entities/product.test.ts packages/domain/src/repositories/product-repository.ts
git commit -m "feat(domain): Product entity + normalizedKey + ProductRepository port (AT-013)"
```

---

### Task 6: Discovery entity + DiscoveryRepository port (AT-013, AT-016)

**Files:**
- Create: `packages/domain/src/entities/discovery.ts`
- Create: `packages/domain/src/entities/discovery.test.ts`
- Create: `packages/domain/src/repositories/discovery-repository.ts`

**Interfaces:**
- Consumes: `Price` (from Task 3), `Coordinates` (already exists)
- Produces: `Discovery` class; `DiscoveryRepository` with `findNearby`, `findById`, `save`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/domain/src/entities/discovery.test.ts
import { Discovery, DISCOVERY_DEFAULT_TTL_MS } from "./discovery.js";
import { Price } from "../value-objects/price.js";
import { Coordinates } from "../value-objects/coordinates.js";
import { ValidationError } from "../errors/domain-error.js";

const coords = Coordinates.create(-23.55, -46.63);
const price = Price.create(5.99);

describe("Discovery", () => {
  it("creates with expiresAt = createdAt + TTL", () => {
    const now = new Date(2026, 0, 1, 12, 0, 0);
    const s = Discovery.create({
      id: "s1", productId: "p1", placeId: "pl1",
      price, quantity: 10, reporterId: "u1",
      coords, createdAt: now,
    });
    expect(s.expiresAt.getTime()).toBe(now.getTime() + DISCOVERY_DEFAULT_TTL_MS);
  });

  it("is fresh when not expired", () => {
    const s = Discovery.create({
      id: "s1", productId: "p1", placeId: "pl1",
      price, quantity: 5, reporterId: "u1", coords,
    });
    expect(s.isFresh()).toBe(true);
  });

  it("is stale when past expiresAt", () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 48); // 48h ago
    const s = Discovery.create({
      id: "s1", productId: "p1", placeId: "pl1",
      price, quantity: 5, reporterId: "u1", coords,
      createdAt: past,
    });
    expect(s.isFresh()).toBe(false);
  });

  it("rejects zero quantity", () => {
    expect(() =>
      Discovery.create({ id: "s1", productId: "p1", placeId: "pl1", price, quantity: 0, reporterId: "u1", coords })
    ).toThrow(ValidationError);
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
pnpm --filter @app/domain test -- --testPathPattern="discovery.test"
```

Expected: `Cannot find module './discovery.js'`

- [ ] **Step 3: Write Discovery entity**

```typescript
// packages/domain/src/entities/discovery.ts
import type { Price } from "../value-objects/price.js";
import type { Coordinates } from "../value-objects/coordinates.js";
import { ValidationError } from "../errors/domain-error.js";

export const DISCOVERY_DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class Discovery {
  private constructor(
    public readonly id: string,
    public readonly productId: string,
    public readonly placeId: string,
    public readonly price: Price,
    public readonly quantity: number,
    public readonly reporterId: string,
    public readonly coords: Coordinates,
    public readonly note: string | undefined,
    public readonly createdAt: Date,
    public readonly expiresAt: Date,
  ) {}

  static create(props: {
    id: string;
    productId: string;
    placeId: string;
    price: Price;
    quantity: number;
    reporterId: string;
    coords: Coordinates;
    note?: string;
    createdAt?: Date;
    expiresAt?: Date;
    ttlMs?: number;
  }): Discovery {
    if (props.quantity < 1) throw new ValidationError("Quantity must be at least 1");
    if (!props.productId) throw new ValidationError("productId is required");
    if (!props.placeId) throw new ValidationError("placeId is required");
    const createdAt = props.createdAt ?? new Date();
    const expiresAt =
      props.expiresAt ?? new Date(createdAt.getTime() + (props.ttlMs ?? DISCOVERY_DEFAULT_TTL_MS));
    return new Discovery(
      props.id, props.productId, props.placeId, props.price, props.quantity,
      props.reporterId, props.coords, props.note, createdAt, expiresAt,
    );
  }

  isFresh(): boolean {
    return this.expiresAt.getTime() > Date.now();
  }

  ageMs(): number {
    return Date.now() - this.createdAt.getTime();
  }
}
```

- [ ] **Step 4: Write DiscoveryRepository port**

```typescript
// packages/domain/src/repositories/discovery-repository.ts
import type { Discovery } from "../entities/discovery.js";
import type { Coordinates } from "../value-objects/coordinates.js";

export interface NearbyDiscoveriesQuery {
  center: Coordinates;
  radiusMeters: number;
  itemQuery?: string;
  limit?: number;
  includeFresh?: boolean; // default true
}

export interface DiscoveryRepository {
  findById(id: string): Promise<Discovery | null>;
  findNearby(query: NearbyDiscoveriesQuery): Promise<Discovery[]>;
  save(discovery: Discovery): Promise<void>;
  delete(id: string): Promise<void>;
}
```

- [ ] **Step 5: Run to confirm tests pass**

```bash
pnpm --filter @app/domain test -- --testPathPattern="discovery.test"
```

Expected: `PASS` — 4 tests passing.

- [ ] **Step 6: Commit**

```bash
git add packages/domain/src/entities/discovery.ts packages/domain/src/entities/discovery.test.ts packages/domain/src/repositories/discovery-repository.ts
git commit -m "feat(domain): Discovery entity + freshness rule + DiscoveryRepository port (AT-013, AT-016)"
```

---

### Task 7: Flag entity + FlagRepository port

**Files:**
- Create: `packages/domain/src/entities/flag.ts`
- Create: `packages/domain/src/entities/flag.test.ts`
- Create: `packages/domain/src/repositories/flag-repository.ts`

**Interfaces:**
- Produces: `Flag` class; `FlagReason`, `FlagStatus`, `FlagTargetType` types; `FlagRepository`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/domain/src/entities/flag.test.ts
import { Flag } from "./flag.js";
import { ValidationError } from "../errors/domain-error.js";

describe("Flag", () => {
  it("creates open flag", () => {
    const f = Flag.create({
      id: "f1", targetType: "discovery", targetId: "s1",
      reason: "spam", reporterId: "u1",
    });
    expect(f.status).toBe("open");
  });

  it("rejects invalid reason", () => {
    expect(() =>
      Flag.create({ id: "f1", targetType: "product", targetId: "p1",
        reason: "bad_reason" as any, reporterId: "u1" })
    ).toThrow(ValidationError);
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
pnpm --filter @app/domain test -- --testPathPattern="flag.test"
```

Expected: `Cannot find module './flag.js'`

- [ ] **Step 3: Write Flag entity**

```typescript
// packages/domain/src/entities/flag.ts
import { ValidationError } from "../errors/domain-error.js";

export type FlagTargetType = "product" | "discovery";
export type FlagReason = "illegal" | "inappropriate" | "spam" | "wrong_info" | "other";
export type FlagStatus = "open" | "actioned" | "dismissed";

const VALID_REASONS: FlagReason[] = ["illegal", "inappropriate", "spam", "wrong_info", "other"];

export class Flag {
  private constructor(
    public readonly id: string,
    public readonly targetType: FlagTargetType,
    public readonly targetId: string,
    public readonly reason: FlagReason,
    public readonly reporterId: string,
    public readonly comment: string | undefined,
    public readonly status: FlagStatus,
    public readonly createdAt: Date,
  ) {}

  static create(props: {
    id: string;
    targetType: FlagTargetType;
    targetId: string;
    reason: FlagReason;
    reporterId: string;
    comment?: string;
    status?: FlagStatus;
    createdAt?: Date;
  }): Flag {
    if (!VALID_REASONS.includes(props.reason)) {
      throw new ValidationError(`Invalid flag reason: ${props.reason}`);
    }
    return new Flag(
      props.id, props.targetType, props.targetId, props.reason,
      props.reporterId, props.comment, props.status ?? "open",
      props.createdAt ?? new Date(),
    );
  }
}
```

- [ ] **Step 4: Write FlagRepository port**

```typescript
// packages/domain/src/repositories/flag-repository.ts
import type { Flag, FlagStatus } from "../entities/flag.js";

export interface FlagRepository {
  findById(id: string): Promise<Flag | null>;
  findOpen(limit?: number): Promise<Flag[]>;
  save(flag: Flag): Promise<void>;
  updateStatus(id: string, status: FlagStatus): Promise<void>;
}
```

- [ ] **Step 5: Run to confirm tests pass**

```bash
pnpm --filter @app/domain test -- --testPathPattern="flag.test"
```

Expected: `PASS` — 2 tests passing.

- [ ] **Step 6: Commit**

```bash
git add packages/domain/src/entities/flag.ts packages/domain/src/entities/flag.test.ts packages/domain/src/repositories/flag-repository.ts
git commit -m "feat(domain): Flag entity + FlagRepository port"
```

---

### Task 8: BlockedTerm entity

**Files:**
- Create: `packages/domain/src/entities/blocked-term.ts`

**Interfaces:**
- Produces: `BlockedTerm` class with `matches(name: string): boolean` and `action: "block" | "review"`

- [ ] **Step 1: Write implementation (no separate test — covered by Product blocklist tests in Plan C)**

```typescript
// packages/domain/src/entities/blocked-term.ts

export type BlockedTermAction = "block" | "review";

export class BlockedTerm {
  private constructor(
    public readonly id: string,
    public readonly pattern: string,
    public readonly action: BlockedTermAction,
    public readonly createdAt: Date,
  ) {}

  static create(props: {
    id: string;
    pattern: string;
    action: BlockedTermAction;
    createdAt?: Date;
  }): BlockedTerm {
    return new BlockedTerm(props.id, props.pattern.trim().toLowerCase(), props.action, props.createdAt ?? new Date());
  }

  matches(name: string): boolean {
    return name.toLowerCase().includes(this.pattern);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/domain/src/entities/blocked-term.ts
git commit -m "feat(domain): BlockedTerm entity"
```

---

### Task 9: Update Place entity (drop category, add createdById)

**Files:**
- Modify: `packages/domain/src/entities/place.ts`

**Interfaces:**
- Produces: `Place` without `category`; with optional `createdById`; invariant: name ≥ 2 chars (unchanged)

- [ ] **Step 1: Edit the Place entity**

Replace the entire `packages/domain/src/entities/place.ts` with:

```typescript
// packages/domain/src/entities/place.ts
import { Coordinates } from "../value-objects/coordinates.js";
import { ValidationError } from "../errors/domain-error.js";

export class Place {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly coords: Coordinates,
    public readonly address: string | undefined,
    public readonly createdById: string | undefined,
    public readonly createdAt: Date,
  ) {}

  static create(props: {
    id: string;
    name: string;
    coords: Coordinates;
    address?: string;
    createdById?: string;
    createdAt?: Date;
  }): Place {
    if (props.name.trim().length < 2) {
      throw new ValidationError("Place name must be at least 2 characters");
    }
    return new Place(
      props.id,
      props.name.trim(),
      props.coords,
      props.address,
      props.createdById,
      props.createdAt ?? new Date(),
    );
  }
}
```

- [ ] **Step 2: Run all domain tests to ensure no breakage**

```bash
pnpm --filter @app/domain test
```

Expected: all tests pass (coordinates.test, email.test, price.test, user.test, product.test, discovery.test, flag.test).

- [ ] **Step 3: Commit**

```bash
git add packages/domain/src/entities/place.ts
git commit -m "refactor(domain): Place entity — drop category, add createdById (AT-013)"
```

---

### Task 10: Update domain index to export everything

**Files:**
- Modify: `packages/domain/src/index.ts`

**Interfaces:**
- Produces: all entities, VOs, repositories exported from `@app/domain`

- [ ] **Step 1: Replace index.ts**

```typescript
// packages/domain/src/index.ts

// Errors
export * from "./errors/domain-error.js";

// Value Objects
export * from "./value-objects/coordinates.js";
export * from "./value-objects/email.js";
export * from "./value-objects/price.js";

// Entities
export * from "./entities/place.js";
export * from "./entities/user.js";
export * from "./entities/product.js";
export * from "./entities/discovery.js";
export * from "./entities/flag.js";
export * from "./entities/blocked-term.js";

// Repositories (interfaces / ports)
export * from "./repositories/place-repository.js";
export * from "./repositories/user-repository.js";
export * from "./repositories/product-repository.js";
export * from "./repositories/discovery-repository.js";
export * from "./repositories/flag-repository.js";

// Ports
export * from "./ports/logger.js";
export * from "./ports/geocoding.js";
```

- [ ] **Step 2: Build domain to verify exports compile**

```bash
pnpm --filter @app/domain build
```

Expected: build succeeds with no TS errors.

- [ ] **Step 3: Commit**

```bash
git add packages/domain/src/index.ts
git commit -m "feat(domain): export all entities, VOs, and repository ports (AT-013)"
```

---

### Task 11: Update Prisma schema with full MVP model (AT-014)

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `User`, `Product`, `Place`, `Discovery`, `Flag`, `BlockedTerm` models with PostGIS; `pg_trgm` extension for fuzzy search

- [ ] **Step 1: Replace schema.prisma**

```prisma
// prisma/schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [postgis, pg_trgm]
}

model User {
  id          String   @id @default(uuid())
  email       String   @unique
  displayName String?
  role        String   @default("user") // "user" | "admin"
  createdAt   DateTime @default(now())

  places   Place[]
  products Product[]
  discoveries Discovery[]
  flags     Flag[]

  @@map("users")
}

model Product {
  id            String   @id @default(uuid())
  name          String
  normalizedKey String   @unique
  status        String   @default("active") // "active" | "under_review" | "blocked"
  description   String?
  imageUrl      String?
  createdById   String
  createdAt     DateTime @default(now())

  createdBy  User       @relation(fields: [createdById], references: [id])
  discoveries  Discovery[]

  @@index([normalizedKey])
  @@map("products")
}

model Place {
  id          String   @id @default(uuid())
  name        String
  // PostGIS geography point (WGS84)
  location    Unsupported("geography(Point, 4326)")
  address     String?
  createdById String?
  createdAt   DateTime @default(now())

  createdBy  User?      @relation(fields: [createdById], references: [id])
  discoveries  Discovery[]

  @@map("places")
}

model Discovery {
  id          String   @id @default(uuid())
  productId   String
  placeId     String
  price       Decimal  @db.Decimal(10, 2)
  quantity    Int
  reporterId  String
  note        String?
  // Denormalised location for cheap nearby queries without Place join
  location    Unsupported("geography(Point, 4326)")
  createdAt   DateTime @default(now())
  expiresAt   DateTime
  hiddenAt    DateTime? // set when admin hides due to a flag

  product   Product @relation(fields: [productId], references: [id])
  place     Place   @relation(fields: [placeId], references: [id])
  reporter  User    @relation(fields: [reporterId], references: [id])
  flags     Flag[]

  @@map("discoveries")
}

model Flag {
  id         String   @id @default(uuid())
  targetType String   // "product" | "discovery"
  targetId   String
  reason     String   // "illegal" | "inappropriate" | "spam" | "wrong_info" | "other"
  comment    String?
  reporterId String
  status     String   @default("open") // "open" | "actioned" | "dismissed"
  createdAt  DateTime @default(now())

  reporter   User      @relation(fields: [reporterId], references: [id])
  discovery   Discovery? @relation(fields: [targetId], references: [id], map: "flag_discovery_fk")

  @@map("flags")
}

model BlockedTerm {
  id        String   @id @default(uuid())
  pattern   String   @unique
  action    String   @default("block") // "block" | "review"
  createdAt DateTime @default(now())

  @@map("blocked_terms")
}

model MagicCode {
  id        String   @id @default(uuid())
  email     String
  code      String
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([email, code])
  @@map("magic_codes")
}
```

- [ ] **Step 2: Commit schema before generating migration**

```bash
git add prisma/schema.prisma
git commit -m "feat(infra): full MVP Prisma schema — User, Product, Place, Discovery, Flag, BlockedTerm (AT-014)"
```

---

### Task 12: Create and apply PostGIS migration (AT-014, AT-015)

**Files:**
- Create: `prisma/migrations/<timestamp>_full_mvp_schema/migration.sql`

**Interfaces:**
- Produces: all tables with GiST spatial indexes and `pg_trgm` index on `products.name`

- [ ] **Step 1: Start Docker Compose**

```bash
docker compose up -d db
docker compose ps
```

Expected: `db` service is `healthy`.

- [ ] **Step 2: Generate migration**

```bash
pnpm db:migrate
```

If no `db:migrate` script exists yet, run:

```bash
npx prisma migrate dev --name full_mvp_schema
```

Expected: migration SQL file created in `prisma/migrations/`, applied successfully.

- [ ] **Step 3: Add GiST indexes via raw SQL in migration file**

Open the generated migration SQL file (`prisma/migrations/<timestamp>_full_mvp_schema/migration.sql`) and append at the end:

```sql
-- PostGIS GiST index for spatial queries on places and discoveries
CREATE INDEX places_location_idx ON places USING GIST (location);
CREATE INDEX discoveries_location_idx ON discoveries USING GIST (location);

-- pg_trgm index for fuzzy product name search
CREATE INDEX products_name_trgm_idx ON products USING GIN (name gin_trgm_ops);
CREATE INDEX products_normalized_key_trgm_idx ON products USING GIN (normalized_key gin_trgm_ops);
```

Then reset and re-apply to include those indexes:

```bash
npx prisma migrate reset --force && npx prisma migrate dev
```

Expected: all migrations applied, Prisma client regenerated.

- [ ] **Step 4: Verify tables exist**

```bash
docker compose exec db psql -U app -d app -c "\dt"
```

Expected: `users`, `products`, `places`, `discoveries`, `flags`, `blocked_terms`, `magic_codes` in table list.

- [ ] **Step 5: Commit migration**

```bash
git add prisma/
git commit -m "feat(infra): PostGIS migration with GiST + pg_trgm indexes (AT-014, AT-015)"
```

---

### Task 13: Run full domain test suite

- [ ] **Step 1: Run all domain tests**

```bash
pnpm --filter @app/domain test --coverage
```

Expected: all 18+ tests passing, coverage report generated.

- [ ] **Step 2: Commit any missing test additions**

```bash
git add packages/domain/src/
git commit -m "test(domain): full domain unit test coverage (AT-100)"
```

---

## Self-Review Checklist

- [x] **AT-005** — lockfile committed, clean install verified
- [x] **AT-013** — Place→Discovery evolution; User, Product, Discovery, Flag, BlockedTerm entities created
- [x] **AT-014** — PostGIS schema with GiST indexes and pg_trgm
- [x] **AT-015** — `db:migrate` runs against Docker DB
- [x] **AT-016** — freshness/expiry rule in `Discovery.isFresh()` + `DISCOVERY_DEFAULT_TTL_MS`
- [x] **AT-100** — domain unit tests for all entities and value objects
- [x] No placeholders — every step has real code
- [x] Types consistent: `Price` used in Discovery; `Email` used in User; `Coordinates` used in Discovery and Place

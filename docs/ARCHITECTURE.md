# PWA Monorepo — Architecture Guide

A blueprint for building an installable Progressive Web App as a full‑stack TypeScript monorepo, structured around **Clean Architecture**, **SOLID**, and **Clean Code**.

**Stack decisions (locked in):**

| Concern | Choice |
|---|---|
| Package manager | **pnpm** (workspaces) |
| Build orchestrator | **Turborepo** |
| Frontend | **React** (Vite) as an installable **PWA** |
| Map rendering | **MapLibre GL JS** (open source, no key) |
| Map tiles | **MapTiler** free tier → migrate to self-hosted **Protomaps/PMTiles** |
| Geolocation | browser **Geolocation API** (free) |
| Geocoding | **LocationIQ** free tier / self-host **Nominatim**+**Photon** |
| Spatial data | **PostGIS** (free Postgres extension) |
| Styling | **Tailwind CSS v4** |
| Client state | **Zustand** |
| Server state / data fetching | **TanStack Query** |
| Validation & schemas | **Zod** (single source of truth) |
| Backend | **Node + TypeScript** (**NestJS**) |
| ORM / data access | **Prisma** |
| Error handling | typed **domain errors** + global exception filter |
| Logging | **pino** behind a `Logger` port (structured, correlated) |
| Database | **PostgreSQL** |
| Containers | **Docker** + **docker-compose** (local build & test) |
| Language everywhere | **TypeScript** (end-to-end type safety) |

---

## 1. Why these choices

**pnpm** — For a monorepo, pnpm is the strongest option. It uses a content-addressed global store (far less disk, faster installs), the `workspace:` protocol for linking internal packages, and — most importantly for Clean Architecture — **strict dependency isolation**: a package can only import what it explicitly declares. This kills "phantom dependencies" and physically enforces your layer boundaries.

**Turborepo** — Orchestrates tasks across packages with a dependency graph and caching. `turbo run build` only rebuilds what changed; `turbo run lint test` runs in parallel. It turns a many-package repo into something fast to work in.

**NestJS** — Its built-in dependency injection container maps almost one-to-one onto Clean Architecture. You define a port (interface) in the domain, bind it to an implementation in a module, and inject it into a use case. That's the Dependency Inversion Principle handed to you for free. Express/Fastify can do the same but you wire the container yourself.

**Prisma** — Schema-first, type-safe client, painless migrations. Important nuance covered in §5: **Prisma models are an infrastructure detail, not your domain entities.**

**End-to-end TypeScript** — The single biggest payoff of this monorepo: define entities, DTOs, and validation **once** in a shared package and consume them in both the React app and the API. No drift, no codegen step, refactors are type-checked across the whole stack.

**Zod, Zustand, TanStack Query** — These three split the frontend's concerns cleanly:

- **Zod** is the single source of truth for every schema. You write the schema once in `packages/contracts`, derive the TypeScript type with `z.infer`, and reuse the *same* object to validate at runtime — on the backend (incoming requests) and the frontend (API responses, forms). One definition, compile-time types *and* runtime safety.
- **Zustand** owns **client state** — things the server doesn't know or care about: theme, sidebar open/closed, multi-step form progress, optimistic UI flags, auth token in memory. Tiny, hook-based, no boilerplate, no provider tree.
- **TanStack Query** owns **server state** — anything that lives in the database and is fetched over HTTP. It handles caching, background refetching, deduping, retries, loading/error states, pagination, and cache invalidation after mutations. This is the rule that keeps a React codebase sane: **never store server data in Zustand.** Let Query be the cache.

---

## 2. The dependency rule (the one rule that matters)

Clean Architecture has exactly one hard rule:

> **Source code dependencies point only inward, toward higher-level policy.**

Concentric layers, from innermost to outermost:

```
        ┌─────────────────────────────────────────────┐
        │            Frameworks & Drivers              │  ← NestJS, React, Prisma, Postgres, HTTP
        │   ┌─────────────────────────────────────┐    │
        │   │        Interface Adapters           │    │  ← controllers, presenters, repository impls
        │   │   ┌─────────────────────────────┐   │    │
        │   │   │       Application           │   │    │  ← use cases (interactors)
        │   │   │   ┌─────────────────────┐   │   │    │
        │   │   │   │      Domain         │   │   │    │  ← entities, value objects, ports
        │   │   │   └─────────────────────┘   │   │    │
        │   │   └─────────────────────────────┘   │    │
        │   └─────────────────────────────────────┘    │
        └─────────────────────────────────────────────┘

   Dependencies always point inward  ───────────────►
   The domain knows NOTHING about the outer layers.
```

- **Domain** depends on nothing. No Prisma, no NestJS, no HTTP. Pure TypeScript.
- **Application** depends only on the domain.
- **Interface adapters** (controllers, repository implementations) depend on application + domain.
- **Frameworks** (Nest, React, Prisma, Postgres) sit on the outside and are plugged in.

Inner layers talk to the outside world only through **interfaces (ports)** they define themselves. The outer layers provide the implementations. This is the Dependency Inversion Principle, and it's what makes the core testable and framework-agnostic.

---

## 3. Repository layout

```
my-app/
├── apps/
│   ├── web/                      # React PWA (Vite + vite-plugin-pwa)
│   │   ├── src/
│   │   │   ├── app/              # routing, providers (QueryClientProvider), app shell
│   │   │   ├── features/         # feature-sliced (each: ui/ model/ api/)
│   │   │   │                     #   ui/    React components
│   │   │   │                     #   model/ Zustand stores + view logic
│   │   │   │                     #   api/   TanStack Query hooks + Zod-validated fetchers
│   │   │   ├── shared/           # design-system-agnostic helpers, hooks
│   │   │   └── main.tsx
│   │   ├── public/
│   │   │   ├── manifest.webmanifest
│   │   │   └── icons/
│   │   ├── vite.config.ts        # PWA plugin / Workbox config
│   │   └── package.json
│   │
│   └── api/                      # NestJS backend (the "outer" layers)
│       ├── src/
│       │   ├── modules/
│       │   │   └── <feature>/
│       │   │       ├── application/      # use cases live here (or in packages/application)
│       │   │       ├── infrastructure/   # Prisma repository implementations (adapters)
│       │   │       ├── presentation/     # controllers, request/response mappers
│       │   │       └── <feature>.module.ts
│       │   ├── shared/                   # cross-cutting:
│       │   │   ├── errors/               #   AllExceptionsFilter (domain error → HTTP)
│       │   │   ├── logging/              #   pino Logger adapter (implements Logger port)
│       │   │   ├── guards/ interceptors/ #   auth, etc.
│       │   │   └── prisma.service.ts
│       │   └── main.ts
│       └── package.json
│
├── packages/
│   ├── domain/                   # ⭐ Pure domain: entities, value objects, ports. Zero deps.
│   │   ├── src/
│   │   │   ├── entities/
│   │   │   ├── value-objects/
│   │   │   ├── repositories/     # interfaces (ports), e.g. UserRepository
│   │   │   ├── ports/            # other ports, e.g. Logger
│   │   │   └── errors/           # typed domain-error hierarchy (DomainError + subclasses)
│   │   └── package.json
│   │
│   ├── application/              # (optional) framework-agnostic use cases shared if needed
│   │   └── src/use-cases/
│   │
│   ├── contracts/               # ⭐ Shared API contract: DTOs + Zod schemas
│   │   └── src/                  # consumed by BOTH web and api
│   │
│   ├── ui/                      # (optional) shared React component library
│   │
│   └── config/                  # shared tsconfig, eslint, prettier presets
│       ├── tsconfig/
│       ├── eslint/
│       └── package.json
│
├── prisma/
│   ├── schema.prisma            # DB schema (infrastructure concern)
│   └── migrations/
│
├── docker/
│   ├── api.Dockerfile
│   └── web.Dockerfile
│
├── docker-compose.yml           # postgres + api + web for local dev/test
├── turbo.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .env.example
└── package.json                 # root: scripts + devDependencies only
```

**Key idea:** `packages/domain` and `packages/application` are the **inner circle** and live as standalone packages with no framework dependencies. `apps/api` and `apps/web` are the **outer circle** — they import inward, never the reverse. pnpm's strict isolation makes an accidental wrong-direction import fail at install/build time.

`pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

---

## 4. Mapping the layers to the monorepo

| Clean Architecture layer | Where it lives | May depend on | Must NOT import |
|---|---|---|---|
| **Domain** | `packages/domain` | nothing | Prisma, Nest, React, HTTP, `contracts` |
| **Application** (use cases) | `packages/application` or `apps/api/.../application` | `domain` | Prisma, Nest, React |
| **Interface adapters** | `apps/api/.../infrastructure` & `.../presentation` | `application`, `domain`, `contracts` | React |
| **Frameworks & drivers** | `apps/api` (Nest), `apps/web` (React), `prisma/` | everything inward | — |
| **Shared contract** | `packages/contracts` | nothing (or `zod`) | domain internals |

A request flows **inward then back out**:

```
HTTP request
  → Controller (presentation)        validates input against a contracts/ Zod schema
    → Use Case (application)          orchestrates domain logic
      → Domain entity / VO            enforces business invariants
      → Repository PORT (domain)      interface only
        → Repository IMPL (infra)     Prisma talks to Postgres
  ← Use Case returns a domain result
← Controller maps result → contracts/ DTO → JSON response
```

The controller and the Prisma repository are **plugins**. Swap NestJS for Fastify, or Prisma for Drizzle, and the domain + use cases don't change a line.

---

## 5. Schemas & entities — the layer that trips everyone up

There are **three distinct representations** of "a thing" and conflating them is the most common Clean Architecture mistake:

1. **Prisma model** (`schema.prisma`) — a *persistence* shape. Columns, relations, indexes. This is infrastructure.
2. **Domain entity** (`packages/domain`) — a *behavior* shape. Encapsulates invariants and business rules. Knows nothing about the database.
3. **DTO / contract** (`packages/contracts`) — a *transport* shape. What crosses the network between API and PWA, validated with Zod.

You map between them at the boundaries. Yes, it's more code than passing the Prisma object straight through — but it's what keeps your business rules independent of the database and the wire format.

**Prisma model** (`prisma/schema.prisma`) — infrastructure:

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  createdAt DateTime @default(now())
}
```

**Domain entity** (`packages/domain/src/entities/user.ts`) — pure, enforces invariants:

```ts
import { Email } from "../value-objects/email";

export class User {
  private constructor(
    public readonly id: string,
    public readonly email: Email,
    public readonly name: string,
    public readonly createdAt: Date,
  ) {}

  // Factory enforces invariants — you cannot build an invalid User.
  static create(props: { id: string; email: string; name: string; createdAt?: Date }): User {
    if (props.name.trim().length < 2) {
      throw new DomainError("Name must be at least 2 characters");
    }
    return new User(props.id, Email.create(props.email), props.name.trim(), props.createdAt ?? new Date());
  }
}
```

**Value object** (`packages/domain/src/value-objects/email.ts`) — self-validating:

```ts
export class Email {
  private constructor(public readonly value: string) {}
  static create(raw: string): Email {
    const v = raw.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) throw new DomainError("Invalid email");
    return new Email(v);
  }
}
```

**Port** (`packages/domain/src/repositories/user-repository.ts`) — interface only:

```ts
import { User } from "../entities/user";

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
}
```

**Shared contract** (`packages/contracts/src/user.ts`) — DTO + validation, used by web *and* api:

```ts
import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;

export const userResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  createdAt: z.string().datetime(),
});

export type UserResponse = z.infer<typeof userResponseSchema>;
```

**Repository implementation** (`apps/api/.../infrastructure/prisma-user.repository.ts`) — the adapter, maps Prisma ⇄ domain:

```ts
import { UserRepository, User } from "@app/domain";
import { PrismaService } from "../../shared/prisma.service";

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? User.create(row) : null;          // map persistence → domain
  }

  async save(user: User): Promise<void> {
    await this.prisma.user.upsert({
      where: { id: user.id },
      create: { id: user.id, email: user.email.value, name: user.name, createdAt: user.createdAt },
      update: { email: user.email.value, name: user.name },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email } });
    return row ? User.create(row) : null;
  }
}
```

**Use case** (`packages/application/src/use-cases/create-user.ts`) — depends only on the port:

```ts
import { User, UserRepository, DomainError } from "@app/domain";

export class CreateUser {
  constructor(private readonly users: UserRepository) {}   // depends on the interface

  async execute(input: { id: string; email: string; name: string }): Promise<User> {
    if (await this.users.findByEmail(input.email)) {
      throw new DomainError("Email already in use");
    }
    const user = User.create(input);    // invariants enforced here
    await this.users.save(user);
    return user;
  }
}
```

**Controller** (`apps/api/.../presentation/user.controller.ts`) — wires it together:

```ts
@Controller("users")
export class UserController {
  constructor(private readonly createUser: CreateUser) {}

  @Post()
  async create(@Body() body: unknown): Promise<UserResponse> {
    const dto = createUserSchema.parse(body);                 // validate at the boundary
    const user = await this.createUser.execute({ id: crypto.randomUUID(), ...dto });
    return { id: user.id, email: user.email.value, name: user.name, createdAt: user.createdAt.toISOString() };
  }
}
```

NestJS module binds the port to the implementation (Dependency Inversion in action):

```ts
@Module({
  controllers: [UserController],
  providers: [
    PrismaService,
    { provide: "UserRepository", useClass: PrismaUserRepository },
    { provide: CreateUser, useFactory: (r: UserRepository) => new CreateUser(r), inject: ["UserRepository"] },
  ],
})
export class UserModule {}
```

---

## 6. SOLID, applied to this structure

- **S — Single Responsibility.** Each use case does one thing (`CreateUser`, not `UserService.doEverything`). Controllers only translate HTTP ⇄ use case. Repositories only persist.
- **O — Open/Closed.** New behavior = new use case or new adapter, not edits to the domain core. Add a `CachedUserRepository` that wraps the Prisma one without touching callers.
- **L — Liskov Substitution.** Any `UserRepository` implementation (Prisma, in-memory for tests, cached) is interchangeable because they honor the same contract.
- **I — Interface Segregation.** Keep ports small and role-specific (`UserReader` vs `UserWriter`) rather than one fat repository, so consumers depend only on what they use.
- **D — Dependency Inversion.** Use cases depend on the `UserRepository` *interface* in the domain; the concrete Prisma class is injected by Nest. High-level policy never imports low-level detail.

**Clean Code habits to enforce via tooling (§8):** intention-revealing names, small functions, no magic values (use value objects/enums), errors as typed domain errors rather than thrown strings, and no business logic leaking into controllers or React components.

---

## 6a. Cross-cutting concerns — error handling & logging

Errors and logging touch *every* layer, so they're handled as cross-cutting concerns: an abstraction in the core, a concrete implementation on the edge, and a single boundary where everything is normalized. Done right, the domain throws meaningful errors and writes meaningful logs **without ever importing NestJS, pino, or HTTP.**

### Smart error handling

The strategy has three parts: **typed errors in the core**, **one translation point at the boundary**, and **a consistent error contract on the wire.**

**1. A typed domain-error hierarchy** (`packages/domain/src/errors/`) — pure, expressive, and carries a stable `code`:

```ts
// packages/domain/src/errors/domain-error.ts
export abstract class DomainError extends Error {
  abstract readonly code: string;        // stable, machine-readable (e.g. "USER_NOT_FOUND")
  readonly details?: unknown;
  constructor(message: string, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.details = details;
  }
}

export class ValidationError extends DomainError { readonly code = "VALIDATION_ERROR"; }
export class NotFoundError   extends DomainError { readonly code = "NOT_FOUND"; }
export class ConflictError   extends DomainError { readonly code = "CONFLICT"; }
export class UnauthorizedError extends DomainError { readonly code = "UNAUTHORIZED"; }
export class ForbiddenError  extends DomainError { readonly code = "FORBIDDEN"; }
```

Now the domain and use cases throw *intent*, not HTTP:

```ts
// use case
if (await this.users.findByEmail(input.email)) {
  throw new ConflictError("Email already in use", { email: input.email });
}
// repository / domain
if (!row) throw new NotFoundError(`User ${id} not found`);
```

**2. One translation point** — a global exception filter (NestJS) is the *only* place that knows the mapping from domain error → HTTP status. Nothing inner deals with status codes:

```ts
// apps/api/src/shared/errors/all-exceptions.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from "@nestjs/common";
import { ZodError } from "zod";
import { DomainError, NotFoundError, ConflictError, ValidationError,
         UnauthorizedError, ForbiddenError } from "@app/domain";

const STATUS = new Map<Function, number>([
  [ValidationError, 400], [UnauthorizedError, 401], [ForbiddenError, 403],
  [NotFoundError, 404], [ConflictError, 409],
]);

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(err: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();
    const requestId = req.id;                      // set by logging middleware (below)

    let status = 500;
    let code = "INTERNAL_ERROR";
    let message = "Something went wrong";
    let details: unknown;

    if (err instanceof DomainError) {
      status = STATUS.get(err.constructor) ?? 400;
      code = err.code; message = err.message; details = err.details;
    } else if (err instanceof ZodError) {
      status = 400; code = "VALIDATION_ERROR"; message = "Invalid input"; details = err.flatten();
    } else if (err instanceof HttpException) {
      status = err.getStatus(); message = err.message;
    }

    // 5xx = unexpected → log as error with stack; 4xx = expected → log as warn
    req.log?.[status >= 500 ? "error" : "warn"]({ err, code, requestId }, message);

    res.status(status).json({ error: { code, message, details, requestId } });
  }
}
```

**3. A consistent error contract** (`packages/contracts/src/errors.ts`) — so the frontend parses errors with the same rigor as success responses:

```ts
import { z } from "zod";
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    requestId: z.string().optional(),
  }),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
```

**4. Frontend handling** — TanStack Query centralizes it. A typed fetch wrapper turns any non-2xx into a typed error, and React error boundaries catch render-time failures:

```ts
// apps/web/src/shared/api/http.ts
import { errorResponseSchema, type ErrorResponse } from "@app/contracts";

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly body: ErrorResponse) {
    super(body.error.message);
  }
}

export async function http<T>(input: string, schema: { parse: (d: unknown) => T }, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, errorResponseSchema.parse(json));
  return schema.parse(json);
}
```

Then global UX (toast on error, retry rules by status) lives in the `QueryClient`:

```ts
new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2, // don't retry 4xx
    },
  },
  queryCache: new QueryCache({ onError: (e) => { if (e instanceof ApiError) toast.error(e.message); } }),
});
```

**The payoff:** every error has a stable `code`, a human message, optional `details`, and a `requestId` that ties the client error straight back to a server log line. Expected failures (4xx) are distinguished from bugs (5xx) automatically.

### Logging — structured, correlated, and layer-aware

Same Clean Architecture move: **depend on a `Logger` interface, inject a concrete one.** The core logs through the port; only the edge knows it's pino.

**1. The port** (`packages/domain/src/ports/logger.ts`) — zero dependencies:

```ts
export interface Logger {
  debug(meta: object, msg: string): void;
  info(meta: object, msg: string): void;
  warn(meta: object, msg: string): void;
  error(meta: object, msg: string): void;
  child(bindings: object): Logger;     // for per-request / per-feature context
}
```

Use cases receive it by injection (DIP) and log domain-meaningful events — never `console.log`:

```ts
export class CreateUser {
  constructor(private readonly users: UserRepository, private readonly log: Logger) {}
  async execute(input: CreateUserInput) {
    this.log.info({ email: input.email }, "creating user");
    // ...
    this.log.info({ userId: user.id }, "user created");
    return user;
  }
}
```

**2. The implementation** (`apps/api`) — **pino** via `nestjs-pino`, the fastest structured logger for Node. JSON in production, pretty-printed in dev:

```ts
// apps/api/src/app.module.ts
import { LoggerModule } from "nestjs-pino";
LoggerModule.forRoot({
  pinoHttp: {
    level: process.env.LOG_LEVEL ?? "info",
    genReqId: (req) => req.headers["x-request-id"] ?? crypto.randomUUID(),  // correlation id
    redact: ["req.headers.authorization", "*.password"],                     // never log secrets
    transport: process.env.NODE_ENV !== "production" ? { target: "pino-pretty" } : undefined,
  },
});
```

**3. Correlation across layers.** `nestjs-pino` attaches a per-request child logger (with the `requestId`) to `req.log`. Pass that child into your use cases so *every* log line for one request — controller, use case, repository — shares the same id. That id is also returned in the error envelope above, so a user reporting "request `abc-123` failed" leads you straight to the full trace.

```
[req abc-123] info  controller  POST /users
[req abc-123] info  use-case    creating user            { email }
[req abc-123] warn  filter      CONFLICT                 { code, requestId }
```

**Logging rules of thumb:** structured key/value objects, not string concatenation; `info` for business events, `debug` for diagnostics, `warn` for expected failures, `error` (with stack) for bugs; never log secrets/PII (use `redact`); the domain logs *what happened* in business terms, the infrastructure logs *technical* detail. Frontend can stay light — console in dev, and optionally ship `error`-level events (with the `requestId`) to a service like Sentry in production.

---

## 7. The PWA layer (`apps/web`)

A PWA is a normal web app plus three things: a **web app manifest**, a **service worker**, and **HTTPS**. With Vite, `vite-plugin-pwa` (built on Workbox) handles the service worker and manifest generation.

`apps/web/vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";   // Tailwind v4 Vite plugin
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "My App",
        short_name: "MyApp",
        start_url: "/",
        display: "standalone",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        icons: [
          { src: "/icons/192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Cache the app shell; use network-first for API calls so data stays fresh.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api"),
            handler: "NetworkFirst",
            options: { cacheName: "api", networkTimeoutSeconds: 5 },
          },
        ],
      },
    }),
  ],
});
```

**PWA checklist:** installable manifest with maskable icons; service worker with a sensible caching strategy (app shell precached, API network-first); offline fallback page; served over HTTPS; Lighthouse PWA audit passing. The frontend imports request/response types straight from `packages/contracts`, so the client and server can never disagree about the API shape.

**Styling — Tailwind CSS v4.** v4 is **CSS-first**: there's no `tailwind.config.js` by default. You install the `@tailwindcss/vite` plugin (added above) and configure everything from your main stylesheet:

```css
/* apps/web/src/app/index.css */
@import "tailwindcss";

/* Design tokens live in @theme — they become utilities AND CSS variables */
@theme {
  --color-brand: #0f172a;
  --font-sans: "Inter", sans-serif;
}
```

Keep design tokens here as the single source of styling truth (mirror `theme_color` from the PWA manifest). Put shared, reusable components in `packages/ui` so both the app and any future apps consume one Tailwind-based design system. Tailwind v4 also benefits from a much faster engine and automatic content detection, so there's no `content: []` array to maintain.

**Feature-sliced UI:** organize `apps/web/src/features/<feature>/` into `ui/`, `model/`, and `api/` so the frontend has its own light version of separation of concerns — `ui/` components render, `model/` holds Zustand stores and view logic, the `api/` layer (TanStack Query hooks) is the only place that talks to the backend.

---

## 7a. Frontend state & data — Zod + Zustand + TanStack Query

The cardinal rule: **separate client state from server state.**

| Kind of state | Examples | Owned by |
|---|---|---|
| **Server state** | users, orders, anything from the DB over HTTP | **TanStack Query** (it *is* your cache) |
| **Client state** | theme, modals, sidebar, form wizard step, in-memory token | **Zustand** |
| **Schemas / validation** | request bodies, API responses, forms | **Zod** (from `packages/contracts`) |

**Never copy server data into Zustand.** Duplicating Query's cache into a store is the most common source of stale-data bugs. Read server data through Query; keep only UI/client concerns in Zustand.

### Zod as the boundary validator (frontend)

The same schemas defined in `packages/contracts` (§5) are reused here. Validate API responses so a backend change can't silently corrupt your UI:

```ts
// apps/web/src/features/user/api/user.api.ts
import { userResponseSchema, createUserSchema, type CreateUserDto } from "@app/contracts";

export async function fetchUser(id: string) {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error("Failed to load user");
  return userResponseSchema.parse(await res.json());   // runtime-safe, fully typed
}

export async function createUser(dto: CreateUserDto) {
  createUserSchema.parse(dto);                          // validate before sending
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error("Failed to create user");
  return userResponseSchema.parse(await res.json());
}
```

Pair Zod with React Hook Form via `@hookform/resolvers/zod` so forms validate against the exact same schema the API enforces.

### TanStack Query — server state

Set up one client and provider at the app root:

```ts
// apps/web/src/app/query-client.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});
```

Wrap query/mutation logic in feature hooks so components never call `fetch` directly:

```ts
// apps/web/src/features/user/api/user.queries.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchUser, createUser } from "./user.api";

const keys = {
  all: ["users"] as const,
  detail: (id: string) => [...keys.all, id] as const,
};

export function useUser(id: string) {
  return useQuery({ queryKey: keys.detail(id), queryFn: () => fetchUser(id) });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }), // refetch lists after a write
  });
}
```

A centralized `keys` factory per feature keeps cache invalidation predictable. Components just call `useUser(id)` and render `data` / `isLoading` / `error`.

### Zustand — client state

Small, typed stores scoped to a feature (or a global UI store). No provider needed:

```ts
// apps/web/src/features/ui/model/ui.store.ts
import { create } from "zustand";

interface UiState {
  theme: "light" | "dark";
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setTheme: (t: UiState["theme"]) => void;
}

export const useUiStore = create<UiState>((set) => ({
  theme: "light",
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setTheme: (theme) => set({ theme }),
}));
```

Select narrowly to avoid needless re-renders: `const theme = useUiStore((s) => s.theme);`. For values that should survive reload (theme, auth token), wrap the store in Zustand's `persist` middleware — and note this plays nicely with the PWA's offline goals. Keep persisted client state *small*; server data belongs to Query, not localStorage.

#### Scaling to complex state — the slices pattern

A single flat store becomes unmanageable once you have many features. The recommended approach (from Zustand's [Advanced TypeScript guide](https://zustand.docs.pmnd.rs/learn/guides/advanced-typescript)) is the **slices pattern**: split the store into independent, individually-typed slices and compose them into one bound store. This is Single Responsibility applied to client state — each slice owns its own concern and can even reuse another slice's actions via `get()`.

Two TypeScript rules from the guide make this type-safe:

- Always use the **curried** form `create<T>()(...)` — Zustand can't infer the state type otherwise (the state generic is invariant).
- Each slice is typed with `StateCreator<FullState, Mutators, [], ThisSlice>`, where `Mutators` is the tuple of middleware you apply (so `set`/`get` are typed against the *whole* store, not just the slice).

```ts
// apps/web/src/app/store/types.ts
import type { StateCreator } from "zustand";

// One place to declare the middleware mutators, shared by every slice.
export type Mutators = [["zustand/devtools", never], ["zustand/immer", never]];

// The full store = intersection of all slices.
export type AppStore = CartSlice & SessionSlice & UiSlice;

// A typed helper so slices don't repeat the generics.
export type SliceCreator<T> = StateCreator<AppStore, Mutators, [], T>;
```

```ts
// apps/web/src/features/cart/model/cart.slice.ts
import type { SliceCreator } from "../../../app/store/types";

export interface CartSlice {
  items: { id: string; qty: number }[];
  addItem: (id: string) => void;
  clear: () => void;
  total: () => number;
}

export const createCartSlice: SliceCreator<CartSlice> = (set, get) => ({
  items: [],
  // immer lets you "mutate" a draft — clean updates for deep/complex state.
  // 3rd set arg is the devtools action label → readable time-travel debugging.
  addItem: (id) =>
    set((s) => {
      const line = s.items.find((i) => i.id === id);
      if (line) line.qty += 1;
      else s.items.push({ id, qty: 1 });
    }, undefined, "cart/addItem"),
  clear: () => set((s) => { s.items = []; }, undefined, "cart/clear"),
  total: () => get().items.reduce((n, i) => n + i.qty, 0),  // derived value
});
```

Compose the slices into one store, applying middleware **once** at the root. Order matters: keep `devtools` outermost so no other middleware mutates `setState` after it:

```ts
// apps/web/src/app/store/index.ts
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { AppStore } from "./types";
import { createCartSlice } from "../../features/cart/model/cart.slice";
import { createSessionSlice } from "../../features/session/model/session.slice";
import { createUiSlice } from "../../features/ui/model/ui.slice";

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      immer((...a) => ({
        ...createCartSlice(...a),
        ...createSessionSlice(...a),
        ...createUiSlice(...a),
      })),
      { name: "app-store", partialize: (s) => ({ theme: s.theme }) }, // persist only client prefs
    ),
    { name: "AppStore" },
  ),
);
```

> If you add `persist` to the *types* tuple as well, use `["zustand/persist", unknown]` — the guide notes passing `unknown` is the reliable choice for the persisted-state type parameter.

**Selecting complex state without re-render storms.** When a component needs several fields at once, wrap the selector in `useShallow` so it only re-renders when one of those values actually changes:

```ts
import { useShallow } from "zustand/react/shallow";

const { items, total } = useAppStore(useShallow((s) => ({ items: s.items, total: s.total() })));
const addItem = useAppStore((s) => s.addItem);   // actions are stable — select them individually
```

This keeps a large, multi-feature store fast and fully typed: slices give you modular ownership, `immer` makes deep updates readable, `devtools` gives labeled time-travel debugging, `persist` survives reloads, and `useShallow` guards rendering performance.

### How they work together in one component

```
Component
  ├─ useUser(id)            ← TanStack Query: server data + cache/loading/error
  ├─ useUiStore(s => s.theme)  ← Zustand: client/UI state
  └─ onSubmit → useCreateUser().mutate(dto)
                 dto validated by Zod (createUserSchema) before the request,
                 response validated by Zod (userResponseSchema) after,
                 cache invalidated on success → list refetches automatically.
```

This keeps each concern in exactly one place: **Zod** guarantees shape, **Query** owns the server cache, **Zustand** owns the UI. None of them leak into the others.

---

## 7b. Maps & geolocation (budget-first)

A map feature is really **four separable services**, and decoupling them is what keeps costs near zero — you pick the cheapest option for each and swap any one later without touching the rest:

1. **Rendering library** — draws the map in the browser.
2. **Tiles** — the actual map imagery/vector data it draws.
3. **Geolocation** — where the *user* is.
4. **Geo services** — geocoding (address ⇄ coordinates) and routing/directions.

### Recommended free-friendly stack

| Concern | Pick | Why / free terms (verified June 2026) |
|---|---|---|
| **Rendering** | **MapLibre GL JS** | Fully open-source fork of Mapbox GL (which went proprietary at v2). No API key, no license cost, ever. WebGL vector tiles, 3D, custom styles. The safe long-term core. |
| **Tiles (start)** | **MapTiler** free tier | 100k tile requests + 5k map sessions/month, 100 MB hosting. On the free plan service simply *pauses* at quota — no surprise bill. Fastest way to ship. |
| **Tiles (scale)** | **Protomaps / PMTiles** self-hosted | A single-file tile archive on object storage (Cloudflare R2 / S3) + CDN. MapLibre reads it via HTTP range requests — **no tile server to run**. Effectively free at small scale. Migrate here when MapTiler quota gets tight. |
| **Geolocation** | Browser **Geolocation API** | Built into every browser, free. `navigator.geolocation`. |
| **Geocoding** | **LocationIQ** free tier (5k/day) | Nominatim-compatible (swap base URL later). Self-host **Nominatim** (search) + **Photon** (autocomplete) when you want zero per-request cost. |
| **Routing** (if needed) | **OpenRouteService** free tier | Directions, isochrones, matrix; car/bike/foot/wheelchair. Self-hostable. Only add if the product needs turn-by-turn. |
| **Spatial storage** | **PostGIS** | Free Postgres extension — you already run Postgres, so spatial queries cost nothing extra. |

> **Avoid for now:** Mapbox and Google Maps. Mapbox's free tier is decent (50k loads/mo) but requires a card on file and has *no hard spend cap* — a traffic spike can produce a shock bill. Google is the most expensive. Neither fits "early product, little money."

### Where map/geo concerns live in the architecture

Same dependency rule. The **domain** models geography abstractly; the **outside** provides the implementations, so a provider swap (LocationIQ → self-hosted Nominatim) never reaches your business logic.

**Domain** — a `Coordinates` value object (self-validating) and ports for the external services:

```ts
// packages/domain/src/value-objects/coordinates.ts
import { ValidationError } from "../errors/domain-error";
export class Coordinates {
  private constructor(public readonly lat: number, public readonly lng: number) {}
  static create(lat: number, lng: number): Coordinates {
    if (lat < -90 || lat > 90)   throw new ValidationError("Latitude out of range");
    if (lng < -180 || lng > 180) throw new ValidationError("Longitude out of range");
    return new Coordinates(lat, lng);
  }
}
```

```ts
// packages/domain/src/ports/geocoding.ts   (provider-agnostic)
import { Coordinates } from "../value-objects/coordinates";
export interface GeocodingService {
  search(query: string): Promise<{ label: string; coords: Coordinates }[]>;
  reverse(coords: Coordinates): Promise<string | null>;
}

// packages/domain/src/repositories/place-repository.ts
export interface PlaceRepository {
  findNearby(center: Coordinates, radiusMeters: number): Promise<Place[]>;
}
```

**Infrastructure** — PostGIS does the spatial heavy lifting. Note: **Prisma has no native geometry type**, so model the column as `Unsupported(...)` and run spatial queries with `$queryRaw`:

```prisma
model Place {
  id       String @id @default(uuid())
  name     String
  // PostGIS geography point (WGS84 / SRID 4326)
  location Unsupported("geography(Point, 4326)")
}
```

Add a GiST index in a migration (`CREATE INDEX place_location_idx ON "Place" USING GIST (location);`) — this is what makes "find places near me" fast. The repository implements the port:

```ts
// apps/api/.../infrastructure/postgis-place.repository.ts
async findNearby(center: Coordinates, radius: number): Promise<Place[]> {
  const rows = await this.prisma.$queryRaw<{ id: string; name: string; lat: number; lng: number }[]>`
    SELECT id, name,
           ST_Y(location::geometry) AS lat,
           ST_X(location::geometry) AS lng
    FROM "Place"
    WHERE ST_DWithin(location,
          ST_MakePoint(${center.lng}, ${center.lat})::geography, ${radius})
    ORDER BY location <-> ST_MakePoint(${center.lng}, ${center.lat})::geography
    LIMIT 50;`;
  return rows.map((r) => Place.create({ id: r.id, name: r.name, coords: Coordinates.create(r.lat, r.lng) }));
}
```

The `GeocodingService` adapter (a small LocationIQ HTTP client) implements the same port — swap it for a Nominatim client later by changing one binding in the Nest module.

**Cost control built into the design:**

- **Cache geocoding results in PostGIS.** Geocoding the same address twice wastes quota — store the result the first time. A use case checks the DB before calling the external service.
- **Proxy provider keys through the API.** Don't ship secret keys in the bundle; the backend calls the geocoding/routing provider (and can rate-limit + cache). For tiles, use a domain-restricted key or your self-hosted PMTiles.
- **TanStack Query caching** dedupes and caches map data requests on the client; the **service worker** (§7) can cache tiles so the PWA both works offline *and* makes fewer billable tile requests.

### Frontend integration

A `features/map` slice fits the existing pattern. Use **`react-map-gl`** (its `/maplibre` entrypoint) or MapLibre directly; geolocation is a small hook; map UI state (selected marker, popup) goes in a Zustand slice; nearby/geocoding fetches go through TanStack Query.

```ts
// apps/web/src/features/map/model/use-geolocation.ts
export function useGeolocation() {
  const [state, setState] = useState<{ coords?: { lat: number; lng: number }; error?: string }>({});
  useEffect(() => {
    if (!("geolocation" in navigator)) return setState({ error: "Geolocation unsupported" });
    const id = navigator.geolocation.watchPosition(
      (p) => setState({ coords: { lat: p.coords.latitude, lng: p.coords.longitude } }),
      (e) => setState({ error: e.message }),
      { enableHighAccuracy: true, maximumAge: 10_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);
  return state;   // ask permission on user action, and always handle the denied/unsupported case
}
```

```tsx
// apps/web/src/features/map/ui/MapView.tsx
import Map, { Marker } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

export function MapView({ center }: { center: { lat: number; lng: number } }) {
  return (
    <Map
      initialViewState={{ longitude: center.lng, latitude: center.lat, zoom: 13 }}
      mapStyle={`https://api.maptiler.com/maps/streets-v2/style.json?key=${import.meta.env.VITE_MAP_KEY}`}
      style={{ width: "100%", height: "100%" }}
    >
      <Marker longitude={center.lng} latitude={center.lat} />
    </Map>
  );
}
```

When you outgrow MapTiler, only `mapStyle` changes (point it at your PMTiles style) — the component, the domain, and the API stay exactly the same. That's the whole point of keeping the four services decoupled.

---

## 8. Tooling & developer experience

**Turborepo** (`turbo.json`) — task graph + caching:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "lint": {},
    "test": { "dependsOn": ["^build"] },
    "dev": { "cache": false, "persistent": true }
  }
}
```

`^build` means "build my dependencies first" — so `domain` builds before `application` builds before `api`.

Recommended baseline:

- **TypeScript** project references + a shared `tsconfig.base.json`; each package extends it. Use `paths` / package names like `@app/domain` for clean imports.
- **ESLint** (flat config, `eslint.config.mjs`) with an **import-boundary rule** (`no-restricted-imports`) that *forbids* the domain from importing outer layers — the architecture becomes a lint error if violated, not just a convention.
- **Prettier** for formatting; one config in `packages/config`.
- **Jest** (ts-jest) for domain/application unit tests (a pure core needs no DB) and **Jest + Supertest** for API integration tests; **Playwright** for E2E against the running stack.
- **Husky + lint-staged** for pre-commit lint/format; **commitlint** for Conventional Commits.
- **CI**: `turbo run lint test build` on every PR, with remote caching so CI only redoes what changed.

---

## 9. Docker (local build & test)

Multi-stage builds keep images small and let you test production builds locally.

`docker/api.Dockerfile`:

```dockerfile
# --- build stage ---
FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @app/api... build      # builds api + its internal deps
RUN pnpm deploy --filter @app/api --prod /app   # prune to prod deps

# --- runtime stage ---
FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=build /app .
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

`docker-compose.yml` — spin up the whole stack to test integration locally:

```yaml
services:
  db:
    image: postgis/postgis:16-3.4-alpine   # Postgres + PostGIS for spatial queries
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: app
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app"]
      interval: 5s
      timeout: 3s
      retries: 5

  api:
    build: { context: ., dockerfile: docker/api.Dockerfile }
    environment:
      DATABASE_URL: postgresql://app:app@db:5432/app
    ports: ["3000:3000"]
    depends_on:
      db: { condition: service_healthy }

  web:
    build: { context: ., dockerfile: docker/web.Dockerfile }
    ports: ["8080:80"]
    depends_on: [api]

volumes:
  pgdata:
```

Workflow: `docker compose up --build` brings up Postgres, the API, and the static-served PWA so you can verify a production build end-to-end before pushing. Run `pnpm prisma migrate dev` locally for schema changes.

---

## 10. Build order — suggested next steps

1. `pnpm init` at the root; add `pnpm-workspace.yaml`, `tsconfig.base.json`, Turborepo.
2. Create `packages/config` (shared tsconfig/eslint/prettier) and `packages/domain` (empty entities/ports).
3. Scaffold `apps/api` with NestJS; register the global `AllExceptionsFilter` and `nestjs-pino` logger first, then wire one vertical slice end-to-end (e.g. `User`): domain → use case → Prisma repo → controller, injecting the `Logger` port.
4. Add `prisma/schema.prisma`, run the first migration against Dockerized Postgres. If using maps, use the `postgis/postgis` image and enable the extension (`CREATE EXTENSION IF NOT EXISTS postgis;`) in the first migration.
5. Scaffold `apps/web` with Vite + React + `vite-plugin-pwa` + Tailwind v4 (`@tailwindcss/vite`); add TanStack Query (provider + first `useQuery` hook), a Zustand UI store, and consume `packages/contracts` Zod schemas for the first validated call.
6. Add Docker + docker-compose; verify the full stack builds and runs locally.
7. Add the ESLint boundary rule, tests, Husky, and CI.

When you're ready, I can generate the actual scaffold (configs, folders, and the `User` vertical slice wired through all layers) so you have a running starting point rather than a blank repo.

---

### One-page mental model

> **Domain** = your business rules, pure and dependency-free.
> **Application** = use cases that orchestrate the domain.
> **Adapters** = controllers and Prisma repos that translate the outside world to your core.
> **Frameworks** = Nest, React, Prisma, Postgres — replaceable plugins on the edge.
> **The monorepo** lets the *contract* (types/schemas) and the *domain* be shared, so the whole stack stays type-safe and the dependencies only ever point inward.

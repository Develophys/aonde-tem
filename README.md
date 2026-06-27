# Aonde Tem

A location-based **PWA** for finding nearby places — built as a full-stack TypeScript monorepo
following **Clean Architecture** and **SOLID**.

## Stack

| Layer | Tech |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Frontend | React + Vite (installable PWA), Tailwind CSS v4 |
| Client state | Zustand (slices pattern) |
| Server state | TanStack Query |
| Validation | Zod (shared `@aonde-tem/contracts`) |
| Maps | MapLibre GL JS + MapTiler (free tier) |
| Backend | NestJS (TypeScript) |
| ORM | Prisma |
| Database | PostgreSQL + PostGIS |
| Errors | Typed domain errors + global exception filter |
| Logging | pino behind a `Logger` port |
| Containers | Docker + docker-compose |

## Project layout

```
apps/
  web/    React PWA (outer layer)
  api/    NestJS backend (outer layer)
packages/
  domain/      entities, value objects, ports, errors  (no deps — inner circle)
  contracts/   shared Zod schemas + DTOs
  config/      shared tsconfig preset
prisma/        schema + migrations (PostGIS)
docker/        Dockerfiles
```

The dependency rule points inward: `web`/`api` → `contracts` → `domain`. The domain
imports nothing framework-specific.

## Getting started

```bash
# 1. install deps (requires pnpm + Node 20+)
pnpm install

# 2. copy env and fill in keys
cp .env.example .env

# 3. start Postgres/PostGIS (and the whole stack)
docker compose up --build
# ...or run the DB only and develop locally:
#   docker compose up db
#   pnpm db:migrate
#   pnpm dev
```

- API: http://localhost:3000
- Web: http://localhost:8080 (compose) or http://localhost:5173 (vite dev)

See `ARCHITECTURE.md` for the full design rationale.

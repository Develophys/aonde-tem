# AI agent instructions — Aonde Tem

> Repository-wide guidance for AI coding agents (GitHub Copilot and others). It mirrors the
> canonical project rules in [`/CLAUDE.md`](../CLAUDE.md). When they disagree, **`CLAUDE.md` wins.**
> Read these before generating or editing code.

## What this project is
**Aonde Tem** — a community-powered, real-time **PWA** for finding where a specific item is available
nearby in Brazil, and at what price. Core entity: a **Report** (item / where / how much / how many /
freshness). Users both *seek* items and *report* sightings. "Waze for product availability & prices."

Read first for non-trivial work: `docs/PRODUCT.en.md` (vision), `ROADMAP.md` (epics),
`docs/backlog/BACKLOG.en.md` (work items), `ARCHITECTURE.md` (design), `docs/PERFORMANCE.md` (perf budgets).

## Stack
pnpm + Turborepo monorepo · React + Vite PWA + **Tailwind v4** · **Zustand** (client state) +
**TanStack Query** (server state) · **NestJS** (TypeScript) · **Prisma** + **PostgreSQL/PostGIS** ·
**Zod** for validation · **MapLibre GL JS** for maps. **ESLint + Prettier**, tests via **Jest**. TypeScript strict everywhere.

## Architecture rules (do not violate)
- **Clean Architecture, dependencies point inward:** `apps/*` → `packages/contracts` → `packages/domain`.
- `packages/domain` imports **nothing framework-specific** (no Nest, React, Prisma, HTTP). Pure TS.
- Validate at boundaries with **Zod** schemas from `packages/contracts` (shared by web + api).
- Throw **typed domain errors**; map them to HTTP only in the API's global exception filter.
- Log via the **`Logger` port**, never `console.log`.
- Persistence detail (Prisma models) ≠ domain entities ≠ DTOs. Map between them at the boundary.

## Frontend rules
- **Use the design skill (Impeccable) for all UI work.** Register = `product`. Read root `PRODUCT.md`
  (design brief) and `DESIGN.md` (system). Honor the anti-references — no gradient/glassmorphism slop.
- **Tailwind v4 `@theme` tokens** in `apps/web/src/app/index.css` are the source of truth — extend, don't hardcode.
- Feature-sliced: `features/<feature>/{ui,model,api}`. Components render; `model/` holds Zustand stores;
  `api/` holds TanStack Query hooks + Zod-validated fetchers.
- **Never store server data in Zustand** — TanStack Query owns the server cache.

## ⚡ Performance (a pillar)
Target users are on **low-end Android over slow/intermittent connections**. Honor the budgets in `docs/PERFORMANCE.md`: lazy-load MapLibre (never in the initial bundle), keep initial route JS ≤150KB gzip, small API payloads, `Save-Data`-aware, images compressed + lazy. A blown budget blocks merge.

## Conventions
- **Conventional Commits** (`feat:`, `fix:`, `chore:` …). Small, single-responsibility changes.
- Keep/extend tests for domain logic (Jest). Verify `pnpm lint typecheck test build` passes.
- **Bilingual docs:** when editing a `*.en.md`, update its `*.pt.md` counterpart (and vice-versa).
- Don't introduce paid services without flagging cost — this is a budget-conscious early product;
  prefer free / generous-free-tier tools (see `ARCHITECTURE.md` §7b for the map/geo choices).

## Definition of done
Code merged · types pass · relevant tests pass · lint clean · runs in `docker compose up` ·
respects the dependency rule, the frontend design system, **and the performance budgets** (`docs/PERFORMANCE.md`).

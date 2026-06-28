# CLAUDE.md — Aonde Tem

Project-level guidance. This file is read automatically when working in this repo.

## What this is

**Aonde Tem** — a community-powered, real-time PWA for finding where a specific item is available
nearby in Brazil (*"Waze for product availability and prices"*). The core entity is a **Report**
(item / where / how much / how many / freshness). Users both **seek** items and **report** discoveries.

## Source-of-truth docs (read before non-trivial work)

- Product vision & requirements: `docs/PRODUCT.en.md` / `docs/PRODUTO.pt.md`
- Design brief (for design tooling): `docs/PRODUCT.md`
- Design system (generated): `DESIGN.md` (root)
- Roadmap & epics: `docs/ROADMAP.md`
- Backlog & estimates: `docs/backlog/BACKLOG.en.md` / `BACKLOG.pt.md`
- Architecture & conventions: `docs/ARCHITECTURE.md`
- Performance budgets & practices: `docs/PERFORMANCE.md`
- Risks, gaps & data-quality safeguards: `docs/RISKS.md`

Information flows down: **Product doc → epics → backlog items → sprint.** Keep them consistent.

## Conventions

### 🎨 Frontend work — ALWAYS use the design skill (Impeccable)
**Any time we work on the frontend (UI, components, styling, UX, layout, copy, motion, the React app
in `apps/web`), our design skill must be considered and applied.** This project's primary design skill
is **Impeccable**; `frontend-design` is an acceptable fallback. Treat design as a system (color, type,
spacing, states, motion), never ad-hoc styling. If no design skill is available in the environment,
still apply its principles and flag that it should be installed.

**Impeccable conventions for this project:**
- **Register = `product`** (the PWA app). Only switch to `brand` for a future marketing/landing page.
- It reads **`PRODUCT.md`** (root design brief) and **`DESIGN.md`** on every command — keep `PRODUCT.md` current; regenerate `DESIGN.md` with `/impeccable document` after meaningful UI changes.
- **Inherit, don't reinvent:** the Tailwind v4 `@theme` tokens in `apps/web/src/app/index.css` are the source of truth. Impeccable should extend tokens/components, not overwrite them.
- **Honor the anti-references** in `PRODUCT.md` (no gradient slop, glassmorphism, fake dashboards, etc.).
- **Slop gate:** wire `npx impeccable detect apps/web/src/` into CI (epic E8) so anti-patterns fail the build.
- Use the right command for the discipline (`/typeset`, `/colorize`, `/animate`, `/polish`, …) rather than vague styling asks.

### Architecture
- Follow Clean Architecture: dependencies point inward. `apps/*` → `packages/contracts` → `packages/domain`.
- The **domain** (`packages/domain`) imports nothing framework-specific (no Nest, React, Prisma, HTTP).
- Validate at boundaries with **Zod** (shared schemas in `packages/contracts`).
- Errors: throw typed domain errors; map to HTTP only in the API's exception filter.
- Logging: use the `Logger` port, not `console.log`.

### Frontend stack specifics
- React + Vite, **Tailwind CSS v4** (CSS-first `@theme` tokens — no `tailwind.config.js`).
- **Zustand** for client/UI state (slices pattern); **TanStack Query** for server state — never store
  server data in Zustand.
- Maps via **MapLibre GL JS**; keep map/tile providers swappable.
- Feature-sliced: `features/<feature>/{ui,model,api}`.

### ⚡ Performance is a pillar
**Users are on low-end Android phones over slow, intermittent connections.** Performance is a first-class requirement, enforced by the budgets in `docs/PERFORMANCE.md`. Lazy-load the map, keep the initial JS small, ship lean API payloads, respect `Save-Data`, and treat a blown budget as a blocker. Litmus test for any change: *would it feel fast on a Moto G over 3G?*

### General
- TypeScript everywhere, strict mode. **ESLint + Prettier** enforced; tests via **Jest** (`pnpm test`); format with `pnpm format`.
- Prefer small, single-responsibility units; write/keep tests for domain logic.
- Bilingual docs: keep `*.en.md` and `*.pt.md` in sync when editing one.

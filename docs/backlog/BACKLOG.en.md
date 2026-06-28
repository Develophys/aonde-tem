# Aonde Tem — Backlog

> Status: **Draft v0.1** · Last updated: 2026-06-27
> Single source of truth for *what we need to build and how big it is*. Derived from
> [`PRODUCT.en.md`](../PRODUCT.en.md) and [`ROADMAP.md`](../../ROADMAP.md).
> Core product entity = **Report** (item / where / how much / how many / freshness).
> 🇧🇷 Versão em português: [`BACKLOG.pt.md`](./BACKLOG.pt.md).

---

## How to read this backlog

**Status:** `Done` · `Ready` (groomed, can start) · `Todo` (needs grooming) · `Blocked` · `In progress`

**Priority:** `P0` must-have for MVP · `P1` fast-follow · `P2` later / design-for

**Estimate** — story points (Fibonacci), with a t-shirt size and rough solo-dev effort. Points are
*relative size*, not a deadline; calibrate against real velocity after a sprint or two.

| Points | Size | Rough effort | Meaning |
|---|---|---|---|
| 1 | XS | ~½ day | Trivial, well-understood |
| 2 | S | ~1 day | Small, clear |
| 3 | M | ~1–2 days | Moderate |
| 5 | L | ~3–4 days | Large; consider splitting |
| 8 | XL | ~1 week | Very large; should usually be split |
| 13 | XXL | 1 week+ | Too big — **must** be broken down before starting |

> Estimates include implementation + tests + basic review, not research spikes (those are their own items).

---

## Phase summary (effort still remaining)

| Phase | Focus | Open points (P0) | Open points (P0+P1) |
|---|---|---|---|
| **Phase 0 — Foundation** | Repo runs end-to-end | 4 | 11 |
| **Phase 1 — MVP** | report ↔ seek loop | 31 | 49 |
| **Phase 2 — Usable** | accounts, search, trust | 0 | 34 |
| **Phase 3 — Growth** | quality, launch, monetization base | 0 | 29 |

> **MVP critical path ≈ 35 open P0 points** (Phase 0 + Phase 1). At a starting velocity of ~8–12
> points/week solo, that's roughly **4–6 weeks to a working MVP** — refine once you have real velocity.

---

## Epics overview

| Epic | Name | Phase |
|---|---|---|
| E0 | Foundation & DevEx | 0 |
| E1 | Domain & Data (Report model + PostGIS) | 0–1 |
| E2 | Backend API (Reports) | 1 |
| E3 | Maps & Geolocation | 1 |
| E4 | Frontend & PWA (report↔seek UI) | 1 |
| E5 | Accounts (optional login) | 2 |
| E6 | Community validation & trust | 2 |
| E7 | Search & notifications | 2 |
| E8 | Quality (tests, CI, observability) | 3 |
| E9 | Launch & growth | 3 |

---

## E0 — Foundation & DevEx

| ID | Item | Type | Pri | Est | Size | Status | Depends |
|---|---|---|---|---|---|---|---|
| AT-001 | Init pnpm + Turborepo monorepo | chore | P0 | 3 | M | ✅ Done | — |
| AT-002 | Shared `tsconfig.base.json` + per-pkg configs | chore | P0 | 1 | XS | ✅ Done | — |
| AT-003 | Docker Compose: PostGIS + API + web | chore | P0 | 3 | M | ✅ Done | — |
| AT-004 | `.env.example` + local setup docs | chore | P0 | 1 | XS | ✅ Done | — |
| AT-005 | Generate `pnpm-lock.yaml`; verify clean `pnpm install` | chore | P0 | 2 | S | 🔜 Ready | AT-001 |
| AT-006 | ESLint + Prettier + import-boundary rule (domain can't import outward) | chore | P1 | 3 | M | ✅ Done | AT-002 |
| AT-007 | Husky + lint-staged + commitlint (Conventional Commits) | chore | P1 | 2 | S | Todo | AT-006 |
| AT-008 | GitHub repo + branch protection + PR template | chore | P1 | 2 | S | Todo | — |
| AT-009 | CI pipeline: `turbo run lint typecheck test build` | chore | P1 | 3 | M | Todo | AT-008 |

**Open: P0 = 2 · P1 = 7**

---

## E1 — Domain & Data (Report model + PostGIS)

> The scaffold modeled a generic `Place`. Evolve it into the product's real entity: **Report**.

| ID | Item | Type | Pri | Est | Size | Status | Depends |
|---|---|---|---|---|---|---|---|
| AT-010 | `Coordinates` VO + domain error hierarchy | feature | P0 | 3 | M | ✅ Done | — |
| AT-011 | Ports: repository / geocoding / logger | feature | P0 | 2 | S | ✅ Done | — |
| AT-012 | Prisma + PostGIS migration scaffold (GiST index) | chore | P0 | 3 | M | ✅ Done | AT-003 |
| AT-013 | **Evolve `Place` → `Report` entity** (item, price, quantity, reporter, createdAt) + invariants | feature | P0 | 3 | M | 🔜 Ready | AT-010 |
| AT-014 | `Report` PostGIS schema + migration (location, price, qty, expiresAt, GiST) | feature | P0 | 3 | M | Todo | AT-012, AT-013 |
| AT-015 | Wire `pnpm db:migrate` against Docker DB; confirm it applies | chore | P0 | 2 | S | 🔜 Ready | AT-003 |
| AT-016 | Freshness/expiry rule in domain (per-item TTL, configurable) | feature | P0 | 2 | S | Todo | AT-013 |
| AT-017 | Seed script: sample Reports for a test area | chore | P1 | 2 | S | Todo | AT-014 |
| AT-018 | Item category model (free-text + optional category) | feature | P1 | 2 | S | Todo | AT-013 |

**Open: P0 = 10 · P1 = 4**

---

## E2 — Backend API (Reports)

| ID | Item | Type | Pri | Est | Size | Status | Depends |
|---|---|---|---|---|---|---|---|
| AT-020 | Zod contracts for Report (create / response / nearby query) | feature | P0 | 2 | S | 🔶 Partial | AT-013 |
| AT-021 | `POST /reports` — create (no login required) + validation | feature | P0 | 3 | M | Todo | AT-014, AT-020 |
| AT-022 | `GET /reports/nearby` — PostGIS radius query, ordered by distance | feature | P0 | 3 | M | Todo | AT-014, AT-020 |
| AT-023 | Item search/filter on nearby (by item text/category) | feature | P0 | 3 | M | Todo | AT-022 |
| AT-024 | Exclude/younger-rank expired Reports in queries | feature | P0 | 2 | S | Todo | AT-016, AT-022 |
| AT-025 | Global exception filter → error envelope | chore | P0 | 2 | S | ✅ Done | — |
| AT-026 | pino logging + request correlation IDs | chore | P0 | 2 | S | ✅ Done | — |
| AT-027 | `GET /reports/:id` detail | feature | P1 | 1 | XS | Todo | AT-022 |
| AT-028 | Pagination/limit + distance in response | feature | P1 | 2 | S | Todo | AT-022 |
| AT-029 | Rate limiting + input hardening (anti-spam) | chore | P1 | 3 | M | Todo | AT-021 |
| AT-030 | `/health` endpoint | chore | P1 | 1 | XS | Todo | — |

**Open: P0 = 13 · P1 = 7**

---

## E3 — Maps & Geolocation

| ID | Item | Type | Pri | Est | Size | Status | Depends |
|---|---|---|---|---|---|---|---|
| AT-040 | MapTiler account + `VITE_MAP_KEY` wired; map renders | chore | P0 | 1 | XS | Todo | AT-004 |
| AT-041 | MapLibre `MapView` with user marker | feature | P0 | 3 | M | 🔶 Partial | AT-040 |
| AT-042 | Geolocation hook + permission/denied handling | feature | P0 | 2 | S | 🔶 Partial | — |
| AT-043 | Render nearby Report markers from API | feature | P0 | 3 | M | Todo | AT-022, AT-041 |
| AT-044 | Recenter + follow-user mode | feature | P1 | 2 | S | Todo | AT-042 |
| AT-045 | Radius control (slider) wired to query | feature | P1 | 2 | S | Todo | AT-043 |
| AT-046 | Marker clustering for dense areas | feature | P1 | 3 | M | Todo | AT-043 |
| AT-047 | Spike: self-hosted Protomaps/PMTiles migration plan | spike | P2 | 2 | S | Todo | — |

**Open: P0 = 9 · P1 = 7**

---

## E4 — Frontend & PWA (report ↔ seek UI)

| ID | Item | Type | Pri | Est | Size | Status | Depends |
|---|---|---|---|---|---|---|---|
| AT-050 | React + Vite + Tailwind v4 setup | chore | P0 | 2 | S | ✅ Done | — |
| AT-051 | TanStack Query + typed `http`/`ApiError` wrapper | chore | P0 | 2 | S | ✅ Done | — |
| AT-052 | Zustand slices store (UI + map state) | chore | P0 | 2 | S | ✅ Done | — |
| AT-053 | **Seek flow**: search item → list/map of nearby Reports w/ price, qty, age | feature | P0 | 5 | L | Todo | AT-023, AT-043 |
| AT-054 | **Report flow**: quick form (item, price, qty, location) → submit | feature | P0 | 5 | L | Todo | AT-021, AT-042 |
| AT-055 | Report detail / popup (open in maps app handoff) | feature | P0 | 3 | M | Todo | AT-027 |
| AT-056 | PWA manifest + service worker (installable, offline shell) | chore | P0 | 2 | S | 🔶 Partial | AT-050 |
| AT-057 | Real PWA icons (192/512/maskable) | chore | P0 | 1 | XS | Todo | AT-056 |
| AT-058 | App shell: loading / error / empty states | feature | P1 | 3 | M | Todo | AT-053 |
| AT-059 | Service-worker tile caching (offline + fewer billable requests) | chore | P1 | 2 | S | Todo | AT-056 |
| AT-060 | Lighthouse PWA audit passing | chore | P1 | 2 | S | Todo | AT-056 |

**Open: P0 = 16 · P1 = 7**

---

## E5 — Accounts (optional login)  ·  *Phase 2*

| ID | Item | Type | Pri | Est | Size | Status | Depends |
|---|---|---|---|---|---|---|---|
| AT-070 | Spike: budget auth approach (self-host vs free tier) | spike | P1 | 2 | S | Todo | — |
| AT-071 | `User` entity + domain rules | feature | P1 | 2 | S | Todo | AT-070 |
| AT-072 | Sign up / sign in / sign out | feature | P1 | 5 | L | Todo | AT-071 |
| AT-073 | Attribute Reports to optional account (anon still allowed) | feature | P1 | 3 | M | Todo | AT-021, AT-072 |
| AT-074 | Profile + saved/favorite items | feature | P2 | 3 | M | Todo | AT-072 |

**Open: P1 = 12 · P2 = 3**

---

## E6 — Community validation & trust  ·  *Phase 2–3*

| ID | Item | Type | Pri | Est | Size | Status | Depends |
|---|---|---|---|---|---|---|---|
| AT-080 | Confirm "still there" / mark "gone" on a Report | feature | P1 | 3 | M | Todo | AT-022 |
| AT-081 | Freshness decay in UI (fade old Reports) | feature | P1 | 2 | S | Todo | AT-016, AT-053 |
| AT-082 | Flag/report abuse + basic moderation queue | feature | P1 | 3 | M | Todo | AT-021 |
| AT-083 | Reporter reputation / trust score | feature | P2 | 5 | L | Todo | AT-073, AT-080 |
| AT-084 | Ratings/reviews on a Report or place | feature | P2 | 5 | L | Todo | AT-072 |

**Open: P1 = 8 · P2 = 10**

---

## E7 — Search & notifications  ·  *Phase 2*

| ID | Item | Type | Pri | Est | Size | Status | Depends |
|---|---|---|---|---|---|---|---|
| AT-090 | LocationIQ free-tier account / Nominatim plan | spike | P1 | 1 | XS | Todo | — |
| AT-091 | `GeocodingService` adapter (search + reverse) | feature | P1 | 3 | M | Todo | AT-090, AT-011 |
| AT-092 | Address/item search with debounced autocomplete | feature | P1 | 3 | M | Todo | AT-023 |
| AT-093 | Cache geocoding results in PostGIS (save quota) | chore | P1 | 2 | S | Todo | AT-091 |
| AT-094 | Watchlist: "notify me when X appears nearby" + push | feature | P2 | 5 | L | Todo | AT-073 |
| AT-095 | "Search this area" on map pan | feature | P2 | 2 | S | Todo | AT-043 |

**Open: P1 = 9 · P2 = 7**

---

## E8 — Quality (tests, CI, observability)  ·  *start early*

| ID | Item | Type | Pri | Est | Size | Status | Depends |
|---|---|---|---|---|---|---|---|
| AT-100 | Domain unit tests (Jest) | chore | P0 | 2 | S | 🔶 Partial | AT-013 |
| AT-101 | API integration tests (Supertest + test PostGIS) | chore | P1 | 3 | M | Todo | AT-022 |
| AT-102 | E2E smoke test (Playwright): open → see Reports | chore | P1 | 3 | M | Todo | AT-053 |
| AT-103 | CI gate blocks merge on failing checks | chore | P1 | 1 | XS | Todo | AT-009 |
| AT-117 | Impeccable slop detector in CI (`npx impeccable detect apps/web/src/`) | chore | P1 | 2 | S | Todo | AT-009 |
| AT-104 | Error tracking (Sentry free tier) web + API | chore | P2 | 2 | S | Todo | — |
| AT-105 | Uptime monitoring on deployed API | chore | P2 | 1 | XS | Todo | AT-110 |

**Open: P0 = 2 (partial) · P1 = 9 · P2 = 3**

---

---

---

## Data-quality & UX safeguards (cross-cutting)  ·  *prevent honest mistakes & messy data*

> Closes the preventable usability/data-quality risks in [`../RISKS.md`](../RISKS.md) §1. These make the app *actually useful*.

| ID | Item | Type | Pri | Est | Size | Status | Risk |
|---|---|---|---|---|---|---|---|
| AT-130 | Product **autocomplete** on report & search (pick existing, not retype) | feature | P0 | 3 | M | Todo | R-01 |
| AT-131 | Aggressive name **normalization** + `pg_trgm` **fuzzy** match/search | feature | P0 | 3 | M | Todo | R-01,R-05 |
| AT-132 | **Price validation** (BRL mask, sane min/max, reject absurd) | feature | P0 | 2 | S | Todo | R-02 |
| AT-133 | **Confirmation/summary step** before submitting a sighting | feature | P0 | 2 | S | Todo | R-03 |
| AT-134 | **Place reuse**: suggest nearby existing places before creating new | feature | P0 | 3 | M | Todo | R-04 |
| AT-135 | **Liquidity instrumentation**: log searches + fresh-result hit-rate | chore | P0 | 2 | S | Todo | R-40 |
| AT-136 | **Edit/delete your own** recent sighting | feature | P1 | 2 | S | Todo | R-03 |
| AT-137 | **Offline write-queue** (draft report offline → sync) | feature | P1 | 5 | L | Todo | R-06 |
| AT-138 | **Qualitative availability** (muito/pouco/acabando) option | feature | P1 | 2 | S | Todo | R-07 |
| AT-139 | **Price outlier** soft-warning vs recent sightings | feature | P1 | 3 | M | Todo | R-02 |
| AT-140 | Strip **EXIF/GPS** from uploaded photos | chore | P1 | 1 | XS | Todo | R-30 |
| AT-141 | **ToS / "preço relatado" disclaimer** + LGPD privacy notice | chore | P1 | 2 | S | Todo | R-31,R-32 |

**Open: P0 = 12 · P1 = 15**

## Performance (cross-cutting)  ·  *applies to all UI/API work*

> Enforces the budgets in [`PERFORMANCE.md`](../PERFORMANCE.md). Target: low-end Android on slow networks.

| ID | Item | Type | Pri | Est | Size | Status | Depends |
|---|---|---|---|---|---|---|---|
| AT-118 | Lazy-load MapLibre (out of initial bundle, non-blocking first paint) | chore | P0 | 2 | S | Todo | AT-041 |
| AT-119 | Performance budgets + Lighthouse CI gate (mobile ≥ 90) | chore | P1 | 3 | M | Todo | AT-009 |
| AT-120 | Bundle-size budget in CI (size-limit) | chore | P1 | 2 | S | Todo | AT-009 |
| AT-121 | Web Vitals (LCP/INP/CLS) → analytics (field data) | chore | P1 | 2 | S | Todo | AT-114 |
| AT-122 | Image optimization: client-side compress + lazy + WebP/CDN | chore | P1 | 3 | M | Todo | — |
| AT-123 | Save-Data / network-aware loading (fewer tiles/images on 2g) | chore | P1 | 2 | S | Todo | AT-041 |

**Open: P0 = 2 · P1 = 12**

## E9 — Launch & growth  ·  *Phase 3*

| ID | Item | Type | Pri | Est | Size | Status | Depends |
|---|---|---|---|---|---|---|---|
| AT-110 | Spike: budget hosting (web / API / Postgres+PostGIS) | spike | P1 | 2 | S | Todo | — |
| AT-111 | Production deploy pipeline (build, migrate, deploy) | chore | P1 | 5 | L | Todo | AT-110 |
| AT-112 | Domain + HTTPS (required for PWA) | chore | P1 | 2 | S | Todo | AT-111 |
| AT-113 | Privacy policy + location-permission copy (LGPD) | chore | P1 | 2 | S | Todo | — |
| AT-114 | Product analytics (PostHog free tier) on core funnel | chore | P2 | 3 | M | Todo | AT-111 |
| AT-115 | App-install prompt + onboarding | feature | P2 | 3 | M | Todo | AT-056 |
| AT-116 | In-app feedback form | feature | P2 | 2 | S | Todo | — |

**Open: P1 = 11 · P2 = 8**

---

## Sprint 1 candidate (foundation → first vertical slice)

A focused first sprint to get the **report↔seek loop** standing. ~**18 points** — trim to your real capacity.

| ID | Item | Pri | Est |
|---|---|---|---|
| AT-005 | Lockfile + clean install | P0 | 2 |
| AT-015 | `db:migrate` works against Docker DB | P0 | 2 |
| AT-013 | `Place` → `Report` entity | P0 | 3 |
| AT-014 | Report PostGIS schema + migration | P0 | 3 |
| AT-021 | `POST /reports` | P0 | 3 |
| AT-022 | `GET /reports/nearby` | P0 | 3 |
| AT-040 | MapTiler key + map renders | P0 | 1 |
| AT-043 | Render Report markers from API | P0 | 3 |

**Sprint goal:** *"A user can post a Report and another user sees it on the map nearby."* That single
slice proves the whole product thesis end-to-end.

---

## Using & maintaining this backlog

- **Grooming:** move `Todo` → `Ready` once an item has clear acceptance criteria and no blocking unknowns.
- **Splitting:** anything ≥ 8 points should be broken into smaller items before a sprint.
- **Re-estimate** after each sprint — your real velocity replaces the rough effort guesses here.
- **Source of truth flows down:** Product doc → epics (ROADMAP) → backlog items (here) → sprint.
- IDs are stable; don't renumber. New items continue from AT-117+.

> Want this as a spreadsheet for sorting/summing, or pushed into a tracker? See the options in
> [`ROADMAP.md` §5](../../ROADMAP.md). I can also generate a CSV from this table.

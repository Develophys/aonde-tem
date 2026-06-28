# Aonde Tem — Roadmap & Trello Board

A product roadmap broken into **epics** and **task cards**, plus a guide for turning it into a
working Trello board. The plan is **MVP-first and budget-conscious**: ship the core "see places
near me" loop, then layer on search, accounts, and growth.

---

## 1. Board structure

Use **one board** ("Aonde Tem") with workflow **lists** and **labels** for epics, type, and priority.
That's simpler than one board per epic and keeps the whole product visible at a glance.

### Lists (columns)

| List | Meaning | WIP limit* |
|---|---|---|
| **📥 Backlog** | Everything not yet scheduled | — |
| **🎯 Ready** | Groomed, dependencies clear, next to pick up | — |
| **🚧 In Progress** | Actively being worked | 2–3 |
| **🔎 Review / Testing** | Code review, QA, verification | 2 |
| **✅ Done** | Merged and verified | — |

\*WIP (work-in-progress) limits keep a solo dev / small team focused — don't start a 4th card while 3 are open.

### Labels

- **Epic labels** (color-coded): `E0 Foundation`, `E1 Domain/Data`, `E2 API`, `E3 Maps/Geo`, `E4 Frontend/PWA`, `E5 Auth`, `E6 Discovery`, `E7 Search`, `E8 Quality`, `E9 Launch`, `E11 Notifications`.

> Note: the MVP spec set ([`specs/MVP-OVERVIEW.md`](./specs/MVP-OVERVIEW.md)) uses `E10` for *Accounts, Products & Moderation*, so Notifications is **E11** to avoid a collision.
- **Type**: `feature`, `chore`, `bug`, `spike` (research/investigation).
- **Priority**: `P0 must-have`, `P1 should-have`, `P2 nice-to-have`.

### Conventions

- Each **card** = one shippable task (roughly half a day to two days).
- Use the card **checklist** for sub-steps, the **description** for acceptance criteria.
- Definition of Done: code merged, types pass, relevant tests pass, lint clean, runs in `docker compose up`.

---

## 2. Phases (the order to build in)

| Phase | Goal | Epics |
|---|---|---|
| **Phase 0 — Foundation** | Repo runs locally end-to-end | E0, core of E1 |
| **Phase 1 — MVP** | A user opens the PWA and sees real places near them | E2, E3, E4 |
| **Phase 2 — Usable product** | Find specific things; have an account; get alerted | E7, E6 (core), E5, E11 (core) |
| **Phase 3 — Growth & hardening** | Reviews, quality, launch | E6 (rest), E8, E9, E11 (P1) |

The MVP loop is deliberately tiny: **geolocate → query PostGIS for nearby places → render markers on the map.** Everything else is layered on after that loop works.

---

## 3. Epics & task cards

> Format: `[Priority] Card title — short note`. Copy these straight into Trello cards.

### E0 — Project Foundation & DevEx  *(Phase 0)*
- [P0] Initialize pnpm + Turborepo monorepo — *(done in scaffold)*
- [P0] Shared `tsconfig.base.json` + per-package configs — *(done)*
- [P0] Docker Compose with PostGIS + API + web — *(done)*
- [P0] `.env.example` and local env setup docs — *(done)*
- [P0] Generate `pnpm-lock.yaml` and verify `pnpm install` clean
- [P1] Set up ESLint + Prettier + import-boundary rule (domain can't import outward)
- [P1] Husky + lint-staged + commitlint (Conventional Commits)
- [P1] GitHub repo + branch protection + PR template
- [P1] CI: `turbo run lint typecheck test build` on every PR

### E1 — Domain & Data Layer  *(Phase 0)*
- [P0] `Coordinates` value object + `Place` entity + domain errors — *(done)*
- [P0] `PlaceRepository`, `GeocodingService`, `Logger` ports — *(done)*
- [P0] Prisma schema + PostGIS migration (extension + GiST index) — *(done)*
- [P0] Wire `pnpm db:migrate` against Dockerized PostGIS and confirm it applies
- [P1] Seed script with sample places (your city) for local dev
- [P1] Define core categories (restaurant, pharmacy, ATM, …) as a domain enum/value object

### E2 — Backend API  *(Phase 1)*
- [P0] `GET /places/nearby` (lat/lng/radius → PostGIS query) — *(scaffolded)*
- [P0] `POST /places` create with Zod validation — *(scaffolded)*
- [P0] Global exception filter → consistent error envelope — *(done)*
- [P0] pino logging with request correlation IDs — *(done)*
- [P1] `GET /places/:id` detail endpoint
- [P1] Pagination / result limit + distance in response
- [P1] Rate limiting + basic input hardening
- [P1] Health check endpoint (`/health`) for deploys
- [P2] OpenAPI/Swagger docs for the API

### E3 — Maps & Geolocation  *(Phase 1)*
- [P0] Sign up for MapTiler free tier; add `VITE_MAP_KEY`
- [P0] MapLibre `MapView` with user marker — *(scaffolded)*
- [P0] Browser geolocation hook + permission/denied handling — *(scaffolded)*
- [P0] Render nearby-place markers from the API — *(scaffolded)*
- [P1] Recenter button + follow-user mode
- [P1] Radius control (slider) wired to the query
- [P1] Marker clustering for dense areas
- [P2] Spike: self-hosted Protomaps/PMTiles plan for when MapTiler quota gets tight

### E4 — Frontend Foundation & PWA  *(Phase 1)*
- [P0] React + Vite + Tailwind v4 setup — *(done)*
- [P0] TanStack Query provider + typed `http`/`ApiError` wrapper — *(done)*
- [P0] Zustand slices store (UI + map state) — *(done)*
- [P0] PWA manifest + service worker (installable, offline shell) — *(scaffolded)*
- [P0] Replace placeholder PWA icons with real artwork (192 / 512 / maskable)
- [P1] App shell layout, loading & error states, empty states
- [P1] Service-worker caching for map tiles (offline + fewer billable requests)
- [P1] Lighthouse PWA audit passing
- [P2] Dark mode via the theme slice

### E5 — Auth & Users  *(Phase 2)*
- [P1] Spike: pick a budget auth approach (self-host vs free tier of a provider)
- [P1] `User` entity + domain rules
- [P1] Sign up / sign in / sign out flow
- [P1] Session/token handling (store token in memory / Zustand, not in server cache)
- [P2] Profile + saved/favorite places
- [P2] Password reset / email verification

### E6 — Place Discovery Features  *(Phase 2–3)*
- [P1] Place detail view (photos, address, category, distance)
- [P1] Category filters on the map
- [P1] List view alongside the map (toggle)
- [P2] Open-now / hours (data model + UI)
- [P2] Ratings & reviews (entity, endpoints, UI)
- [P2] Directions link (deep-link to maps or OpenRouteService)
- [P2] Share a place (Web Share API)

### E7 — Geocoding & Search  *(Phase 2)*
- [P1] Sign up for LocationIQ free tier (or plan self-hosted Nominatim)
- [P1] `GeocodingService` adapter (search + reverse) implementing the port
- [P1] Address search with autocomplete (debounced, TanStack Query)
- [P1] Cache geocoding results in PostGIS to save free-tier quota
- [P2] "Search this area" when the map is panned
- [P2] Reverse-geocode the user's location into a readable address

### E8 — Quality: Testing, CI/CD, Observability  *(Phase 3, but start early)*
- [P0] Domain unit tests (Vitest) — *(started: Coordinates)*
- [P1] API integration tests (Supertest against a test PostGIS)
- [P1] E2E smoke test (Playwright): open app → see markers
- [P1] CI gate: block merge on failing checks
- [P2] Error tracking (Sentry free tier) on web + API
- [P2] Basic uptime monitoring on the deployed API

### E9 — Launch & Growth  *(Phase 3)*
- [P1] Spike: budget hosting (free/cheap tiers for web, API, Postgres+PostGIS)
- [P1] Production deploy pipeline (build images, run migrations, deploy)
- [P1] Domain + HTTPS (required for PWA)
- [P2] Privacy policy + location-permission rationale copy
- [P2] Product analytics (PostHog free tier) for the core funnel
- [P2] App-install prompt + onboarding
- [P2] Collect early user feedback (simple in-app form)

### E11 — Notifications & Watchlist  *(Phase 2–3)*

> Full spec: [`specs/NOTIFICATIONS.en.md`](./specs/NOTIFICATIONS.en.md) · [`specs/NOTIFICACOES.pt.md`](./specs/NOTIFICACOES.pt.md).
> **Hard dependencies:** E5 (Auth — watches require sign-in) and the **`Discovery`** entity + a "discovery
> created/confirmed" domain event (see [`specs/report-discovery.spec.md`](./specs/report-discovery.spec.md)).
> There is nothing to match against until Discoveries exist — do not start E11 before that lands. Triggers in
> v1 are **nearby** and **price-at-or-below-target** only. *(Note: the watchlist is the `Watchlist` entity
> listed as deferred in [`specs/MVP-OVERVIEW.md`](./specs/MVP-OVERVIEW.md) §5 — this epic builds it.)*

**Foundations (P0)**
- [P0] `Watch` entity + Zod contract — product ref, `center` `geography(Point)` + `radiusM` (default 2 km), optional `maxPriceCents`, status
- [P0] `PushSubscription` entity — per-device endpoint, keys, consent metadata; prune on `410 Gone` / revoke
- [P0] `Notification` (inbox) entity — one record per match (watch, discovery, channel, readAt)
- [P0] Domain matching logic (pure: discovery + watches → matches) + unit tests; PostGIS `ST_DWithin` (inverted nearby query), GiST index on watch centers
- [P0] VAPID keys + service-worker `push` + `notificationclick` handlers in `apps/web`

**The loop (P0)**
- [P0] Create-watch UI — 2 km default radius slider, optional max price; block duplicate watch per item (offer edit)
- [P0] Contextual push permission + consent flow (rationale before browser prompt; decline still creates inbox-only watch)
- [P0] Matching on the Discovery created/confirmed event (async; must not block `POST /discoveries`)
- [P0] **Batched delivery** — per-watch batch window (~10–15 min) collapses matches into one push; inbox gets each entry. *(The single chokepoint for alert volume — build it here, not later.)*
- [P0] In-app notification inbox (list, read/unread, deep-link to Discovery on map)
- [P0] Controls: per-user **push channel toggle** + per-watch **pause/resume** + **delete** (inbox keeps recording when push is off)
- [P0] LGPD: explicit consent record, view/delete watches + push devices, purge subscriptions on revoke/logout/account-delete

**Hardening (P1)**
- [P1] Quiet hours (hold pushes in a user-set window; inbox updates silently)
- [P1] Map/search bell toggle — create a watch in one tap from results
- [P1] Edit a watch (radius/price) without delete-and-recreate
- [P1] Unread badge on the notification icon

**Future (P2)**
- [P2] Email channel (separately consented)
- [P2] Restock / "still there" re-confirmation trigger
- [P2] Category- or keyword-level watches (depends on item taxonomy, E7)
- [P2] Smart radius (route / multiple saved areas) and digest mode

---

## 4. Set it up in Trello

1. **Create the board**: "Aonde Tem" (Workspace → Create board). Free plan is fine.
2. **Add the lists** from §1: Backlog, Ready, In Progress, Review / Testing, Done.
3. **Create the labels** from §1 — give each epic its own color so the board is scannable.
4. **Create cards** from §3. Fast path: in a list, paste multiple lines into the "add card" box — Trello asks "create N cards?" → one card per line. Paste an epic's tasks at once, then label them.
5. **Add detail per card**: description = acceptance criteria; checklist = sub-steps; assign the epic + type + priority labels.
6. **Seed the flow**: pull all **Phase 0 + P0** cards into **Ready**, then start two in **In Progress**.
7. **Optional Power-Ups (free)**: Calendar view for due dates; "Card Repeater" for recurring chores. Keep it minimal early on.

### Suggested first week (Ready → In Progress)
1. Generate `pnpm-lock.yaml`, confirm `pnpm install` + `docker compose up` clean (E0)
2. Run the PostGIS migration and seed sample places (E1)
3. Sign up for MapTiler, drop in the key, confirm the map renders (E3)
4. Verify the end-to-end MVP loop: geolocate → `/places/nearby` → markers (E2/E3/E4)

When those four are in **Done**, you have a working MVP skeleton and the rest of the board is just iteration.

---

## 5. Getting this into Trello automatically

A few options, since there's no Trello connector available right now:

- **Browser automation** — I can open Trello in your browser and create the board, lists, labels, and cards for you (you'd just log in first).
- **Importable file** — I can generate a CSV/JSON of these cards for a Trello import Power-Up.
- **Use an available connector instead** — Todoist, ClickUp, or Zoho Projects *are* in the registry and could be connected directly if you're open to one of those instead of Trello.
- **Add Trello manually** — if you have a Trello MCP, add it via Settings → Capabilities and I can drive it from there.

Tell me which you prefer and I'll take it from there.

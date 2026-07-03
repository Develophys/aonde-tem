# Deployment — Aonde Tem

Guidance for publishing `apps/web` and `apps/api`, closing out the hosting spike in
`docs/backlog/BACKLOG.en.md` (**AT-110**, epic E8/E9). The database is already decided —
see `docs/DATABASE_NEON_SETUP.md` — this doc covers the two apps that sit on top of it.

This doc walks through **first, manual deploys** for each service. It does not set up an
automated pipeline — that's a separate backlog item (**AT-111**), which depends on the
platforms chosen here.

## 0. Why this stack

| App | Platform | Why |
|---|---|---|
| `apps/web` | **Vercel** (Hobby/free) | Static Vite PWA build — no server runtime needed. Global edge CDN, zero-config pnpm-monorepo support, generous free tier. Region doesn't matter here since it's just cached static assets. |
| `apps/api` | **Fly.io**, region `gru` (São Paulo) | `apps/api` is a long-running NestJS process — raw PostGIS SQL via a `pg.Pool` driver adapter, Passport/JWT sessions (see `docs/ARCHITECTURE.md` §7b) — not shaped for a serverless/edge runtime today. Fly runs the existing `docker/api.Dockerfile` as a normal container, and `gru` is a real São Paulo region, keeping the API next to Neon's `sa-east-1` database. |
| Database | **Neon**, `sa-east-1` | Already provisioned — see `docs/DATABASE_NEON_SETUP.md`. |

**Rejected alternatives** (see the design spec at
`docs/superpowers/specs/2026-07-02-deployment-approach-design.md` for full reasoning):

- **Render free tier for the API** — genuinely free with no card, but its free regions are
  Oregon/Ohio/Frankfurt/Singapore. No Brazil region means cross-continent latency likely
  blows the `nearby` endpoint's p95 budget (`docs/PERFORMANCE.md` §2/§7), plus the free tier
  spins down after 15 minutes idle (30-50s cold start on wake).
- **Google Cloud Run (`southamerica-east1`) for the API** — also reaches São Paulo on a real
  free tier and would run the existing Dockerfile unmodified, but brings more platform
  surface (IAM, Cloud Build) than Fly's CLI/dashboard flow for a single-founder MVP.

**Trade-off accepted:** Fly.io requires a card on file for its usage-based free allowance
(unlike Render). At MVP traffic levels this should cost $0/mo — see §9.

## 1. Architecture at a glance

```
Browser (PWA)
   │  HTTPS, static assets + service worker
   ▼
Vercel (apps/web)               ── global edge CDN
   │  HTTPS, fetch('/api/...')
   ▼
Fly.io "gru" — São Paulo (apps/api)   ── NestJS container
   │  Postgres wire protocol (pg.Pool, pooled connection)
   ▼
Neon "sa-east-1" — São Paulo (Postgres + PostGIS)
```

`apps/web` never talks to the database directly — every request goes through `apps/api`,
which is also where geocoding-provider keys are proxied (see `docs/ARCHITECTURE.md` §7b).

## 2. Prerequisites

- A Vercel account (free).
- A Fly.io account + the `flyctl` CLI installed, with a card on file (`fly auth login`,
  `fly auth signup`).
- The Neon project from `docs/DATABASE_NEON_SETUP.md` already created, with `postgis` and
  `pg_trgm` extensions enabled and pooled/direct connection strings in hand.
- A Google OAuth client (client ID/secret) if login-with-Google is being deployed — see
  `.env.example` at the repo root for the exact variables.

## 3. Deploying `apps/web` to Vercel

1. Import the GitHub repo into Vercel.
2. **Root Directory:** `apps/web`. Vercel auto-detects the `pnpm-workspace.yaml` at the repo
   root and runs `pnpm install` from there before building, so workspace packages
   (`@aonde-tem/contracts`, `@aonde-tem/config`) resolve correctly.
3. **Framework preset:** Vite (auto-detected). Default build command
   (`tsc -p tsconfig.json --noEmit && vite build`, from `apps/web/package.json`) and output
   directory (`dist`) both work as-is.
4. **Environment variables** (Project Settings → Environment Variables):

   | Var | Value |
   |---|---|
   | `VITE_API_URL` | The Fly.io API's public URL, e.g. `https://aonde-tem.fly.dev` (or the custom API domain from §7) |
   | `VITE_MAP_KEY` | MapTiler API key |

5. **SPA routing:** the app uses `react-router-dom` client-side routing. Vercel's Vite
   preset handles the SPA fallback (all paths → `index.html`) automatically; if a route
   404s, add a `vercel.json` in `apps/web` with a catch-all rewrite.
6. **Service worker caching:** `vite-plugin-pwa` generates `sw.js` with `registerType:
   "autoUpdate"`. If updates don't show up promptly after a deploy, add a `Cache-Control:
   no-cache` header for `sw.js` in `vercel.json` — not required to ship, just a note if it
   comes up.
7. Deploy. Vercel gives you a `*.vercel.app` preview URL immediately; custom domain is §7.

## 4. Deploying `apps/api` to Fly.io

The existing `docker/api.Dockerfile` builds from the **repo root** as its context (it
copies the whole monorepo before running `pnpm install`), so `fly.toml` needs to live at
the **repo root**, not inside `apps/api`.

1. From the repo root: `fly launch --no-deploy` (creates the app, lets you edit `fly.toml`
   before the first deploy). When asked for a Dockerfile, point it at `docker/api.Dockerfile`.
2. Edit the generated `fly.toml`:

   ```toml
   app = "aonde-tem-api"          # or whatever name is available
   primary_region = "gru"          # São Paulo

   [build]
     dockerfile = "docker/api.Dockerfile"

   [http_service]
     internal_port = 3000
     force_https = true
     auto_stop_machines = false    # keep it warm — avoid cold starts against the latency budget
     min_machines_running = 1

   [[http_service.checks]]
     path = "/api/health"          # apps/api/src/shared/health — global prefix is "api"
     interval = "15s"
     timeout = "5s"
   ```

3. Set secrets (never commit these — mirrors the "Secrets & environment separation"
   section of `docs/DATABASE_NEON_SETUP.md`):

   ```bash
   fly secrets set \
     DATABASE_URL="<neon pooled connection string>" \
     DIRECT_URL="<neon direct connection string>" \
     JWT_SECRET="<generate a strong random value — the code falls back to an insecure dev default if unset>" \
     GOOGLE_CLIENT_ID="<from Google OAuth client>" \
     GOOGLE_CLIENT_SECRET="<from Google OAuth client>" \
     GOOGLE_CALLBACK_URL="https://<api-domain>/api/auth/google/callback" \
     FRONTEND_URL="https://<web-domain>" \
     WEB_ORIGIN="https://<web-domain>" \
     GEOCODING_BASE_URL="https://us1.locationiq.com/v1" \
     GEOCODING_API_KEY="<LocationIQ key>" \
     NODE_ENV="production"
   ```

4. Run migrations against Neon **before or as part of** the first deploy — reuse the
   command from `docs/DATABASE_NEON_SETUP.md` §4:

   ```bash
   DATABASE_URL="<neon direct url>" DIRECT_URL="<neon direct url>" \
     pnpm --filter @aonde-tem/api prisma migrate deploy
   ```

   (A `[deploy.release_command]` in `fly.toml` can automate this once AT-111 wires up CI —
   out of scope here.)

5. `fly deploy`. Confirm `https://<app>.fly.dev/api/health` responds `{"status":"ok",...}`.

## 5. Environment variable reference

| Var | Used by | Where it's set |
|---|---|---|
| `DATABASE_URL` | `apps/api` (runtime queries, pooled) | Fly secret |
| `DIRECT_URL` | `apps/api` (Prisma migrations only) | Fly secret / local shell for `migrate deploy` |
| `PORT` | `apps/api` | Fly sets this automatically; defaults to `3000` |
| `LOG_LEVEL` | `apps/api` (pino) | Fly secret, optional (defaults to `info`) |
| `NODE_ENV` | `apps/api` | Fly secret (`production`) |
| `JWT_SECRET` | `apps/api` (auth) | Fly secret — **must** be set; falls back to an insecure default otherwise |
| `WEB_ORIGIN` | `apps/api` (CORS) | Fly secret — the deployed web origin |
| `FRONTEND_URL` | `apps/api` (OAuth redirect target) | Fly secret |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | `apps/api` (Google OAuth) | Fly secret |
| `GOOGLE_CALLBACK_URL` | `apps/api` (Google OAuth) | Fly secret |
| `GEOCODING_BASE_URL` / `GEOCODING_API_KEY` | `apps/api` (LocationIQ) | Fly secret |
| `VITE_API_URL` | `apps/web` (build-time) | Vercel env var |
| `VITE_MAP_KEY` | `apps/web` (build-time, MapTiler) | Vercel env var |

Local development keeps using the repo-root `.env` (see `.env.example`) against the
Dockerized `postgis/postgis` container — none of the above changes local dev.

## 6. Domain + HTTPS (AT-112)

Both platforms provision HTTPS automatically on their own subdomains
(`*.vercel.app`, `*.fly.dev`) — the PWA's HTTPS requirement is met with zero extra work.
For a custom domain:

- **Web:** add the domain in Vercel's Project → Domains; Vercel issues the certificate and
  gives you the DNS records to add.
- **API:** `fly certs add api.yourdomain.com`, then add the CNAME Fly gives you. Update
  `VITE_API_URL`, `GOOGLE_CALLBACK_URL`, `FRONTEND_URL`, and `WEB_ORIGIN` to the final
  domains once both are live.

## 7. CI/CD — not covered here (AT-111)

This doc only covers first, manual deploys via the Vercel dashboard and `fly deploy`.
Automating this (GitHub Actions building/testing/deploying on merge to `main`, running
`prisma migrate deploy` as part of the pipeline) is backlog item **AT-111**, which
explicitly depends on AT-110 — i.e., on the platform choice this doc makes.

## 8. Cost & free-tier limits

- **Vercel Hobby:** free for non-commercial-scale usage; generous bandwidth/build minutes
  for an MVP. No card required.
- **Fly.io:** requires a card on file. `auto_stop_machines = false` / `min_machines_running
  = 1` (set in §4, to avoid cold starts against the latency budget) keeps one machine
  always on — check current Fly pricing for the smallest shared-CPU VM size before
  launching; at MVP scale this is typically covered by Fly's monthly usage allowance, but
  it is usage-based, not a hard-capped free tier like MapTiler/Neon/LocationIQ.
- **Neon:** already free-tier, documented in `docs/DATABASE_NEON_SETUP.md` (including the
  autosuspend/cold-start caveat for the database itself).

## 9. Known gaps

- Fly's usage-based billing (vs. a hard-capped free tier) is a deliberate trade-off for
  latency — flag in `docs/RISKS.md` if budget certainty becomes a concern before real
  traffic exists.
- No automated pipeline yet (AT-111) — every deploy above is manual until that lands.
- No custom domain yet (AT-112) — both apps run on their platform-provided subdomains
  until that lands.

## 10. Checklist

- [ ] Vercel project created, `apps/web` deploying from the repo, env vars set
- [ ] Fly.io app created, `fly.toml` at repo root with `primary_region = "gru"`
- [ ] Fly secrets set (§5 table)
- [ ] `prisma migrate deploy` run against Neon
- [ ] `fly deploy` succeeds; `/api/health` responds `ok`
- [ ] Web app can reach the deployed API (`VITE_API_URL` correct, CORS/`WEB_ORIGIN` correct)
- [ ] Update `docs/backlog/BACKLOG.en.md` / `.pt.md` — check off **AT-110** once verified end-to-end

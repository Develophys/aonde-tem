# Neon Postgres Setup — Aonde Tem

Guidance for standing up the production/staging database on **Neon** (serverless Postgres),
picking up the hosting spike in `docs/backlog/BACKLOG.en.md` (**AT-110**, epic E8). Local dev
keeps using the Dockerized `postgis/postgis` container in `docker-compose.yml` — Neon is for
**deployed environments only**, so nobody burns free-tier quota or loses offline dev capability.

## 0. Why Neon fits this project

- Free tier covers an MVP: enough compute/storage to validate the product without a card on file.
- Native **Postgres wire protocol** — no code change needed beyond a connection string, since the
  API already talks to Postgres through `@prisma/adapter-pg` (`apps/api/src/shared/prisma.service.ts`).
- Ships a **São Paulo region** (`aws-sa-east-1`), which is what `PERFORMANCE.md` §7 asks the hosting
  spike (AT-110) to pick, to keep the `nearby` endpoint's p95 latency budget (≤300 ms, target ≤150 ms)
  achievable from Brazil.
- **Database branching** — a full copy-on-write branch per PR/preview environment, useful once E8's
  CI/CD work stands up preview deploys.
- Supports the extensions this schema already depends on: **PostGIS** (`Place`/`Discovery` geography
  columns) and **pg_trgm** (fuzzy product-name matching, per `RISKS.md` R-01).

## 1. Create the project

1. Sign up at Neon, create a project, region = **AWS `sa-east-1` (São Paulo)**.
2. Name the project `aonde-tem` (or `aonde-tem-staging` / `aonde-tem-prod` if you want separate
   projects per environment — separate projects give harder isolation than branches within one project).
3. Neon creates a default branch (`main`) and a default database. Rename the database to `aonde` to
   match the local convention in `.env.example`, or just note whatever name Neon gives you.

## 2. Enable extensions

Neon supports both extensions this schema needs, but they must be enabled per-branch/database before
the first migration runs. In the Neon SQL editor (or `psql` against the connection string from §3):

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

`prisma/schema.prisma` already declares these via `previewFeatures = ["postgresqlExtensions"]` and
`extensions = [postgis, pg_trgm]`, so once they exist on the target database, `prisma migrate deploy`
will not try to re-create them.

## 3. Connection strings — pooled vs. direct

Neon gives you two connection strings per branch:

- **Pooled** (`-pooler` in the hostname) — routes through PgBouncer (transaction mode).
- **Direct** — bypasses the pooler.

Prisma Migrate normally wants the direct one, because PgBouncer's transaction-mode pooling can break
the session-level advisory lock `migrate deploy`/`migrate dev` takes. This project's Prisma setup has
no `directUrl` split to make that automatic, though: `prisma/schema.prisma`'s `datasource` block
carries no `url`/`directUrl` at all — the connection string is supplied entirely through
`apps/api/prisma.config.ts`'s `datasource.url`, and `@prisma/config`'s `Datasource` type only exposes
a single `url` (no `directUrl` field to pair with it).

So, since `apps/api` is one long-running NestJS process (not a fleet of short-lived
serverless/edge functions), the simplest correct setup is: **use the direct (non-`-pooler`) connection
string as `DATABASE_URL` everywhere for now** — for local `.env`, for CI migration runs, and for the
deployed API's runtime. A single persistent server doesn't need PgBouncer's connection multiplexing;
that only starts to matter if you scale to many concurrent instances hammering Neon's connection
limit. If that happens later, switch the *deployed API's* `DATABASE_URL` to the pooled string (migrations
should keep using the direct one) — but don't add that complexity before you need it.

Don't construct the string by hand. On the Neon project's **Dashboard**, the "Connection Details"
widget shows the full connection string already filled in for the selected branch/role/database, with
a **Pooled connection** toggle — leave it **off** to copy the direct string:

```
DATABASE_URL="<copied direct connection string>"   # hostname has no "-pooler"
```

Set this in `.env` locally, and as a secret in whatever host runs `apps/api` (Render/Fly/Railway/CI —
never commit it to git).

The role (default `neondb_owner`) and its password live under the project's **Roles** tab — that's
also where you reset the password if you lose it, or add additional roles later.

`apps/api/prisma.config.ts` must explicitly load `.env` itself — the Prisma CLI is a separate process
from the Nest app and doesn't go through `ConfigModule.forRoot({ envFilePath: "../../.env" })` in
`app.module.ts`, so without its own `dotenv` load it silently falls back to the hardcoded localhost
default. It now does this (mirroring the same `../../.env` path Nest uses):

```ts
// apps/api/prisma.config.ts
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

loadEnv({ path: path.resolve(__dirname, '../../.env') });

export default defineConfig({
  schema: '../../prisma/schema.prisma',
  datasource: {
    url: process.env['DATABASE_URL'] ?? 'postgresql://aonde:aonde@localhost:5432/aonde',
  },
});
```

No change needed to `PrismaService` (`apps/api/src/shared/prisma.service.ts`) — it wraps
`DATABASE_URL` in a `pg.Pool` via `@prisma/adapter-pg`, and Neon's endpoints speak standard Postgres
wire protocol, so the existing driver adapter works unmodified. (Only switch to
`@neondatabase/serverless`'s HTTP/WebSocket driver if `apps/api` ever moves to an edge/serverless
runtime — it's a long-running NestJS process today, so the plain `pg` adapter is the right choice.)

## 4. Run migrations against Neon

From the repo root, pointed at the Neon direct URL:

```bash
DATABASE_URL="<neon direct url>" DIRECT_URL="<neon direct url>" pnpm --filter @aonde-tem/api prisma migrate deploy
```

This replays the existing migrations in `prisma/migrations/` (`full_mvp_schema`,
`discoveries_active_filter_idx`, `add_password_google_id_to_user`) — do **not** use `migrate dev`
against a shared environment, since it can drift/reset in ways `deploy` won't. Reserve `db:migrate`
(`migrate dev`) for local Docker Postgres only.

Seed reference/lookup data (e.g., `BlockedTerm` rows) the same way if needed:

```bash
DATABASE_URL="<neon direct url>" pnpm db:seed
```

## 5. Cold starts vs. the performance budget

Neon's free/launch tiers **autosuspend** compute after a period of inactivity; the next query pays a
cold-start penalty (roughly hundreds of ms to a couple seconds) while compute resumes. That directly
threatens the `nearby` endpoint's p95 budget in `PERFORMANCE.md` (≤300 ms, target ≤150 ms).

- For a **staging/preview branch**, autosuspend is fine — it's not measured against the budget.
- For **production**, either raise the suspend timeout as high as the plan allows, or move to a plan
  tier where autosuspend is disabled once real traffic exists. Until then, treat the current free/low
  tier as good enough for demo/MVP validation, but flag cold start as a known gap in `RISKS.md` if the
  MVP demo needs consistently low latency.
- A cheap mitigation in the meantime: a low-frequency uptime ping (already on the roadmap — E8 lists
  "Basic uptime monitoring on the deployed API") keeps compute warm as a side effect.

## 6. Secrets & environment separation

- Never commit real Neon credentials — `.env` is already local-only; only `.env.example` (with
  placeholder values) is tracked.
- Set `DATABASE_URL` / `DIRECT_URL` as secrets in whatever host runs `apps/api` (Render/Fly/Railway
  env vars, GitHub Actions secrets for CI migrations, etc.) — never in `docker-compose.yml` or source.
- If using one Neon project for both staging and prod, use **separate branches** (`staging`, `main`)
  with distinct connection strings/roles, not the same branch for both.
- Rotate the Neon role password if a credential ever leaks into a log or client bundle.

## 7. Backups & recovery

Neon keeps point-in-time restore (PITR) history whose retention window depends on plan tier — check
current terms on Neon's pricing page before relying on it, since free-tier retention is short and
branch resets can affect history. Don't treat Neon's PITR alone as your only backup story once real
user data exists; revisit this once E8's CI/CD and observability work lands.

## 8. Checklist

- [ ] Create Neon project, region `aws-sa-east-1` (São Paulo)
- [ ] Enable `postgis` and `pg_trgm` extensions on the target database
- [ ] Add `directUrl = env("DIRECT_URL")` to `prisma/schema.prisma`'s `datasource` block
- [ ] Set `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) as secrets on the API host
- [ ] Run `prisma migrate deploy` against Neon; verify all existing migrations apply cleanly
- [ ] Confirm `/health` (already on the roadmap, E8) responds against the Neon-backed API
- [ ] Decide autosuspend policy for prod vs. staging/preview branches
- [ ] Update `docs/backlog/BACKLOG.en.md` / `.pt.md` — check off AT-110 once verified end-to-end

# Deployment approach — design

**Date:** 2026-07-02
**Backlog:** answers AT-110 (spike: budget hosting); unblocks AT-111 (deploy pipeline), AT-112 (domain + HTTPS)

## Problem

The project has no documented deployment target yet. `apps/web` (Vite PWA) and `apps/api`
(NestJS, long-running process) need hosts; the DB is already decided (Neon, `sa-east-1`,
see `docs/DATABASE_NEON_SETUP.md`). `docs/PERFORMANCE.md` §7 requires hosting in a Brazil
region to hit the `nearby` endpoint's p95 latency budget.

## Constraints gathered

- Docs-only deliverable this round — no pipeline/config wiring (that's AT-111).
- Budget: free tier preferred, but a card-on-file usage-based free allowance is acceptable
  if it gets a Brazil region (matches the project's existing budget-first stance elsewhere:
  MapTiler, Neon, LocationIQ all free-tier).
- `apps/api` is a long-running NestJS process (raw PostGIS SQL via `pg.Pool` adapter,
  Passport/JWT auth) — not shaped for edge/serverless today (confirmed in
  `docs/ARCHITECTURE.md` §7b).

## Approaches considered

1. **Vercel (web) + Fly.io `gru` (api) + Neon (db) — chosen.** Same-region API↔DB hop,
   matches PERFORMANCE.md's Brazil-region ask. Card required for Fly's usage-based
   allowance, but $0/mo expected at MVP scale.
2. Vercel (web) + Render free tier (api) + Neon (db). Zero card anywhere, but no Brazil
   region on Render's free tier — cross-continent latency likely blows the p95 budget, plus
   15-min-idle cold starts. Rejected: conflicts with an explicit, already-written budget.
3. Vercel (web) + Google Cloud Run `southamerica-east1` (api) + Neon (db). Reuses the
   existing `docker/api.Dockerfile` unmodified and reaches São Paulo on a real free tier.
   Rejected in favor of #1: more platform surface (IAM, Cloud Build) for a single-founder
   MVP than Fly's simpler CLI/dashboard flow.

## Decision

Write `docs/DEPLOYMENT.md`, documenting approach #1: Vercel for `apps/web`, Fly.io
(`primary_region = "gru"`) for `apps/api`, Neon for the database (already provisioned).
Covers: prerequisites, build/deploy steps per service, the full env var reference (sourced
from `.env.example` and grep of `process.env` usage in `apps/api/src`), domain/HTTPS notes
(AT-112), an explicit "CI/CD is AT-111, not this doc" pointer, free-tier limits, and a
closing checklist that ends in checking off AT-110.

Not bilingual — follows the precedent of `DATABASE_NEON_SETUP.md`, which is English-only
despite the bilingual rule applying to the root product docs.

## Out of scope

- Actually creating Vercel/Fly accounts or running any deploy commands.
- Writing the GitHub Actions pipeline (AT-111).
- Buying/configuring a custom domain (AT-112) — the doc explains the step, doesn't execute it.

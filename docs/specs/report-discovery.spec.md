# Spec — Report a discovery

> Feature spec · part of [`MVP-OVERVIEW.md`](./MVP-OVERVIEW.md). **Goal link:** G2. **Epics:** E1–E4, E10.

## Summary
The contribute side of the core loop. A logged-in user reports that a **Product** is available at a
**Place** for a **price** and **quantity** — creating a **Discovery** that appears on the map. Reporting
must be fast (~30s) and is **gated by login** (pending Q1 confirmation).

## User stories
- As a contributor, I want to report a discovery (pick/type a product, set the place, price, quantity) so others can find it.
- As a contributor, I want to drop a pin or use my current GPS for the place so I don't type coordinates.
- As a contributor, I want a product I type to match an existing one (or be created) so the data stays clean.
- As a contributor, I want confirmation the discovery is live so I know it worked.

## Requirements

### P0
- **Create discovery**: links `productId` + `placeId` + `price` + `quantity` + `reporterId`; sets `createdAt` and `expiresAt`.
  - *Given* I'm logged in with a product, place, price and quantity, *when* I submit, *then* the discovery appears on the map within seconds.
- **Emit a `discovery.created` domain event** (and `discovery.confirmed` when community validation lands) carrying productId, place point, price, and expiresAt. This is the integration hook the **Notifications/Watchlist** feature ([`NOTIFICATIONS.en.md`](./NOTIFICATIONS.en.md), Epic E11) subscribes to for matching. Publishing must be async / non-blocking so it never slows `POST /discoveries`.
- **Place via pin or GPS** + typed name → stored as a PostGIS point; reuse a nearby existing place or create new.
- **Product selection** reuses/creates via the product flow (see [`product-moderation.spec.md`](./product-moderation.spec.md)); blocklist applies.
- **Login required** to submit (see [`auth.spec.md`](./auth.spec.md)); a visitor is prompted to sign in.
- **Freshness/expiry**: `expiresAt` set from a configurable TTL; expired discoveries drop off reads.
- **Price validation (R-02):** numeric input with BRL mask and sane bounds (> 0, sensible max); reject absurd values; label as "preço relatado".
- **Place reuse (R-04):** before creating a new place, suggest nearby existing places (within N m) to reuse; confirm pin/GPS accuracy.
- **Confirmation step (R-03):** show a summary (product · place · price · qty) before submit so honest mistakes are caught.
  - *Given* I filled the form, *when* I reach submit, *then* I confirm a summary; an out-of-range price is blocked with a clear message.

### P1
- **Edit/delete your own recent discovery (R-03)** — let people fix mistakes. Ownership means the
  *current* reporter (`reporterId`), which can move between users through the existing re-report
  upsert. Editable/deletable while `hiddenAt IS NULL` and `expiresAt > now` — no separate time
  window. Editing price/quantity/note refreshes `createdAt`/`expiresAt` like a new report.
  `PATCH`/`DELETE /discoveries/:id`, owner-only. See
  [`2026-07-05-edit-delete-own-report-design.md`](../superpowers/specs/2026-07-05-edit-delete-own-report-design.md).
- **Offline write-queue (R-06):** draft a report with no signal, sync on reconnect (core for in-store use).
- **Qualitative availability (R-07):** muito / pouco / acabando as an alternative to an exact count.
- **Price outlier soft-warning (R-02):** warn if the price is far from recent discoveries of the same product.
- Reverse-geocode the pin to fill the place address.
- "Places near me" reuse suggestions; recent-products quick-pick.
- Optional note/photo on the discovery (strip EXIF/GPS — R-30).

### P2
- Bulk/repeat report; report from a product page.

## Open questions
- **Q4 — Freshness TTL** default(s) per item type. *(Product/Data, non-blocking.)*

## Dependencies
- `Discovery` + `Place` entities & PostGIS migration (E1). Create endpoints (E2). Map pin/GPS (E3). Auth (E5/E10). Product flow.

## Dependents
- **Notifications & Watchlist (E11)** consumes the `discovery.created` / `discovery.confirmed` event for watch matching — see [`NOTIFICATIONS.en.md`](./NOTIFICATIONS.en.md).

## Backlog mapping
Discovery (evolve Report) + Place create (E1/E10), `POST /discoveries` (E2), report UI (AT-054), pin/GPS (E3).

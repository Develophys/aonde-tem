# Design — Edit/delete your own report

> Backlog: AT-136 "Edit/delete your own recent discovery" (P1, R-03). Spec: [`report-discovery.spec.md`](../../specs/report-discovery.spec.md).

## Summary

A logged-in user can edit or delete a **Discovery** (a "Report" — item/place/price/quantity) that
they currently own. Ownership means "current reporter": the `reporterId` on the row right now, not
necessarily whoever originally created it, because the existing report flow already reassigns
`reporterId` when someone else re-reports the same product+place (see "Known interactions" below —
unchanged by this work).

## Scope

- **In scope:** `Discovery` entity only.
- **Out of scope:** `Product` and `Place` are shared reference data edited by nobody in particular;
  editing a report's product/place/location (delete + re-report instead); a dedicated "My Reports"
  page (controls live inline where reports are already shown); any change to who becomes the
  "owner" of a discovery via the existing re-report/upsert flow.

## Ownership rule

A discovery is editable/deletable by user `U` when all of:

- `discovery.reporterId === U`
- `discovery.hiddenAt IS NULL`
- `discovery.expiresAt > now`

No separate "edit window" — reuses the existing freshness/TTL concept already on the entity
(`Discovery.isFresh()`). If a discovery has expired or been hidden, it's already gone from every
read path, so there's nothing to edit/delete from the user's point of view.

## Domain & data layer

### `packages/domain`

- `DiscoveryRepository` gets one new method:

  ```ts
  update(id: string, changes: {
    price: Price;
    quantity: number;
    note?: string;
    expiresAt: Date;
  }): Promise<void>;
  ```

- No change to the `Discovery` entity shape. An edit is implemented by the use-case reconstructing
  a `Discovery` via `Discovery.create(...)` with the same `id`/`productId`/`placeId`/`reporterId`/
  `coords`, new `price`/`quantity`/`note`, and a fresh `createdAt`/`expiresAt` (see "Freshness on
  edit" below).

### `apps/api` — `PrismaDiscoveryRepository`

- **Behavior change:** `findById` returns `null` when `row.hiddenAt` is not null (currently ignores
  `hiddenAt` entirely). Verified via grep that no other caller relies on the old "returns hidden
  rows" behavior — the only other production callers are `find-place-with-discoveries.ts` (via
  `findByPlace`, a different method) and the new update/delete use-cases added here.
- New `update(id, changes)` — a raw `UPDATE discoveries SET price = …, quantity = …, note = …,
  "expiresAt" = … WHERE id = ${id}`, following the same raw-SQL pattern as `save`/`saveWithPlace`
  (Prisma's `Unsupported("geography")` column already forces raw queries for writes on this table).
- `delete(id)` is unchanged — it already sets `hiddenAt`, reusing the same column the admin-hide
  flow uses (see "Known interactions").
- `findByPlace`'s raw query gains `d."reporterId"` in its `SELECT`, and `NearbyDiscoveryRow` gains
  a `reporterId: string` field, so the place-detail read path can compute per-row ownership without
  a second query. `reporterId` stops at the application layer — it is never serialized into an HTTP
  response (see API section).

### `apps/api/modules/discovery/application`

- `UpdateDiscovery.execute(id, dto, userId)`:
  1. `findById(id)` → if `null`, throw `NotFoundError`.
  2. If `discovery.reporterId !== userId`, throw `ForbiddenError`.
  3. If `!discovery.isFresh()`, throw `NotFoundError` (an expired report reads as "doesn't exist
     anymore" from the acting user's side, not "forbidden").
  4. Rebuild via `Discovery.create` with new `price`/`quantity`/`note`, `createdAt = now`,
     `expiresAt = now + TTL` (reuses `DISCOVERY_DEFAULT_TTL_MS`).
  5. `discoveries.update(id, { price, quantity, note, expiresAt })`.
  6. Return the rebuilt `Discovery`.
- `DeleteDiscovery.execute(id, userId)`: same lookup/ownership/freshness checks (steps 1–3 above),
  then `discoveries.delete(id)`.

## API surface

### `packages/contracts`

- `updateDiscoverySchema` (new, `discovery-update.ts` mirroring `discovery-create.ts`):

  ```ts
  export const updateDiscoverySchema = z.object({
    priceBrl: z.number().positive().max(99_999.99),
    quantity: z.number().int().min(1),
    note: z.string().max(500).optional(),
  });
  export type UpdateDiscoveryDto = z.infer<typeof updateDiscoverySchema>;

  export const updateDiscoveryResponseSchema = z.object({
    id: z.string().uuid(),
    priceBrl: z.number(),
    quantity: z.number().int(),
    note: z.string().nullable(),
    createdAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
  });
  export type UpdateDiscoveryResponse = z.infer<typeof updateDiscoveryResponseSchema>;
  ```

- `placeDiscoveryItemSchema` (in `place.ts`) gains `isMine: z.boolean()`.

### `apps/api` — `DiscoveryController`

- `PATCH /discoveries/:id` — `@UseGuards(JwtAuthGuard)`. Parses body with `updateDiscoverySchema`,
  calls `UpdateDiscovery.execute(id, dto, req.user.sub)`, returns `UpdateDiscoveryResponse`.
- `DELETE /discoveries/:id` — `@UseGuards(JwtAuthGuard)`. Calls
  `DeleteDiscovery.execute(id, req.user.sub)`, returns `204 No Content`.
- Both map `NotFoundError`/`ForbiddenError` to 404/403 automatically via the existing
  `AllExceptionsFilter` — no new error-mapping code needed.

### `apps/api` — new `OptionalJwtAuthGuard`

- Lives beside `JwtAuthGuard` in `apps/api/src/modules/auth/guards/`. Same `Bearer` parsing, but:
  no header → `req.user = undefined`, `return true`. Invalid/expired token → same (never throws).
  Valid token → sets `req.user` like today.
- Applied to `PlaceController.getWithDiscoveries` (`GET /places/:id`), which stays otherwise public.
  `FindPlaceWithDiscoveries`'s use case signature is unchanged; the controller does the
  `row.reporterId === req.user?.sub` comparison itself when building the response, so `reporterId`
  never leaves the controller.

## Frontend (`apps/web`)

- `PlaceModal`'s item row gets two more buttons next to the existing "Denunciar", shown only when
  `item.isMine`:
  - **Editar** → opens `EditDiscoverySheet` (new component, `features/report/ui/`), a `BottomSheet`
    mirroring `FlagSheet`'s structure: pre-filled `PriceInput` + quantity + note, Save/Cancel.
  - **Excluir** → opens a small confirm `BottomSheet` ("Excluir este relato? Esta ação não pode ser
    desfeita." / Cancelar / Excluir).
- New mutations in `features/report/api/report.api.ts` (or a sibling file):
  `useUpdateDiscovery()` → `PATCH /api/discoveries/:id`; `useDeleteDiscovery()` →
  `DELETE /api/discoveries/:id`. Both follow `useCreateDiscovery`'s pattern (Bearer token from the
  store) and on success invalidate `["discoveries", "nearby"]` plus the place-detail query key so
  the map markers and the open sheet both refresh.
- Errors surface via the existing toast slice (`pushToast({ tone: "error", message: … })`), not a
  new inline error pattern, since these are transient actions rather than a multi-step form.

## Known interactions (unchanged by this work)

- **Ownership can already move between users.** The existing `saveWithPlace` upsert (in
  `create-discovery.ts`/`prisma-discovery.repository.ts`) reassigns `reporterId` to whoever most
  recently reports the same product+place while a prior report is still active. This means a user's
  edit/delete controls for a given report can silently disappear if someone else re-reports the same
  spot first — this already reflects "the current data for this place," so it's treated as correct,
  not a bug, and is out of scope to change here.
- **`hiddenAt` is now dual-purpose**: set by admin moderation (existing) and by user self-delete
  (new). There is no column recording *why* a row is hidden. Acceptable for this scope; a future
  `hiddenReason`/`deletedById` column would be needed if that distinction ever matters (e.g. for
  admin audit UI).

## Testing notes

- Domain/use-case: ownership (owner/non-owner), expired, already-hidden, happy-path update, happy-
  path delete — each as a unit test on `UpdateDiscovery`/`DeleteDiscovery` against a fake repository.
- API: `discovery.controller.spec.ts` gets `PATCH`/`DELETE` cases (200/403/404 for update; 204/403/
  404 for delete), plus a `place.controller` case asserting `isMine` flips correctly with/without a
  bearer token.
- Frontend: existing `PlaceModal`/`ProductPicker` test patterns extend to cover the new buttons
  appearing only when `isMine`, and the edit/delete mutations firing correctly.

## Docs to update after implementation

- `docs/backlog/BACKLOG.en.md` / `BACKLOG.pt.md` — AT-136 status.
- `docs/specs/report-discovery.spec.md` — finalize the P1 bullet with the rule above.
- `docs/PRODUCT.en.md` / `docs/PRODUTO.pt.md` — note that users can edit/delete their own active
  reports.

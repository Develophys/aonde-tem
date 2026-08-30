# Design: Admin Moderation Queue

**Date:** 2026-08-30
**Status:** Approved — ready for implementation planning
**Source:** `docs/superpowers/design_handoff_aonde_tem_mobile/README.md` §7 ("Admin Moderation Queue"),
`docs/specs/feedback-flags.spec.md`

## Context

The mobile shell spec (`2026-08-29-mobile-shell-design.md`) deferred four screens. Profile
shipped; Avisos (E11) and price history are blocked on entities that do not exist. Moderation
is the opposite case: **the backend is already complete and the UI is entirely missing.**

`AdminController` exposes `GET /admin/flags` and `PATCH /admin/flags/:id` behind an `AdminGuard`
that checks `role === "admin"` on the JWT. `FlagSheet` in the web app already creates flags from
inside `PlaceModal`. What no one can do is *read* the queue: an admin today needs `curl` and a
hand-copied token.

Blocking works correctly. Setting `product.status = "blocked"` removes the product and its
discoveries from reads, because `PrismaDiscoveryRepository`'s nearby queries filter
`p.status = 'active'`; hiding a discovery sets `hiddenAt`, which those same queries exclude.
This spec adds no moderation semantics — it makes the existing ones operable.

## Decisions

| Question | Decision |
|---|---|
| Where it lives | `apps/web`, route `/admin/denuncias`, outside `AppShell` (no tab bar) |
| How an admin gets there | A "Denúncias" row in Perfil's **Ajustes** block, rendered only for `role === "admin"` |
| Card content | Target name and context, reason, reporter comment and e-mail, relative time |
| Grouping | One card per **target**, not per flag; an action resolves every open flag on it |
| Destructive action | Inline confirmation on the card, not a modal; no undo (see Out of scope) |
| Reason colours | Two categories, not five colours — see Components |

## Scope

**In scope**

1. Grouped read endpoint and a target-scoped action endpoint, replacing the two flag-scoped ones.
2. Zod contracts for both.
3. `features/admin` slice: the queue page, its card, its query and mutation.
4. `AdminRoute` — a role gate beside the existing `ProtectedRoute`.
5. The conditional Ajustes row in `PerfilPage`.

**Out of scope**

- **Un-hide / appeal.** No endpoint un-blocks a product or clears `hiddenAt`. Reversal stays a
  database operation. This is the one meaningful gap the spec knowingly leaves open, and it is
  what the inline confirmation exists to compensate for.
- Comments on products and discoveries (`feedback-flags.spec.md` P1).
- Auto-hide after N flags (P1), reputation weighting and audit log (P2).
- A UI for `BlockedTerm` (that is `product-moderation.spec.md`).
- Pagination. The queue keeps the existing 100-row ceiling; a backlog past 100 open targets is a
  product problem, not a UI one.

## Architecture

### Why the endpoints change shape

Grouping by target is not a presentation detail — it changes what an action means. Today
`PATCH /admin/flags/:id` resolves one flag. If the card represents a product flagged five times
and the admin removes it, four flags stay `open` pointing at content that is already gone, and
the queue never empties.

The resource is therefore the **flagged target**, not the flag:

```text
GET   /admin/queue                          → { items: AdminQueueItem[] }
PATCH /admin/queue/:targetType/:targetId    → { action: "hide" | "dismiss" } → { ok: true }
```

`GET /admin/flags` and `PATCH /admin/flags/:id` are **removed**, not deprecated. Nothing consumes
them: there is no admin UI, and a search of `apps/web` for either path returns nothing. Leaving a
second, subtly different way to action a flag is how the two paths drift apart.

`POST /flags` (the public flag-creation endpoint behind `FlagController`) is untouched.

### Reading the queue

`Flag.targetId` is polymorphic with no foreign key — it addresses either `products.id` or
`discoveries.id` depending on `targetType`. Prisma cannot express that relation, so the read is a
single raw query with two `LEFT JOIN`s, the same technique
`PrismaDiscoveryRepository.findByReporter` already uses:

```sql
SELECT f."targetType", f."targetId",
       COUNT(*)                              AS flag_count,
       ARRAY_AGG(DISTINCT f.reason)          AS reasons,
       MAX(f."createdAt")                    AS latest_at,
       -- product name for a product target; the discovery's product name for a discovery target
       COALESCE(tp.name, dp.name)            AS target_name,
       pl.name                               AS place_name,
       d.price                               AS price
  FROM flags f
  LEFT JOIN products   tp ON f."targetType" = 'product'   AND tp.id = f."targetId"
  LEFT JOIN discoveries d  ON f."targetType" = 'discovery' AND d.id  = f."targetId"
  LEFT JOIN products   dp ON dp.id = d."productId"
  LEFT JOIN places     pl ON pl.id = d."placeId"
 WHERE f.status = 'open'
 GROUP BY f."targetType", f."targetId", tp.name, dp.name, pl.name, d.price
 ORDER BY latest_at DESC
 LIMIT 100
```

All ids in this schema are `TEXT`, not `uuid` — the joins compare the columns directly, with no
cast. (The Zod contract still validates `targetId` as a UUID, because that is what the values are;
only the column type is looser.)

The latest comment and reporter e-mail need the newest row per group rather than an aggregate.
They come from a `DISTINCT ON (f."targetType", f."targetId") … ORDER BY f."createdAt" DESC`
subquery joined to the grouped result — one round trip, and readable next to the aggregate above,
which a window function over the same rows would not be.

This also removes an N+1: the current controller runs `prisma.user.findUnique` **once per flag**
to resolve the reporter's e-mail.

**Index.** `flags` has no index at all today. Add one on `(status, "targetType", "targetId")` in
the same migration; every query in this feature filters on `status` and groups by the other two.

**A deleted target** yields `target_name = NULL`. Rather than dropping the row — which would strand
an unresolvable flag in the queue forever — the card renders "Conteúdo removido" and offers only
"Ignorar". Dismissing is the correct resolution for a flag whose target no longer exists.

### Actioning a target

`PATCH /admin/queue/:targetType/:targetId` keeps the existing per-target semantics and wraps them
in a transaction with the bulk status update:

- `hide` + `discovery` → set `hiddenAt`; `hide` + `product` → set `status = 'blocked'`; then mark
  every `open` flag on that target `actioned`.
- `dismiss` → mark every `open` flag on that target `dismissed`, touching no content.

A target with no open flags returns 404, which is also what a double-submit from a stale card gets.

`FlagRepository` gains `updateStatusByTarget(targetType, targetId, status): Promise<number>` so the
bulk update stays behind the port rather than reaching for `PrismaService` from the controller. The
existing single-flag `updateStatus` stays — `create-flag.ts` still uses the repository as it is.

### Application layer

Two use-cases under `apps/api/src/modules/flag/application/`, matching how `discovery` is
organised:

- `list-moderation-queue.ts` — takes the reader port, returns `AdminQueueItem[]`.
- `action-moderation-target.ts` — takes the flag repository and the content ports, throws
  `NotFoundError` when there is nothing open to resolve.

The grouping itself is SQL, so the use-case is thin. What it earns is a place to unit-test the
"one action resolves every open flag" rule without standing up a controller.

### Web

```text
features/admin/
  api/moderation.api.ts        fetchQueue, actionTarget
  api/moderation.queries.ts    useModerationQueue, useActionTarget
  ui/DenunciasPage.tsx
  ui/QueueCard.tsx
features/auth/ui/AdminRoute.tsx
```

Router: `/admin/denuncias`, lazy-loaded through `PageSuspense`, placed **outside** `AppShell`
alongside `/report` — it is not one of the five tabs and must not stretch the bar to six.

```tsx
{
  path: "/admin/denuncias",
  element: (
    <AdminRoute>
      <PageSuspense><DenunciasPage /></PageSuspense>
    </AdminRoute>
  ),
}
```

`AdminRoute` sits beside `ProtectedRoute` and distinguishes the two failure modes: no session →
`/signin` with `state.from`, exactly as `ProtectedRoute` does; a session without the role → `/`,
silently. A signed-in non-admin bounced to `/signin` would be told, by implication, that a page
exists that they are not allowed to see.

The query key includes the access token, following `useMyDiscoveries` — the same reasoning applies
(signing out and back in as someone else must not serve the previous account's data from cache).
`staleTime` is 0 here, not 30s: a moderation queue is shared mutable state between admins, and the
mutation invalidates it on success.

## Components

### DenunciasPage

Header row copies `ReportPage`'s: `px-4 py-4 border-b border-border`, `paddingTop:
var(--header-inset-top)`, a 44×44 back button calling `navigate(-1)` with `aria-label="Voltar"`,
then `<h1>Denúncias</h1>`. The open count follows the title as a muted span once loaded — "3
abertas" — because a queue's length is the first thing its operator wants.

No `--bottom-nav-clearance` padding: there is no tab bar on this route.

States mirror `PerfilPage`'s vocabulary, which is now the house pattern for a fetching screen:

- Loading — "Carregando denúncias…" in `text-text-muted text-sm`.
- Error — "Não foi possível carregar as denúncias." in `text-error`. Deliberately distinct from
  empty: a failed request must never read as "nothing to moderate".
- Empty — the `ComingSoon` component, whose markup is already exactly "badge + title +
  description", with real copy: "Nenhuma denúncia aberta" / "Quando alguém denunciar um produto ou
  relato, ele aparece aqui." An idle queue is the healthy state and should look like one.

  Its doc comment currently claims it is for "routes whose data layer has not been built yet",
  which this is not. Widen the comment to what the component actually is — the generic badge panel,
  as opposed to `EmptyState`, whose copy is hardcoded about reports. Copying its 25 lines into a
  third component to avoid touching one comment would be the worse trade.

### QueueCard

One card per target: `bg-surface`, `border border-border`, `rounded-control`, `p-4`, stacked with
`gap-3` inside a `px-4 py-4` list. **No shadow** — per the Floating-Only Rule these cards sit on a
plain background, not over the map.

Content order, top to bottom:

1. **Target name** (`font-medium text-text`, truncated) and, for a discovery, a second muted line
   with place and price: "Mercadinho do Zé · R$ 24,90". A product target has no second line.
2. **Reason chips** — one per distinct reason, plus a count chip ("3 denúncias") when
   `flagCount > 1`.
3. **Reporter comment**, italic and muted, when present. Only the newest is shown; the count chip
   is what signals there are others.
4. **Provenance** — "por reporter@exemplo.com · 2h atrás", muted, `text-xs`.
5. **Actions** — a two-column row, both ≥44px: "Remover" (`bg-error text-white`, solid) and
   "Ignorar" (`border border-border text-text`, ghost).

**Reason colour is per category, not per reason.** Five reasons in five colours would put five
saturated hues on one screen and break the One Accent Rule; the handoff itself asks for "one
saturated color per reason category, not per card". So:

| Category | Reasons | Chip |
|---|---|---|
| Harmful | `illegal`, `inappropriate` | `bg-error/10 text-error` |
| Quality | `spam`, `wrong_info`, `other` | `bg-surface-alt text-text-muted` |

The screen's one saturated colour is therefore `error`, carried by the harmful chips and the
Remover button — which is coherent, since both mean "this needs to go". Brand green appears
nowhere on this screen, and should not: nothing here is a positive action.

**Inline confirmation.** Tapping "Remover" does not act. The action row swaps in place for
"Remover mesmo?" plus "Sim, remover" (solid error) and "Cancelar" (ghost), using
`animate-toast-in`. Rationale: removal hides another person's content, the UI offers no undo, and
a modal for a two-tap decision is heavier than the decision. "Ignorar" acts immediately — it
changes no content and a wrongly dismissed flag can be re-filed.

While a mutation is in flight the card's buttons are disabled and the pressed one reads
"Removendo…" / "Ignorando…". On success the card leaves the list through query invalidation; on
failure a toast carries the error and the card stays, still actionable.

### Perfil — the Ajustes row

A row matching `ThemeRow`'s geometry (`flex items-center justify-between px-4 min-h-14`), label
"Denúncias", navigating to `/admin/denuncias`, rendered only when `sessionUser?.role === "admin"`.
A trailing chevron distinguishes it from the toggle row.

It carries no open count. Doing so would fetch the admin queue on every Perfil render for every
admin, to decorate a link — the count belongs on the screen it describes.

## Contracts

In `packages/contracts/src/flag.ts`:

```ts
export const flagReasonSchema = z.enum(["illegal", "inappropriate", "spam", "wrong_info", "other"]);
export type FlagReason = z.infer<typeof flagReasonSchema>;

export const flagTargetTypeSchema = z.enum(["product", "discovery"]);

export const adminQueueItemSchema = z.object({
  targetType: flagTargetTypeSchema,
  targetId: z.string().uuid(),
  /** Null when the target no longer exists; the card renders "Conteúdo removido". */
  targetName: z.string().nullable(),
  /** "Mercadinho do Zé · R$ 24,90" for a discovery; null for a product. */
  targetContext: z.string().nullable(),
  flagCount: z.number().int().positive(),
  reasons: z.array(flagReasonSchema).nonempty(),
  latestComment: z.string().nullable(),
  latestReporterEmail: z.string().email(),
  latestAt: z.string().datetime(),
});

export const adminQueueResponseSchema = z.object({ items: z.array(adminQueueItemSchema) });
```

`createFlagSchema` is refactored to reuse `flagReasonSchema` and `flagTargetTypeSchema` rather than
repeating the literals, and `flagResponseSchema` tightens `reason` and `targetType` from
`z.string()` to those enums. `adminActionSchema` is unchanged and now types the target-scoped
`PATCH` body. `adminFlagResponseSchema` and its type are deleted with the endpoint they described.

`targetContext` is composed **server-side**. Price formatting is `pt-BR` currency either way, and
sending `placeName` and `priceBrl` as separate fields only to concatenate them in one component
would put a formatting decision in two places. The web app receives a string it renders.

## State and data

No new entities, no new domain concepts, one migration — the `flags` index. Server state is a
single TanStack Query key; nothing about moderation enters Zustand. The only client state is the
per-card `confirming` boolean, which is ephemeral and local by the same reasoning the search
collapse state was.

## Accessibility

- 44×44 minimum on the back button, both action buttons, both confirmation buttons and the Ajustes
  row.
- The confirmation swap is announced: the action container is `aria-live="polite"`, so a screen
  reader hears "Remover mesmo?" when the buttons change under it.
- Buttons name their target, not just their verb: `aria-label="Remover Arroz 5kg"`. A list of
  identical "Remover" buttons is unusable by voice or by rotor.
- Chips are text, not colour alone — the reason is readable with the hue ignored.
- `animate-toast-in` is already neutralised under `prefers-reduced-motion`.

## Performance

This route is admin-only and lazy-loaded, so it never enters a normal user's bundle. It adds no
library. The two removed endpoints and the N+1 they carried leave the API slightly smaller than
before. The `size-limit` budget in `docs/PERFORMANCE.md` remains the gate, and this change should
not move it.

## Testing

**API** (Jest, in-memory fakes as the existing use-case tests do):

- `list-moderation-queue` — several flags on one target collapse to one item with the right count
  and de-duplicated reasons; two targets stay two items; a target whose content is gone yields
  `targetName: null`.
- `action-moderation-target` — `hide` on a discovery sets `hiddenAt`; `hide` on a product sets
  `status = 'blocked'`; either marks **every** open flag on the target `actioned` and leaves flags
  on other targets alone; `dismiss` touches no content; no open flags → `NotFoundError`.
- `AdminGuard` — a `user`-role token gets 403 on both routes.

**Web** (Testing Library, `jest.mock` factories per the existing suites):

- `DenunciasPage` — renders a card per item; shows the count chip only when `flagCount > 1`;
  harmful and quality reasons take different chip classes; loading, error and empty states are
  distinct; "Ignorar" calls the mutation immediately; "Remover" does **not** call it until
  "Sim, remover" is pressed, and "Cancelar" restores the original buttons without calling it; a
  card with `targetName: null` offers only "Ignorar".
- `AdminRoute` — no session redirects to `/signin`; a `user` session redirects to `/`; an `admin`
  session renders the child.
- `PerfilPage` — the Denúncias row is absent for a `user` session and present for an `admin` one.

`pnpm lint`, `pnpm typecheck`, `pnpm test` and `npx impeccable detect apps/web/src/` gate the work.

## Documentation follow-ups

- Regenerate `DESIGN.md` with `/impeccable document` once the screen ships.
- Tick the "minimal admin surface" P0 in `docs/specs/feedback-flags.spec.md`'s backlog mapping.
- Update the "No rich admin dashboard" non-goal in `docs/specs/MVP-OVERVIEW.md` §32: still a
  minimal queue, but no longer "direct DB". (`docs/ROADMAP.md` has no moderation entries — E10
  lives in `MVP-OVERVIEW.md`.)

## Open items (deliberately not resolved here)

1. **Un-hide.** Reversing a removal stays a database operation. If moderators start making
   mistakes, the endpoint and an "escondidos" filter are the follow-up — not this spec.
2. **Who is an admin.** Roles are set directly in the database; there is no promotion flow. That is
   Q3 in `feedback-flags.spec.md` and unchanged by this work.
3. **Auto-hide threshold.** The `flagCount` this queue now computes is exactly the input a
   threshold rule would need, but choosing N is a product decision (P1).

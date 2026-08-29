# Design: Mobile Shell & Navigation

**Date:** 2026-08-29
**Status:** Approved — ready for implementation planning
**Source:** `docs/superpowers/design_handoff_aonde_tem_mobile/` (README + `Aonde Tem Mobile App.dc.html`)

## Context

The mobile design handoff is a *port + extension* of the existing PWA: the screens that
already exist (Seek/map, place detail, report flow, sign-in, dark theme) were drawn from the
real source files and match them 1:1, while five screens are new. The handoff does **not**
specify global navigation — the mockup shows a full-screen map with floating chrome and no
way to reach the new screens.

This spec covers the resulting decision: replacing the floating top-corner chrome with a
bottom tab bar as the app's global navigation, plus the screens that need no new backend.
Screens that require API work that does not exist yet get their own spec.

## Decisions

| Question | Decision |
|---|---|
| Global navigation | Bottom tab bar; top-corner pills retire into it |
| Tab composition | 4 positions — Mapa · Avisos · **[+]** · Perfil, with `+` as a raised center button |
| Report FAB | Retired; the raised `+` replaces it |
| Search | Collapses to a 44×44 magnifier button; expands inline with a suggestion dropdown |
| Scope split | This plan = anything needing no new backend; separate spec = the rest |
| Avisos / Perfil in this plan | Placeholder screens; Perfil carries the **Ajustes** block (theme, sign in/out) |
| Signed-out | Full bar always visible; Perfil opens freely, Avisos and `+` route to `/signin` |
| Sign-in method | Stays e-mail + password; the docs' magic-code divergence is recorded, not resolved here |
| Onboarding gate | First visit for **any** visitor, signed in or not |
| `/report` | Stays a full-screen route with no tab bar |

## Scope

**In scope**

1. App shell: bottom tab bar, layout route, layout tokens, chrome repositioning.
2. Collapsible search with a product-suggestion dropdown.
3. Onboarding (3 screens) with a persisted first-run gate.
4. Placeholder `/avisos` and `/perfil`, the latter hosting theme + session controls.
5. Visual-parity pass over the already-built screens against the mockup.

**Out of scope — separate spec**

- Avisos / Watchlist (Epic E11 — needs `Watch`, `PushSubscription`, `Notification`).
- Full Profile (stats + "meus relatos" — needs a discoveries-by-reporter endpoint).
- Item price history (P2; the `PriceHistory` entity does not exist).
- Admin moderation queue (internal; `Flag` exists but has no UI).

## Architecture

### Router

A nested layout route owns the tab bar. Routes inside it get the bar; routes outside it do
not, so "has a tab bar" is structure rather than a `pathname` conditional that every new
route must remember to update.

```text
RootLayout  (theme sync, offline banner, toasts, Google token capture)
├── AppShell            → renders <Outlet/> + <BottomNav/>
│   ├── /               SeekPage
│   ├── /avisos         AvisosPlaceholder
│   └── /perfil         PerfilPage
├── /onboarding         OnboardingPage
├── /signin  /signup    auth pages
└── /report             ReportPage (ProtectedRoute)
```

`RootLayout` stops rendering `<ThemeToggle/>` and `<AppHeader/>`. Those two components hold
nothing but the theme pill, the account pill and its "Sair" menu, and the "Entrar" pill — all
of which move into Perfil — so `AppHeader.tsx` and `AppHeader.test.tsx` are deleted rather
than emptied, and `ThemeToggle.tsx` survives only if Perfil reuses it as an inline control.
`ProtectedRoute` is untouched. All shell routes stay lazy-loaded through the existing
`PageSuspense` wrapper.

### Feature slices

Following the established `features/<feature>/{ui,model,api}` layout:

- `features/shell/ui/` — `AppShell.tsx`, `BottomNav.tsx`
- `features/onboarding/ui/` — `OnboardingPage.tsx`; `features/onboarding/model/onboarding.slice.ts`
- `features/profile/ui/` — `PerfilPage.tsx`, `SettingsSection.tsx`
- `features/notifications/ui/` — `AvisosPlaceholder.tsx` (the slice E11 will later fill in)
- `features/product/api/product-autocomplete.api.ts` — `useProductSearch` moved out of
  `features/report/api/`, so `seek` and `report` both consume it without importing across
  sibling slices.

### Layout tokens

Two new custom properties in `apps/web/src/app/index.css`, mirroring the existing
`--header-inset-top` / `--header-clearance` pair, declared in `:root` (not `@theme`, which
only auto-generates utilities for its recognized namespaces):

```css
--bottom-nav-height: 56px;
--bottom-nav-clearance: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 12px);
```

Everything floating above the map references `--bottom-nav-clearance` instead of hardcoded
offsets, so the bar and the chrome above it cannot drift apart.

### Z-index

The bar sits at `--z-sticky` (30) — below `--z-modal-backdrop` (40). `BottomSheet` therefore
keeps covering the navigation, as a modal should, with no change to the sheet itself.

## Components

### BottomNav

Four positions. Mapa / Avisos / Perfil are flat icon+label tabs; `+` is a 56px `bg-brand`
circle raised above the bar's top edge, centered.

- Height `--bottom-nav-height` plus `env(safe-area-inset-bottom)` padding.
- `bg-surface` with a `border-t border-border`. Per the Floating-Only Rule the bar is
  edge-anchored chrome, not something covering the map, so it takes a border, not a shadow.
  The raised `+` does cover the map and keeps `shadow-lg`, exactly as today's FAB.
- Active tab: `text-accent`; inactive: `text-text-muted`. This is the screen's one saturated
  color, satisfying the One Accent Rule.
- Every target is at least 44×44.
- Semantics: `<nav>` plus `aria-current="page"` on the active tab. The `+` is a button, not a
  tab — it is an action, labeled "Relatar produto".
- Signed out, Avisos and `+` navigate to `/signin`; Perfil and Mapa behave normally.

### SearchBar — collapsed and expanded

- **Collapsed:** 44×44 magnifier button at `top-(--header-inset-top) left-4`, `bg-surface`,
  `rounded-full`, `shadow-md` — the same pill vocabulary the ThemeToggle used in that corner,
  so the map's top-left keeps a single familiar affordance.
- **Expanded:** today's full-width bar (`top-4 left-4 right-4`), autofocused, with a
  suggestion dropdown beneath it. Escape and the `×` button clear the query and collapse the
  bar. Choosing a suggestion closes only the dropdown: the bar stays expanded with the chosen
  term in it, so the active filter is always visible and one tap from being cleared. In other
  words, the bar collapses only when there is no query.
- **Suggestions:** `useProductSearch` (already debounced, `staleTime` 60s, minimum 2
  characters). Choosing one fills the input and applies the filter. The current live
  debounced filter is unchanged for people who just type — suggestions are additive.
- **Empty result:** no dropdown, no message. The map already answers the query.
- **A11y:** the combobox pattern already implemented in `ProductPicker.tsx` —
  `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, arrow-key and
  Enter handling. Reuse that implementation's shape rather than inventing a second one.
- The `denied` geolocation banner stays with the search bar and remains visible while
  collapsed, since it explains what the map is showing.

### Onboarding

Three screens, one-way `Continuar`, progress dots (6px, active widens to a 20px `bg-brand`
pill), CTAs pinned to the bottom with 24–32px padding and a 44px minimum height.

1. **Welcome** — full-bleed `bg-brand`, white icon badge and type. The only full-color screen
   in the app, reserved for this moment. `Começar` (white pill) plus `Já tenho conta` (ghost,
   white) → `/signin`.
2. **Value prop** — `bg-surface`, `bg-surface-alt` circular icon badge in the `EmptyState`
   vocabulary. Copy: "Relatos da comunidade" / "Quem viu, reporta em segundos. Relatos
   antigos somem — você só vê o que está fresco." CTA `Continuar`.
3. **Location** — same layout. `Permitir localização` calls the same `useGeolocation` hook
   `SeekPage` and `PlacePicker` use, so the browser prompt fires from a real user gesture;
   `Agora não` (ghost) skips. Either outcome finishes onboarding — a denied permission is
   already handled by the map's São Paulo fallback and its existing banner.

Copy is verbatim from the handoff README.

**Gate:** `hasSeenOnboarding` in `onboarding.slice.ts`, added to the store's `partialize`
list. It is set on finishing *or* skipping, so onboarding never repeats. A visitor landing on
`/` with the flag unset is redirected to `/onboarding`; every other route stays reachable
directly, so a shared link or a push notification is never hijacked by onboarding.

### Perfil (placeholder plus Ajustes)

- **Ajustes** block, functional from day one: the theme toggle as a labeled row (replacing the
  floating `ThemeToggle` pill), and `Sair` when signed in / `Entrar` when not, with the
  supporting line "Entre para relatar e acompanhar itens".
- **Meus relatos** section: an `EmptyState`-style "em breve" panel. The avatar/name header,
  the stat columns, and the real report list arrive with the separate spec.

### Avisos (placeholder)

An `EmptyState` "em breve" panel using the existing component and its `animate-badge-in`
badge. No data fetching, no `Watch` model — this route exists so the tab bar is complete and
E11 has a slot to land in.

### Existing-screen parity pass

The handoff claims 1:1 parity for `PlaceModal`, `ReportPage` and `SignInPage`, so this is
verification plus shell adaptation, not a rewrite:

- Sheets and full-screen routes respect `env(safe-area-inset-bottom)`.
- `SeekPage` chrome moves onto `--bottom-nav-clearance`: the radius pill (`bottom-6 left-4`),
  the fetch-error card and the `EmptyState` container (both currently `bottom-20`).
- The FAB is deleted from `SeekPage`; the `+` in the bar takes over.
- Any drift found against the mockup is fixed in place, using existing tokens and utilities.

## State and data

No new server state, no new endpoints, no contract changes. Additions are client-only:

- `onboarding.slice.ts` — `hasSeenOnboarding: boolean`, persisted via `partialize`.
- Search collapsed/expanded is local `useState`, deliberately not in Zustand: it is ephemeral
  UI state with no cross-component consumer.

Theme and session keep using the slices they already have.

## Accessibility

- 44×44 minimum on every tab, the `+`, the collapsed magnifier, and every onboarding control.
- `<nav>` with `aria-current="page"`; the `+` labeled as an action.
- Combobox semantics on the search dropdown, fully keyboard-operable.
- Focus moves into the search input on expand and returns to the magnifier on collapse — the
  same discipline `BottomSheet` and `AppHeader`'s menu already follow.
- Onboarding is keyboard-navigable; the dots are decorative (`aria-hidden`) with the step
  stated in text.
- All animations reuse the existing keyframes, already neutralized under
  `prefers-reduced-motion`.

## Performance

Per `docs/PERFORMANCE.md`, and the Moto G over 3G litmus test:

- The tab bar is static markup with no runtime dependency; the shell adds no library.
- Shell routes stay lazy-loaded behind `PageSuspense`; onboarding is its own chunk and is
  never fetched by returning visitors.
- Suggestions reuse an already-cached, debounced query — no new network chatter on the map.
- The change should be bundle-neutral or slightly negative (the FAB and two floating pills go
  away); the `size-limit` budget remains the gate.

## Testing

Jest plus Testing Library, following the existing `.test.tsx` files:

- `BottomNav` — active-tab marking, `+` navigating to `/report`, signed-out Avisos and `+`
  routing to `/signin`, Perfil reachable signed out.
- Onboarding gate — an unset flag redirects `/` to `/onboarding`; finishing and skipping both
  set the flag; a set flag renders the map directly.
- `SearchBar` — collapse and expand, focus movement, suggestion selection applying the
  filter, Escape collapsing.
- `PerfilPage` — the theme toggle flips the store; Entrar/Sair render per session state.

`pnpm lint`, `pnpm typecheck` and `pnpm test` gate the work, plus
`npx impeccable detect apps/web/src/`.

## Documentation follow-ups

- Regenerate `DESIGN.md` with `/impeccable document` once the shell ships.
- Update `PRODUCT.md` with the navigation model.
- Keep `*.en.md` / `*.pt.md` in sync for anything new.

## Open items (deliberately not resolved here)

1. **Sign-in method** — the code uses e-mail plus password; `docs/specs/MVP-OVERVIEW.md` §G4
   describes a magic-code flow. This needs its own decision cycle: it is backend and
   transactional-email work, not layout.
2. **Dark map tiles** — MapLibre's tile style still does not follow the app theme
   (`DESIGN.md` §2). Carried over unchanged.
3. **Admin moderation UI** — `MVP-OVERVIEW.md` lists "no rich admin dashboard" as a non-goal;
   whether `apps/web` hosts a queue at all is still open.

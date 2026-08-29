# Handoff: Aonde Tem — Mobile App Design

## Overview
Full mobile-app flow for Aonde Tem (community map for "where's this item available, and for how much"), covering both journeys — **Seeker** (find) and **Reporter** (post) — plus four new screens (onboarding, watchlist/notifications, profile, item price-history) and a minimal internal moderation queue. Built directly on the existing `DESIGN.md` tokens and the current `apps/web` component structure — this is a *port + extension* of the real PWA, not a new visual system.

## About the Design Files
The bundled HTML file (`Aonde Tem Mobile App.dc.html`) is a **design reference** — a static, high-fidelity visual mockup of every screen laid out as phone-shaped cards (plus two real device-bezel renders for the home screen). It is not production code. The task is to **recreate these screens inside the existing `apps/web` React + Tailwind v4 codebase**, using its established patterns (feature-sliced `features/<feature>/{ui,model,api}`, Zustand slices, TanStack Query, the shared `BottomSheet`/`GhostButton` primitives) — not by copying the mockup's raw inline HTML/CSS.

## Fidelity
**High-fidelity.** Every existing screen (map/search, place-detail sheet, report flow, sign-in) was recreated from actually reading the current source files (`SeekPage.tsx`, `SearchBar.tsx`, `EmptyState.tsx`, `PlaceModal.tsx`, `ReportPage.tsx` + its pickers, `SignInPage.tsx`, `AppHeader.tsx`, `ThemeToggle.tsx`, `BottomSheet.tsx`) and `index.css`'s exact token values — copy, spacing, radii, and colors match 1:1. New screens (onboarding, watchlist, profile, price history, moderation) are original but strictly reuse the same tokens/components/patterns — implement them with the same rigor as the ported screens, not as a separate style.

## Design Tokens
Source of truth: `apps/web/src/app/index.css` `@theme` block + `.dark` overrides. Do not hardcode these — reference the existing Tailwind utilities (`bg-brand`, `text-accent`, `rounded-control`, etc.).

| Token | Light | Dark | Tailwind utility |
|---|---|---|---|
| brand (fill only) | #1a5c3a | #1a5c3a (unchanged) | `bg-brand` |
| accent (text/border/ring/fresh) | #1a5c3a | #3ea873 | `text-accent` / `ring-accent` / `text-fresh` |
| surface | #ffffff | #12160f | `bg-surface` |
| surface-alt | #f7f7f5 | #1b201a | `bg-surface-alt` |
| border | #e5e5e0 | #616f63 | `border-border` |
| text | #1a1a1a | #f1f3ef | `text-text` |
| text-muted | #6b7280 | #a3ac9f | `text-text-muted` |
| aging | #b45309 | #d97b2e | `text-aging` |
| stale | #9ca3af | #9ca3af (unchanged) | `text-stale` |
| error | #dc2626 | #ef5350 | `text-error` |
| user-location | #2563eb (unchanged) | #2563eb | `bg-user-location` |
| radius-control | 0.75rem (12px) | — | `rounded-control` |
| radius-sheet | 1rem (16px) | — | `rounded-sheet` / `rounded-t-sheet` |
| font | system-ui, -apple-system, "Segoe UI", sans-serif | — | `font-sans` (default) |

Named rules to preserve (see `DESIGN.md`): **Trust Green Rule** (fresh state = accent, same CSS var), **One Accent Rule** (only one saturated color per screen), **Two-Radius Rule** (control vs sheet, no third radius), **Floating-Only Rule** (shadow only on things covering the map: search bar, FABs, dropdowns, toasts, sheets).

## Screens / Views

### 1. Onboarding (NEW)
- **Purpose**: First-run intro before the map, 3 screens: Welcome → value prop (community reports) → location permission ask.
- **Layout**: Full-bleed single column, icon/illustration centered top ~60%, copy + 1-2 buttons pinned bottom with 24-32px padding.
- **Components**: Welcome screen uses a solid `bg-brand` full-screen panel (white icon badge, white heading/subhead) — the *only* full-color screen in the app, reserved for this first-impression moment. Screens 2-3 use `bg-surface` with a `bg-surface-alt` circular icon badge (Feather-style stroke icon, matching `EmptyState`'s vocabulary). Primary CTA: pill-shaped (`rounded-full`), `bg-brand`, white text, full-width, min-h 44px. Secondary: ghost text button, `text-text-muted`. Progress dots: 6px circles, active dot widens to 20px pill in `bg-brand`.
- **Copy**: "Aonde Tem" / "Ache onde um produto está disponível agora, e por quanto." · "Relatos da comunidade" / "Quem viu, reporta em segundos. Relatos antigos somem — você só vê o que está fresco." · "Ative sua localização" / "Para mostrar relatos perto de você e preencher o local automaticamente ao relatar." Buttons: "Começar", "Já tenho conta", "Continuar", "Permitir localização", "Agora não".
- **State**: One-time — gate behind a persisted flag (e.g. `localStorage`/Zustand slice `hasSeenOnboarding`), skip entirely on repeat visits. Location screen should call the same `useGeolocation` hook already used by `SeekPage`/`PlacePicker`.

### 2. Seek — Map & Search (PORT of `SeekPage.tsx` + `SearchBar.tsx` + `EmptyState.tsx`)
- **Layout**: Full-screen map (`MapShell`) with floating chrome on top, exactly as today: search bar `absolute top-4 left-4 right-4`, radius pill `bottom-6 left-4`, report FAB `bottom-6 right-4` (56×56, `bg-brand`, `rounded-full`, `shadow-lg`, "+" glyph), `ThemeToggle` pill fixed top-left and account pill/"Entrar" fixed top-right at `var(--header-inset-top)`.
- **States to implement**: default map with markers; search-active (input filled, dropdown-style suggestion list beneath — note: current `SearchBar` has no dropdown, it's a live-filtering debounced text field, so the "search typing" mock's suggestion list is a **new** enhancement, not in the current code — flag this as new behavior if adopted); empty state (no fresh reports) using `EmptyState.tsx` verbatim; fetch-error card (see `SeekPage.tsx`'s existing error branch); loading pill "Buscando…".
- **Markers**: color-coded by freshness using the exact same three-tier logic as `PlaceModal.tsx`'s `freshnessClass` (< 2h = fresh/accent, 2-12h = aging/amber, 12h+ = stale/gray), rendered as a small white price-pill marker (matches `DiscoveryMarkerLayer.tsx` — read that file for exact marker DOM/paint-layer implementation before building).
- **Copy**: placeholder "Buscar produto…", denied-location banner "Localização negada — mostrando São Paulo. Pan para sua área.", radius label "Raio".

### 3. Place Detail (PORT of `PlaceModal.tsx` via `BottomSheet.tsx`)
- **Layout**: Bottom sheet, `rounded-t-sheet`, `shadow-xl`, max-height 80vh, header (place name + address/distance + close ×) → scrollable item list → sticky footer "Ver no mapa" button.
- **Item row**: product name (font-medium) + price (font-bold, tabular-nums) on one baseline row; second row: quantity "N unid." + freshness label+color; optional italic note; if authenticated → "Denunciar" ghost link; if `item.isMine` → "Editar" (accent) / "Excluir" (error) ghost links. Divider `border-border` between rows, no border on last.
- **Behavior**: implement via the shared `BottomSheet` primitive (focus trap, Escape-close, dialog stack) — do not hand-roll a new sheet.

### 4. Report a Discovery (PORT of `ReportPage.tsx` + `ProductPicker`/`PlacePicker`/`PriceInput`/`QuantityStepper`/`ConfirmStep`)
- **Flow**: form (progressive disclosure — price/quantity hidden until product + place are both filled, one-way reveal, `animate-toast-in`) → confirm (read-only summary card + attestation copy + Confirm/Editar) → success (checkmark pop + "Ver no mapa").
- **Fields**: Product (combobox with autocomplete dropdown, "Produto novo — será cadastrado." hint when no match), Place (nearby-place suggestion buttons + free-text fallback + "Usar minha localização atual" button, confirmed-location checkmark), Price (R$-prefixed, comma-decimal BRL input with strict character filtering — see `PriceInput.tsx` for the exact validation logic), Quantity (stepper, min 1).
- **Copy**: exact Portuguese strings are in the source files above — reuse verbatim (e.g. "Informe produto e local para continuar", "Ao confirmar, você declara que este preço é real e viu o produto hoje.", "Relato enviado!", "Você ajudou alguém a encontrar esse produto.").
- **Validation**: product name required; place required AND must have real coords (`hasRealCoords`) — a typed-but-unselected place name must block submit; price > 0 and ≤ 99,999.99.

### 5. Auth — Sign In (PORT of `SignInPage.tsx`)
- **Layout**: Centered column, max-w-sm, "Entrar" heading, Google OAuth button (full brand-color SVG logo, bordered button), "ou" divider, email + password fields (label above input, never placeholder-only), primary submit button, "Criar conta" link at the bottom.
- **Note**: `MVP-OVERVIEW.md` also specs a **magic-code (passwordless) email flow** as the primary non-Google method (not password) — check with product/eng which is current before building; the live `SignInPage.tsx` currently uses password, but the docs describe magic-code as G4's intended UX.

### 6. Dark Theme
- Same components as above; only the token values change (see Design Tokens table) — no separate dark-specific layout or copy. Toggle is user-controlled via the top-left `ThemeToggle` pill (not OS-driven), persisted in the theme store slice, applied via a `dark` class on `<html>`.
- **Known gap to carry over**: MapLibre's tile style does not switch with app theme — the map stays light-styled under dark mode (see `DESIGN.md` §2).

### 7. New Screens

**Watchlist / Notifications Inbox** — header "Avisos" + "+" add action; list of notification rows (unread = solid accent dot + full-opacity text, read = gray dot + 60% opacity) each with item name, place/distance/time; below, a "Meus itens em observação" section of removable chips + dashed "+ Adicionar" chip. Maps to the **Notifications & Watchlist (Epic E11)** spec — see `docs/specs/NOTIFICATIONS.en.md` for the full data model (`Watch`, `PushSubscription`, `Notification`) and requirements (Web Push + in-app inbox, batched delivery, push on/off toggle, LGPD consent) before implementing.

**Profile / My Reports** — header: avatar circle (initials, `bg-brand`), display name, "Reportando desde <mês/ano>", two stat columns (report count, confirmation %); body: list of the user's active discoveries (name/place/price) with a visually de-emphasized (gray, "expirado" label) row style once a report has expired. No dedicated backend entity is specced for this yet — it composes existing `Discovery`/`User` data (see `docs/specs/MVP-OVERVIEW.md` §5) filtered to `reporterId = current user`.

**Item Detail — Price History** *(P2/future — design-for, don't build yet per `PRODUCT.en.md` §9)* — header = item name + back; body: a simple line-chart card (min/current/max labels) over a 30-day window, then a list of "available now" places sorted by freshness with price + distance. Depends on the not-yet-built `PriceHistory` entity.

**Admin Moderation Queue** *(internal, minimal per `MVP-OVERVIEW.md` non-goals — "No rich admin dashboard")* — header "Denúncias" + open count; each flagged item as a card: item name + reason chip (color-coded: error-red "ilegal"/"spam" variants use aging-amber — pick one saturated color per reason category, not per card), reporter/flag count + relative time, two full-width actions "Remover" (solid error) / "Ignorar" (outlined ghost). Maps to the `Flag` entity in `docs/specs/MVP-OVERVIEW.md` §5 and `feedback-flags.spec.md`.

## Interactions & Behavior
- **Animations** (already defined in `index.css`, reuse the same `@keyframes`/utility names — do not invent new ones): `animate-slide-up` (sheets), `animate-backdrop-in` (scrim), `animate-toast-in` (toasts + the report form's progressive reveal), `animate-badge-in` (empty-state/error icon badges), `animate-success-pop` + `animate-check-draw` (report success checkmark — circle pop then stroke-dashoffset draw). All are neutralized under `prefers-reduced-motion`.
- **Bottom sheets**: always the shared `BottomSheet` primitive — `role="dialog"`, `aria-modal`, focus-trapped, Escape-to-close, restores focus to trigger, stacks correctly (dialog-stack model) when one sheet opens another (e.g. flagging from inside place-detail).
- **Touch targets**: 44×44px minimum on every button/chip/icon-only control, no exceptions — this includes the new screens.
- **Hover**: intentionally under-specified (touch-first product) — rely on `:active`/`:disabled`, not desktop `:hover` polish, except where the existing code already has it (e.g. Google button's `hover:bg-surface-alt`).

## Files
- `Aonde Tem Mobile App.dc.html` — the full visual reference (hero iOS/Android device frames for the home screen + phone-card gallery of every other screen/state, light and dark).

## What's needed to apply this in the real codebase
1. **New feature slices** (feature-sliced pattern, `features/<name>/{ui,model,api}`): `onboarding`, `watchlist` (or fold into `notifications` once E11 lands), `profile`, and (later) `price-history`. Admin moderation likely lives outside `apps/web` entirely per the "minimal queue / direct DB for v1" non-goal — confirm with eng whether it needs a UI at all yet.
2. **Read the specs before building any new screen's data layer**: `docs/specs/MVP-OVERVIEW.md` (shared data model), `docs/specs/NOTIFICATIONS.en.md` (watchlist), `docs/specs/feedback-flags.spec.md` (moderation). None of the new screens' entities exist in the schema yet except what MVP-OVERVIEW already defines (`Flag`).
3. **Reuse, don't rebuild**: `BottomSheet`, `GhostButton`, `ThemeToggle`, `AppHeader`, the freshness-label/class helpers in `PlaceModal.tsx`, and `MAP_COLORS` for any new map paint layer.
4. **Regenerate `DESIGN.md`** with `/impeccable document` after these screens ship, so the generated design system doc stays in sync.
5. **Keep bilingual docs in sync** (`*.en.md`/`*.pt.md`) if any of these new screens get their own spec file.

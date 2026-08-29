---
name: Aonde Tem
description: Community-powered PWA for finding where a product is available nearby in Brazil, and for how much.
colors:
  trust-green: "#1a5c3a"
  accent: "#1a5c3a"
  surface: "#ffffff"
  surface-alt: "#f7f7f5"
  border: "#e5e5e0"
  aging-amber: "#b45309"
  stale-gray: "#9ca3af"
  ink: "#1a1a1a"
  ink-muted: "#6b7280"
  error-red: "#dc2626"
  user-location: "#2563eb"
typography:
  headline:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "normal"
  title:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.375
    letterSpacing: "normal"
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  caption:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  nav-label:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "normal"
rounded:
  control: "0.75rem"
  sheet: "1rem"
  pill: "9999px"
spacing:
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  nav-height: "56px"
components:
  button-primary:
    backgroundColor: "{colors.trust-green}"
    textColor: "#ffffff"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  button-pill:
    backgroundColor: "{colors.trust-green}"
    textColor: "#ffffff"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "12px 32px"
  button-pill-inverse:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.trust-green}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "12px 32px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  chip-selectable:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  chip-selectable-selected:
    backgroundColor: "rgb(26 92 58 / 0.1)"
    textColor: "{colors.accent}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  bottom-nav:
    backgroundColor: "{colors.surface}"
    typography: "{typography.nav-label}"
    height: "{spacing.nav-height}"
  bottom-nav-tab:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    typography: "{typography.nav-label}"
    height: "44px"
  bottom-nav-tab-active:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    typography: "{typography.nav-label}"
    height: "44px"
  bottom-nav-report:
    backgroundColor: "{colors.trust-green}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    size: "56px"
  search-collapsed:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.pill}"
    size: "44px"
  search-expanded:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "12px 16px"
  bottom-sheet:
    backgroundColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.sheet}"
    padding: "24px"
  card-summary:
    backgroundColor: "{colors.surface-alt}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sheet}"
    padding: "16px"
---

# Design System: Aonde Tem

## Overview

**Creative North Star: "The Neighborhood Scout"**

Aonde Tem is built to feel like a trusted local who already checked the shelves for you — plain, quick, and reliable rather than clever or performative. Every screen exists to answer one of two questions fast: *where is it, and how fresh is that answer* — so the interface stays out of the way of the map, the price, and the timestamp. The voice is Brazilian-Portuguese-first, friendly and practical, the way a helpful neighbor talks, never markety or hype-driven.

The shell is a **phone app shape, not a web page shape**: a fixed bottom tab bar carries global navigation, the map owns the whole canvas above it, and nothing is pinned to the top of the screen. Chrome that used to hover in the top corners has been pushed either into the tab bar or into a real destination screen, so the map's most valuable real estate — the middle and the top — stays uncovered. The one control that still floats is the raised `+` in the centre of the bar, because reporting is the one action a user must be able to reach with a thumb from anywhere.

This system explicitly rejects the generic AI-tool look: no purple/indigo gradients, no glassmorphism, no neon-on-black dashboards, no fake-metric hero sections, no gradient text, no side-stripe card borders, no emoji standing in for real iconography, and no over-rounded "friendly SaaS" everything. It is a single-brand-green, mostly-flat, map-first tool, not a marketing surface.

**Key Characteristics:**
- Map-first: the interface is a thin, legible layer of cards and sheets floating over MapLibre, never burying it.
- Bottom-anchored: **Mapa · Avisos · [+] · Perfil** is the app's one persistent piece of chrome, and it lives in thumb reach.
- One accent color doing double duty: Trust Green is both the brand identity and the "fresh Report" state color.
- Flat at rest, shadowed only when floating above the map (the raised `+`, the collapsed/expanded search, the radius pill, the recenter control, dropdowns, toasts, bottom sheets).
- One type family, fixed rem scale, six weight/size roles — no display face, no fluid `clamp()` sizing.
- 44px minimum touch targets as a near-universal, deliberate discipline (mobile, one-handed, on the move).
- Light and dark themes, user-toggled from Perfil (not just OS-preference-driven) — every token pair is contrast-verified independently in each theme.

## Colors

Restrained by design: tinted neutrals plus a single saturated accent that never exceeds a small footprint of any screen — reserved for primary actions, the "fresh" state, and brand chrome.

### Primary
- **Trust Green** (`--color-brand`): The one color that means "act" or "confirmed." Used exclusively as a solid **fill** — primary buttons, the raised `+` report control in the tab bar, the report-success badge, the active toggle track — always under white text. Identical in both themes: white-on-Trust-Green passes AA (~7.9:1) regardless of what's behind the button, so this token never needs a dark-mode value.
- **Accent Green** (`--color-accent`, `#3ea873` in dark): Trust Green's role when it appears as **text, a border, or a focus ring directly on a page surface** rather than as a fill — links, the active tab label, selected-chip borders/text, focus rings, and the "fresh" freshness label. Equal to Trust Green in light mode. In dark mode it brightens (~6.2:1 against the dark surface) because the original dark forest green drops to ~2.3:1 on a dark background — a fill color and an on-surface accent color have opposite lightness needs once the page itself goes dark, so they must be able to diverge.

### Neutral
- **Surface** (`--color-surface`, `#12160f` in dark): Base app background, card/sheet fill, and the tab bar's own background. The dark value is a near-black with the faintest green cast (not a flat, hue-less `#000`/`#111`) — ties it back to the brand rather than reading as generic "dark mode gray."
- **Surface Alt** (`--color-surface-alt`, `#1b201a` in dark): Secondary panel fill — summary cards, the map-loading skeleton, the 80px icon badge behind empty/placeholder illustrations, the highlighted row in a suggestion list. A hair off white/off-black, not warm cream or blue-black.
- **Border** (`--color-border`, `#616f63` in dark): All hairline borders — inputs, dividers, unselected chip outlines, the tab bar's top edge. The dark value is deliberately brighter than a "subtle divider" instinct would suggest (~3.1:1 against the dark surface) — anything darker fails the WCAG 1.4.11 non-text contrast minimum and the border effectively disappears.
- **Ink** (`--color-text`, `#f1f3ef` in dark): Primary text. Near-black / near-white, never pure `#000`/`#fff`.
- **Ink Muted** (`--color-text-muted`, `#a3ac9f` in dark): Secondary text, hints, placeholders, ghost-button labels, inactive tab labels and icons. Never used for body copy that must carry meaning on its own — always paired with a visible neighbor that isn't muted.

### Freshness state colors (functional, not decorative)
- **Accent Green** (`--color-fresh`): Fresh (< 2h). Literally the same CSS variable as the on-surface accent role — see the Trust Green Rule below.
- **Aging Amber** (`--color-aging`, `#d97b2e` in dark): Aging (2h–12h). Warm, legible amber; not a full alert. Also carries the map's "localização negada" notice. Brightened in dark mode for the same contrast reason as Accent Green (~3.6:1 → ~6.2:1).
- **Stale Gray** (`--color-stale`, unchanged in both themes): Stale (12h+). Reserved for the freshness label text and the stale map marker only — never for body copy. Already reads as a light-ish gray, so it stays legible against a dark surface (~7.2:1) without a dark-mode variant.
- **Error Red** (`--color-error`, `#ef5350` in dark): Form/network errors, the offline banner, the "Sair" and "Excluir" destructive actions. Brightened in dark mode (~3.8:1 → ~5.3:1).
- **User Location Blue** (`--color-user-location`, unchanged across themes): The map's "this is you" marker only. Deliberately not Trust Green — reusing the brand/fresh color for "your own position" would blur the Trust Green Rule's "confirmed, act on it" signal with an unrelated meaning. Also matches the near-universal mapping-app convention (blue dot = you).

### Named Rules
**The Trust Green Rule.** The "fresh" state color and the on-surface accent color are the *same CSS variable* on purpose (`--color-fresh: var(--color-accent)`), not just a matching hex copy-paste — a user should feel the same "this is good, act on it" signal whether green appears on a Report's timestamp, on the active tab label, or on a link. This holds in both themes even though the accent value itself shifts between them. The fill token (`--color-brand`) is intentionally allowed to diverge from the accent token across themes — a fill's contrast pair is against white text, not the page, so it doesn't need to move.

**The One Accent Rule.** Trust Green (as fill or accent) is the only saturated color on any given screen. Aging Amber and Stale Gray are muted, functional, and only ever apply to freshness and degraded-state labels — they are not a second and third accent to decorate with. The single screen that is allowed to be *entirely* Trust Green is the onboarding welcome screen; it is the app's one full-bleed brand moment, and nothing else in the product may claim a second one.

**The MapLibre Escape Hatch Rule.** MapLibre's paint API (`circle-color`, etc.) needs literal color strings — it cannot consume CSS custom properties. `apps/web/src/features/map/model/map-colors.ts` holds the one permitted set of duplicated hex literals (`MAP_COLORS.brand`/`.fresh`/`.aging`/`.stale`), each commented against its `index.css` counterpart. Never inline a fresh hex string directly into a MapLibre paint object or a map-layer JS file — import from `MAP_COLORS` instead, so a palette change has exactly two places to touch, not an unknown number. This does not apply to DOM content rendered on top of the map (markers, popups) — those are ordinary CSS and should reference the real token (e.g. `bg-user-location`).

### Dark theme
Toggled by the user from the **Perfil** screen's "Modo escuro" switch (`role="switch"`, `aria-checked`), which writes the `theme` store slice; `shared/model/use-theme-sync.ts` applies a `dark` class to `<html>`. It is not just a `prefers-color-scheme` media query, since users need to override their OS setting independently of ambient light at the moment they're using the app outdoors. Implemented as plain CSS custom-property overrides scoped to `.dark` in `index.css` (not a second `@theme` block), so every existing token-driven utility (`bg-surface`, `text-fresh`, `ring-accent`, …) picks up the new value automatically — no `dark:` utility variants needed anywhere in component code.

**Known gap:** MapLibre's tile style does not switch with the app theme (no verified free dark tile style was available to wire up), so the map canvas itself stays light-styled even when the surrounding chrome is dark. The user-location marker deliberately keeps its single light-mode-tuned blue for the same reason — it is drawn against the map, not against the app surface.

## Typography

**Body Font:** system-ui, -apple-system, "Segoe UI", sans-serif (system stack — zero download, matches `docs/PERFORMANCE.md`'s font budget)

**Character:** One family carries every role from page headline to input text to freshness caption. No serif, no display face, no fluid `clamp()` sizing — sizes are fixed rem values because users view this at consistent mobile DPI, not a responsive marketing canvas.

### Hierarchy
- **Headline** (700, 1.5rem/24px, 1.3 line-height): Full-screen page titles — "Entrar", "Criar conta", the onboarding welcome wordmark. A 1.25rem/20px step of the same role is used on the two centered full-screen moments that sit below a large icon badge (the onboarding info screens, the report-success screen), where 24px would crowd the badge.
- **Title** (600–700, 1.125rem/18px, 1.375 line-height): Screen headers and sheet titles — "Avisos", "Perfil", "Relatar produto"/"Confirmar", the place-detail sheet name, "Denunciar", "Confirmar relato". The most-used heading in the app.
- **Body** (400, 1rem/16px, 1.5 line-height): Input text, paragraph copy, primary button labels, settings-row labels. Never smaller than 16px on an actual `<input>` — prevents iOS auto-zoom on focus.
- **Label** (500, 0.875rem/14px, 1.4 line-height): Form field labels, secondary/ghost button text, chip text, list-row secondary values.
- **Caption** (400, 0.75rem/12px, 1.4 line-height): Hints, freshness timestamps, helper copy under inputs, the offline banner. At 600 weight and uppercase it also serves as the settings-section overline ("AJUSTES", "MEUS RELATOS") on Perfil — the only uppercase text in the product. This is the smallest size in **page content**.
- **Nav Label** (500, 0.6875rem/11px, 1.2 line-height): The bottom tab bar's four labels, and nothing else. The one deliberate step below Caption — it is always paired with a 24px icon and sits inside a 44px target, so the glyph, not the word, carries the identification.

### Named Rules
**The Single-Family Rule.** Product UI doesn't need a display/body pairing. One well-tuned system sans carries headings, labels, body, and data — a second family would only add load weight and visual noise for zero legibility gain here.

**The Tabular Price Rule.** Anything numeric that a user compares down a column — prices in the place-detail sheet, the radius readout on the map — sets `tabular-nums`, so digits don't shimmy as values update. Prices additionally take Ink at `font-bold` while their product name stays `font-medium`: the price is the thing the eye is hunting for.

## Layout

The app is a **single phone-width column with a fixed bottom edge**. There is no top-level app bar, no sidebar, and no desktop layout: wide viewports get the same column, with form content capped at `max-w-sm` and centered so inputs don't stretch absurdly on a tablet browser.

### The shell
`AppShell` is a layout route, not a pathname check. Routes nested under it (`/`, `/avisos`, `/perfil`) render the bottom tab bar; routes outside it (onboarding, `/signin`, `/signup`, `/report`) do not. "Has a tab bar" is therefore a structural fact about the route tree that a new route inherits or opts out of by where it is declared.

### Vertical anchors
Two layout tokens in `apps/web/src/app/index.css` own the screen's two edges. Read them; never re-derive their arithmetic inline.

- **`--header-inset-top`** (`calc(env(safe-area-inset-top, 0px) + 12px)`): what an in-flow page header row pads with, clearing the status bar/notch. Consumers: the Avisos, Perfil and Relatar header rows, plus the map's search/notice strip. Because nothing is `position: fixed` in the top region of any route, a screen only needs to clear the *safe area* — not floating chrome.
- **`--bottom-nav-height`** (`56px`) and **`--bottom-nav-clearance`** (`calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 12px)`): the bar's own height, and the offset everything floating above it anchors to. The bar itself is `--bottom-nav-height` plus the safe-area inset, with that inset as its own bottom padding so the labels never sit under the iOS home indicator.

Scrollable tabbed pages pad their bottom with `--bottom-nav-clearance` so their last row is not trapped behind the bar. Full-screen routes that sit outside the shell and pin content to the bottom edge (onboarding, the place sheet) use `calc(env(safe-area-inset-bottom, 0px) + 2rem)` instead — Android Chrome draws installed PWAs edge-to-edge with a 24–48px gesture inset, so a flat `pb-8` puts the primary CTA under the system nav bar.

### Stacking order
Six named tiers, declared as plain `:root` custom properties (not inside `@theme` — see the Don'ts) and referenced with the `z-(--z-name)` shorthand. Bare map chrome sits below all of them at a plain `z-10`.

| Tier | Value | Occupants |
|---|---|---|
| map chrome | `10` | radius pill, loading pill, empty state, fetch-error card |
| `--z-dropdown` | `20` | the map's search wrapper, suggestion listboxes |
| `--z-sticky` | `30` | the bottom tab bar, the recenter control, the offline banner |
| `--z-modal-backdrop` | `40` | sheet scrim |
| `--z-modal` | `50` | bottom sheets |
| `--z-toast` | `60` | toast stack |
| `--z-tooltip` | `70` | reserved |

### Named Rules
**The One-Edge Rule.** Only the bottom edge of the screen is permanently occupied. Nothing may be pinned to the top: a screen's header is an in-flow row that pads with `--header-inset-top`, and any transient top-edge element (the offline banner) is `pointer-events-none` so it cannot swallow taps on the affordances underneath it — the back button, the screen heading, the collapsed magnifier.

**The Clearance-Token Rule.** Anything that floats above the tab bar reads `--bottom-nav-clearance`; anything that pads clear of it reads the same token. Hardcoding a pixel value is how the recenter control ended up 40px out of line with the rest of the map chrome. One token, so a change to the bar's height moves everything together.

**The Search Wrapper Rule.** A positioned, `z-`indexed wrapper is a stacking context: a child's own `z-(--z-dropdown)` only orders it against its siblings *inside* that wrapper. The map's search wrapper therefore carries the dropdown tier itself, rather than sitting at `z-10` with the rest of the map chrome — otherwise the "Buscando…" pill, later in DOM order at the same `z-10`, paints over the first suggestion. Any new overlay that opens a list over other map chrome must be promoted the same way.

## Elevation & Depth

Flat by default. Static content — pages, cards, list rows, the tab bar — carries no shadow at all; separation comes from the Border color and Surface Alt fill, not depth. Shadow is reserved exclusively for elements that visually float *above the map or above the page*: the raised `+` report control, the collapsed magnifier and expanded search bar, the radius pill, the recenter control, the fetch-error card, suggestion dropdowns, toasts, and bottom sheets.

### Shadow Vocabulary
- **Ambient** (`shadow` / `shadow-sm`, Tailwind default): Expanded search bar, radius slider pill, fetch-error card, the theme switch's knob — a light lift to read as "on top of," not "raised off the page."
- **Menu** (`shadow-md` / `shadow-lg`, Tailwind default): The collapsed search magnifier, the recenter control, suggestion listboxes, the raised `+` report control, the toast stack — enough separation to read as interactive or transient chrome.
- **Sheet** (`shadow-xl`, Tailwind default): The `BottomSheet` primitive — the strongest shadow in the system, because it covers the most content underneath it.

### Named Rules
**The Floating-Only Rule.** Shadow means "this is temporarily covering the map or the page," never "this card is fancier than that card." A shadow on a static content card is a bug, not a style choice. The bottom tab bar is the clarifying case: it is anchored to the screen edge and separates itself with `border-t border-border`, **not** a shadow — but the raised `+` inside it is lifted 20px above the bar's top edge and genuinely floats over live map content, so it keeps `shadow-lg`. One component, both sides of the rule.

**Known gap:** shadows use Tailwind's default `rgb(0 0 0 / opacity)` color, which reads correctly on a light surface but is far less visible on the dark theme's near-black surface. Acceptable for now (the dark surface isn't pure black, so some falloff still shows), but a real fix would need dedicated `--shadow-*` theme tokens with a lighter/higher-opacity value under `.dark` — not done, to avoid migrating every `shadow-*` utility usage in one pass.

## Shapes

Two radii and a circle. Rectangular controls take the **Control radius** (12px, `rounded-control`); panels and cards take the **Sheet radius** (16px, `rounded-sheet`, or `rounded-t-sheet` for a bottom sheet's top corners only); pills, circular badges, icon buttons and standalone commitment CTAs take `rounded-full`. Both `--radius-control` and `--radius-sheet` are real `@theme` tokens in `index.css` — `--radius-*` is a Tailwind v4-recognized namespace, so `rounded-control` / `rounded-sheet` / `rounded-t-sheet` compile to genuine utilities referencing the custom property. `rounded-full` needs no matching custom property; it is already Tailwind's primitive for "fully round."

Borders are hairline and single-purpose: input outlines, unselected chip outlines, list-row dividers, the tab bar's top edge, and the white 2px ring around map markers so they stay legible over any tile. Cards do not take borders — Surface Alt fill is what separates them. Nothing is clipped, masked, or given a decorative silhouette.

The recurring circular form is the **80px icon badge**: a `rounded-full` Surface Alt circle holding a 36px muted stroke icon, shared by the empty state, the "Em breve" placeholder, the onboarding info screens and (in an Error Red tint) the error boundary. It is the app's stand-in for illustration, and it is deliberately the same object every time.

### Named Rules
**The Two-Radius Rule.** `rounded-control` (12px) is for anything living inside a form, list, or sheet. `rounded-sheet` (16px) is for the panel that contains them. `rounded-full` is reserved for the Pill CTA tier, circular icon controls, and plain circular badges. Don't introduce a third radius — pick whichever tier matches the element's role. *Known deviation:* the map's "localização negada" notice still carries a stray `rounded-lg`; it should be `rounded-control`.

**The Circle-Is-a-Target Rule.** Every circle in the chrome is also a tap target and is sized as one: the collapsed search magnifier and the recenter control are 44×44, the raised report `+` is 56×56. A circle smaller than 44px is decoration (a marker, a progress dot, a badge), never a control.

## Components

Sturdy and reassuring: solid fills (never gradients or outline-only primaries), generous touch targets, unambiguous default/disabled states. Hover is intentionally under-specified — this is a touch-first product, and most primary actions rely on `:active`/`:disabled` feedback rather than desktop `:hover` polish.

### Buttons
- **Shape:** Two families. Rectangular controls use the Control radius (12px, `rounded-control`) — this is every button that sits inline with a form, sheet, or list. Standalone, high-commitment CTAs (the onboarding CTAs, the Perfil "Entrar"/"Sair" buttons, the report-success "Ver no mapa", the error-boundary reload) use `rounded-full` instead.
- **Primary:** Trust Green fill, white text, `font-semibold`, Body-size text, 12px vertical / 16px horizontal padding minimum, full-width in forms and sheets.
- **Inverse pill:** On the one full-bleed Trust Green screen (onboarding welcome), the primary CTA inverts — Surface fill, Trust Green text — because a green button on a green field has no edge. Its secondary action is white-at-85% text, not a bordered button.
- **Disabled:** Same fill at `opacity: 0.5–0.6` — never a separate gray "disabled" color; the brand color just recedes.
- **Ghost:** Shared `GhostButton` primitive — transparent background, Ink Muted text, Label size, `min-h-11`; `fullWidth` for a standalone secondary action ("Cancelar", "Editar" on the confirm step), inline for a trigger flush with sibling content ("Denunciar" in a list row). Never a border, never a background tint. Row-level destructive and edit affordances re-color it (`text-error`, `text-accent`) rather than changing its shape.
- **Icon-only:** Minimum 44×44px hit area even when the visible glyph is smaller — the "×" close buttons, the recenter control, the back button, the toast dismiss (which borrows the toast's own padding via negative margins so the target grows without the toast visibly changing size).

### Chips (selectable)
- **Style:** Border-only by default (Border color, Ink text) — no fill.
- **Selected:** `border-accent`, `bg-accent/10` translucent fill, `text-accent`. Uses the Accent (not fill) token deliberately — a `bg-brand/10` tint of the *fill* green would be nearly invisible against the dark surface, since the fill green isn't brightened for dark mode. Used for flag reasons and nearby-place selection in the report flow.
- **Shape:** Control radius (12px), 44px minimum height.

### Cards / Containers
- **Corner Style:** Sheet radius (16px, `rounded-sheet`) for summary/error cards; Sheet radius top-only (`rounded-t-sheet`) for bottom sheets.
- **Background:** Surface Alt for summary content (the report confirm-step card), Surface for sheets and the default page background.
- **Shadow Strategy:** See Elevation & Depth — cards floating over the map get a shadow; cards embedded in normal page flow (the confirm-step summary) do not.
- **Border:** None on cards; Border color is reserved for dividers, input outlines and the tab bar's top edge.
- **Internal Padding:** 16px (`p-4`) for compact summary cards; 24px+ (`p-6`) for bottom sheets.

### Inputs / Fields
- **Style:** Border-color outline, Surface background, Control radius, Body-size text (16px — never smaller, to avoid mobile auto-zoom), label always above the field, never as placeholder-only.
- **Focus:** `focus:ring-2 ring-accent` — a solid 2px ring in the Accent (not fill) token, no color or border-width change on the field itself. Composite fields (the price input's `R$` prefix, the quantity stepper) put the ring on the wrapper with `focus-within:ring-2`.
- **Error:** Error Red caption text directly below the field with `role="alert"`; the field border itself does not change color.
- **Suggestion dropdown:** `absolute`, `z-(--z-dropdown)`, Surface fill, Border outline, Control radius, `shadow-lg`, rows at `min-h-11` with a Surface Alt highlight for the keyboard-active option. Wired as a real `role="combobox"` / `role="listbox"` pair with `aria-activedescendant`, arrow-key traversal, and outside-click dismissal on `mousedown` (not `blur`, which fires before an option's own `mousedown` can register). Shared shape between the map's search and the report flow's product picker.

### Navigation (signature component)
**The bottom tab bar is the app's global navigation** and its only persistent chrome. `BottomNav`, rendered by the `AppShell` layout route, is `fixed` to the bottom edge across the full width, at `--z-sticky`, on a Surface background with a `border-t border-border` and **no shadow**.

- **Structure:** a four-column grid — **Mapa · Avisos · [+] · Perfil**. Its height is `--bottom-nav-height` (56px) plus `env(safe-area-inset-bottom)`, which it also applies as bottom padding.
- **Tabs:** `NavLink`s, so the active one carries `aria-current="page"` for free. Each is a 24px stroke icon over an 11px Nav Label, `min-h-11`, Ink Muted at rest and **Accent Green when active** — color plus `aria-current` is the whole active treatment; there is no underline, pill, or filled background.
- **The report action:** a raised 56×56 `rounded-full` Trust Green circle holding a white `+`, translated 20px above the bar's top edge, `shadow-lg`, navigating to `/report`. It is the one element in the bar that floats over live map content and therefore the one that earns a shadow (see the Floating-Only Rule).
- **Auth:** the bar is deliberately presentational. `/avisos` and `/report` are gated by `ProtectedRoute` in the router, so the bar never branches on session state and "signed out means `/signin`" is decided in exactly one place.
- **Icons:** hand-authored Feather-style strokes (2px, round caps and joins, `currentColor`, `aria-hidden`) defined inline — the same vocabulary as every other icon in the app. No icon package, no icon font.

### Search (map)
Search **rests collapsed** so the map keeps its full canvas: a single 44×44 `rounded-full` Surface magnifier with a Border outline and `shadow-md`, sitting in the top-left at `--header-inset-top`. Tapping it expands the full pill-shaped field in place — magnifier glyph, 16px input, and a `×` that collapses it and returns focus to the trigger. Typing filters live (300ms debounce) and opens a product-suggestion listbox; suggestions are additive, typing alone still works. Escape is two-stage: the dropdown closes first, the bar only on a second press.

The wrapper spans the full strip width so the expanded field can reach both margins, and is therefore `pointer-events-none` with `pointer-events-auto` restored on the controls themselves — otherwise the invisible remainder of the strip steals pans and taps from the map underneath.

### Bottom Sheet (signature component)
The recurring "sheet over the map" pattern (place details, flag, edit, delete confirmation) is a single shared primitive (`shared/ui/BottomSheet.tsx`): `role="dialog"` + `aria-modal="true"`, a `bg-black/40` scrim at `--z-modal-backdrop` that fades in with the sheet's slide-up and dismisses on tap, focus-trapped, closes on Escape, restores focus to the trigger on close, and stacks correctly when one sheet opens another (flagging a Report from inside the place-detail sheet) via a shared dialog stack rather than DOM nesting. Panels pin their bottom padding to `calc(env(safe-area-inset-bottom, 0px) + 2rem)` so a pinned CTA never lands under the Android gesture bar. Every new "sheet over content" surface should use this primitive rather than hand-rolling another `position: absolute` panel.

### Placeholder screens
Routes whose data layer doesn't exist yet (Avisos; the "Meus relatos" section of Perfil) render the shared `ComingSoon` panel: the 80px Surface Alt icon badge, a Title-weight line, and one muted sentence naming what will land there. It shares `EmptyState`'s badge vocabulary deliberately — an unbuilt screen should read as the same product, not as a broken one.

### Removed from the system (do not reintroduce)
These components were **deleted** in the mobile-shell work. They are listed only so their traces in old comments and screenshots are recognizable as history, not as guidance:

- `AppHeader.tsx` — **deleted.** There is no persistent top bar; each screen owns an in-flow header row padded with `--header-inset-top`.
- `ThemeToggle.tsx` — **deleted.** The floating top-left theme pill is gone; theme is the "Modo escuro" switch row on Perfil.
- The floating account pill and its dropdown menu — **deleted.** Sign-in / sign-out and the account identity live in Perfil's Ajustes section.
- The floating report FAB on the map — **deleted.** Reporting is the raised `+` centre control of the bottom tab bar.
- `--header-clearance` — **deleted token.** It existed only to reserve room for the removed top overlay and left its last consumer pushing its own header 80px down the screen. `--header-inset-top` is the only top-edge token.

## Do's and Don'ts

### Do:
- **Do** keep Trust Green as the only saturated accent color on any screen — Aging Amber and Stale Gray are functional freshness labels only, never decorative. The onboarding welcome screen is the single sanctioned full-bleed brand moment; don't create a second one.
- **Do** use the system font stack everywhere; never load a webfont for this product.
- **Do** give every button, chip, and icon-only control a 44×44px minimum hit target — and treat 11px Nav Label as belonging to the tab bar alone.
- **Do** anchor anything that floats above or pads clear of the bottom bar to `--bottom-nav-clearance`, and pad in-flow page headers with `--header-inset-top`. Never hardcode the arithmetic.
- **Do** reserve shadow for things floating above the map or the page (the raised `+`, search, radius pill, recenter, dropdowns, toasts, bottom sheets) — flat everywhere else, and `border-t` rather than a shadow for the edge-anchored tab bar.
- **Do** pad full-screen routes and sheet panels that pin content to the bottom with `calc(env(safe-area-inset-bottom, 0px) + 2rem)`, so a primary CTA never lands under the Android gesture bar.
- **Do** build any new "sheet over content" surface on the shared `BottomSheet` primitive (dialog role, scrim, focus trap, Escape-to-close), not a bespoke `position: absolute` div — and use the shared `GhostButton` for secondary actions rather than hand-rolling a fourth variant.
- **Do** use `text-accent` / `border-accent` / `ring-accent` / `bg-accent/10` when Trust Green appears as text, a border, a focus ring, or a translucent tint directly on a surface. Reserve `bg-brand` for solid fills under white text. Using the fill token for an on-surface accent is invisible or badly-contrasted in dark mode.
- **Do** reference the semantic z-index scale (`--z-dropdown` 20 → `--z-sticky` 30 → `--z-modal-backdrop` 40 → `--z-modal` 50 → `--z-toast` 60 → `--z-tooltip` 70) via the `z-(--z-name)` syntax for any new stacking-context element, and promote the *wrapper* — not just the list — when an overlay must open above sibling chrome.
- **Do** use `rounded-control` / `rounded-sheet` / `rounded-t-sheet` for any new rectangular control or card — both are real `--radius-*` tokens in `index.css`, not raw Tailwind numbers. Reach for bare `rounded-full` only for the Pill CTA tier, a circular control, or a plain badge; never introduce a third radius value.
- **Do** give any new route its tab bar by nesting it under `AppShell`, and keep the bar presentational — put auth gating in the router's `ProtectedRoute`, not in the navigation.
- **Do** import from `apps/web/src/features/map/model/map-colors.ts`'s `MAP_COLORS` for any MapLibre paint-layer color — never inline a fresh hex literal into a paint object. DOM content drawn over the map (markers, popups) should reference the real CSS token instead (e.g. `bg-user-location`).

### Don't:
- **Don't** pin anything to the top of the screen. The top region belongs to the map and to each screen's own in-flow header; a transient top-edge strip (the offline banner) must be `pointer-events-none` so it can't swallow taps on the back button, the screen heading, or the collapsed magnifier underneath it.
- **Don't** reintroduce floating corner chrome — a header bar, a theme pill, an account pill, or a report FAB. Global actions belong in the tab bar; account and appearance belong in Perfil. (See *Removed from the system*.)
- **Don't** give the bottom tab bar a shadow. It is anchored to the screen edge, not floating; `border-t border-border` is its separation.
- **Don't** use purple/indigo gradients, glassmorphism, or neon-on-black "dashboard" looks — explicitly banned by `PRODUCT.md`.
- **Don't** write generic SaaS hero sections, "Boost your productivity" energy, or fake-metric dashboards — this is a utility, not a marketing surface.
- **Don't** use gradient text, side-stripe card borders, or over-round-everything — a rectangular control gets the Control radius, not a pill, "for friendliness."
- **Don't** clutter the map, ship tap targets under 44px, or put low-contrast text over map imagery.
- **Don't** use emoji as primary illustration — `PRODUCT.md` bans emoji-as-UI outright. `EmptyState`, `ComingSoon`, the onboarding screens, `ReportPage`'s success screen and `ErrorBoundary` all use the shared 80px icon badge with hand-authored Feather-style stroke SVGs instead.
- **Don't** write a bare `z-dropdown` / `z-sticky` / `z-modal` / `z-toast` class name (no parens, no `var()`). Tailwind v4's `@theme` block only recognizes its own token namespaces (`--color-*`, `--font-*`, `--radius-*`, …) and silently drops any `--z-*` custom property declared inside it — a bare `z-sticky` class compiles to nothing and silently resolves to `z-index: auto`. This is exactly what happened here (see `docs/audits/AUDIT-web-2026-07-03.md`): declare the scale as plain `:root` custom properties (already done in `index.css`), and reference them with the `z-(--z-name)` shorthand.
- **Don't** introduce a second saturated brand *fill* hue — `--color-brand` stays one value in both themes. (The accent role is expected to diverge across themes; that's `--color-accent`'s whole job, not a hue proliferation.)

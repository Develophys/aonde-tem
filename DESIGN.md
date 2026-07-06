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
rounded:
  control: "0.75rem"
  sheet: "1rem"
  pill: "9999px"
spacing:
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.trust-green}"
    textColor: "#ffffff"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  button-primary-disabled:
    backgroundColor: "{colors.trust-green}"
    textColor: "#ffffff"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  button-pill:
    backgroundColor: "{colors.trust-green}"
    textColor: "#ffffff"
    typography: "{typography.label}"
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
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
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

## 1. Overview

**Creative North Star: "The Neighborhood Scout"**

Aonde Tem is built to feel like a trusted local who already checked the shelves for you — plain, quick, and reliable rather than clever or performative. Every screen exists to answer one of two questions fast: *where is it, and how fresh is that answer* — so the interface stays out of the way of the map, the price, and the timestamp. The voice is Brazilian-Portuguese-first, friendly and practical, the way a helpful neighbor talks, never markety or hype-driven.

This system explicitly rejects the generic AI-tool look: no purple/indigo gradients, no glassmorphism, no neon-on-black dashboards, no fake-metric hero sections, no gradient text, no side-stripe card borders, no emoji standing in for real iconography, and no over-rounded "friendly SaaS" everything. It is a single-brand-green, mostly-flat, map-first tool, not a marketing surface.

**Key Characteristics:**
- Map-first: the interface is a thin, legible layer of cards and sheets floating over MapLibre, never burying it.
- One accent color doing double duty: Trust Green is both the brand identity and the "fresh Report" state color.
- Flat at rest, shadowed only when floating above the map (search bar, FAB, bottom sheets, toasts).
- One type family, fixed rem scale, five weight/size roles — no display face, no fluid clamp() sizing.
- 44px minimum touch targets as a near-universal, deliberate discipline (mobile, one-handed, on the move).
- Light and dark themes, user-toggled (not just OS-preference-driven) — every token pair is contrast-verified independently in each theme, not just carried over from light with an assumed-safe filter.

## 2. Colors

Restrained by design: tinted neutrals plus a single saturated accent that never exceeds a small footprint of any screen — reserved for primary actions, the "fresh" state, and brand chrome.

### Primary
- **Trust Green** (`#1a5c3a`): The one color that means "act" or "confirmed." Used exclusively as a solid **fill** — primary buttons, the account chip, the FAB — always under white text. Identical in both themes: white-on-`#1a5c3a` passes AA (~7.9:1) regardless of what's behind the button, so this token never needs to change for dark mode.
- **Accent Green** (`#1a5c3a` light / `#3ea873` dark): Trust Green's role when it appears as **text, a border, or a focus ring directly on a page surface** rather than as a fill — links, selected-chip borders/text, focus rings, and the "fresh" freshness label. Equal to Trust Green in light mode (same value, same 7.9:1 contrast on white). In dark mode it brightens to `#3ea873` (~6.2:1 against the dark surface) because the original dark forest green drops to ~2.3:1 on a dark background — a fill color and an on-surface accent color have opposite lightness needs once the page itself goes dark, so they must be able to diverge.

### Neutral
- **Surface** (`#ffffff` light / `#12160f` dark): Base app background and card/sheet fill. The dark value is a near-black with the faintest green cast (not a flat, hue-less `#000`/`#111`) — ties it back to the brand rather than reading as generic "dark mode gray."
- **Surface Alt** (`#f7f7f5` light / `#1b201a` dark): Secondary panel fill — summary cards, the map-loading skeleton. A hair off white/off-black, not warm cream or blue-black.
- **Border** (`#e5e5e0` light / `#616f63` dark): All hairline borders — inputs, dividers, unselected chip outlines. The dark value is deliberately brighter than a "subtle divider" instinct would suggest (~3.1:1 against the dark surface) — anything darker fails the WCAG 1.4.11 non-text contrast minimum and the border effectively disappears.
- **Ink** (`#1a1a1a` light / `#f1f3ef` dark): Primary text. Near-black / near-white, never pure `#000`/`#fff`.
- **Ink Muted** (`#6b7280` light / `#a3ac9f` dark): Secondary text, hints, placeholders, ghost-button labels. Never used for body copy that must carry meaning on its own — always paired with a visible neighbor that isn't muted.

### Freshness state colors (functional, not decorative)
- **Accent Green** (`#1a5c3a` light / `#3ea873` dark): Fresh (< 2h). Literally the same CSS variable as the on-surface accent role — see the Trust Green Rule below.
- **Aging Amber** (`#b45309` light / `#d97b2e` dark): Aging (2h–12h). Warm, legible amber; not a full alert. Brightened in dark mode for the same contrast reason as Accent Green (~3.6:1 → ~6.2:1 against the dark surface).
- **Stale Gray** (`#9ca3af`, unchanged in both themes): Stale (12h+). Reserved for the freshness label text only — never for body copy. Already reads as a light-ish gray, so it stays legible against a dark surface (~7.2:1) without needing a dark-mode variant.
- **Error Red** (`#dc2626` light / `#ef5350` dark): Form/network errors and destructive confirmations only. Brightened in dark mode (~3.8:1 → ~5.3:1).
- **User Location Blue** (`#2563eb`, unchanged across themes): The map's "this is you" marker only. Deliberately not Trust Green — reusing the brand/fresh color for "your own position" would blur the Trust Green Rule's "confirmed, act on it" signal with an unrelated meaning. Also matches the near-universal mapping-app convention (blue dot = you).

### Named Rules
**The Trust Green Rule.** The "fresh" state color and the on-surface accent color are the *same CSS variable* on purpose (`--color-fresh: var(--color-accent)`), not just a matching hex copy-paste — a user should feel the same "this is good, act on it" signal whether green appears on a Report's timestamp or on a link. This holds in both themes even though the accent value itself shifts between them. The fill token (`--color-brand`, buttons) is intentionally allowed to diverge from the accent token across themes — a button's contrast pair is against white text, not the page, so it doesn't need to move.

**The One Accent Rule.** Trust Green (as fill or accent) is the only saturated color on any given screen. Aging Amber and Stale Gray are muted, functional, and only ever apply to freshness labels — they are not a second and third accent to decorate with.

**The MapLibre Escape Hatch Rule.** MapLibre's paint API (`circle-color`, etc.) needs literal color strings — it cannot consume CSS custom properties. `apps/web/src/features/map/model/map-colors.ts` holds the one permitted set of duplicated hex literals (`MAP_COLORS.brand`/`.fresh`/`.aging`/`.stale`), each commented against its `index.css` counterpart. Never inline a fresh hex string directly into a MapLibre paint object or a map-layer JS file — import from `MAP_COLORS` instead, so a palette change has exactly two places to touch, not an unknown number. This does not apply to DOM content rendered on top of the map (markers, popups) — those are ordinary CSS and should reference the real token (e.g. `bg-user-location`), not this module.

### Dark theme
Toggled by the user (a `ThemeToggle` pill, top-left, on every route) via a `dark` class on `<html>`, persisted alongside the existing `theme` store slice — not just a `prefers-color-scheme` media query, since users need to override their OS setting independently of ambient light at the moment they're using the app outdoors. Implemented as plain CSS custom-property overrides scoped to `.dark` in `index.css` (not a second `@theme` block), so every existing token-driven utility (`bg-surface`, `text-fresh`, `ring-accent`, …) picks up the new value automatically — no `dark:` utility variants needed anywhere in component code. Known gap: MapLibre's tile style doesn't switch with the app theme (no verified free dark tile style was available to wire up), so the map itself stays light-styled even when the surrounding chrome is dark.

## 3. Typography

**Body Font:** system-ui, -apple-system, "Segoe UI", sans-serif (system stack — zero download, matches `docs/PERFORMANCE.md`'s font budget)

**Character:** One family carries every role from page headline to input text to freshness caption. No serif, no display face, no fluid clamp() sizing — sizes are fixed rem values because users view this at consistent mobile DPI, not a responsive marketing canvas.

### Hierarchy
- **Headline** (700, 1.5rem/24px, 1.3 line-height): Page-level titles — "Entrar", "Criar conta", auth and report-flow screen titles.
- **Title** (600–700, 1.125rem/18px, 1.375 line-height): Section and sheet titles — place-detail sheet name, "Denunciar", "Confirmar relato".
- **Body** (400, 1rem/16px, 1.5 line-height): Input text, paragraph copy, primary button labels. Never smaller than 16px on an actual `<input>` — prevents iOS auto-zoom on focus.
- **Label** (500, 0.875rem/14px, 1.4 line-height): Form field labels, secondary/ghost button text, chip text.
- **Caption** (400, 0.75rem/12px, 1.4 line-height): Hints, freshness timestamps, helper copy under inputs. The smallest size in the system — reserved for text that is genuinely secondary.

### Named Rules
**The Single-Family Rule.** Product UI doesn't need a display/body pairing. One well-tuned system sans carries headings, labels, body, and data — a second family would only add load weight and visual noise for zero legibility gain here.

## 4. Elevation

Flat by default. Static content — pages, cards, list rows — carries no shadow at all; separation comes from the Border color and Surface Alt fill, not depth. Shadow is reserved exclusively for elements that must visually float *above the map*: the search bar, the radius pill, the recenter and report FABs, the account menu dropdown, toasts, and the two bottom sheets. If it isn't floating over live map content, it doesn't get a shadow.

### Shadow Vocabulary
- **Ambient** (`shadow` / `shadow-sm`, Tailwind default): Search bar, radius slider pill, fetch-error card — a light lift to read as "on top of the map," not "raised off the page."
- **Menu** (`shadow-md` / `shadow-lg`, Tailwind default): Account avatar chip, account dropdown, toast stack — enough separation to read as interactive/transient chrome.
- **Sheet** (`shadow-xl`, Tailwind default): The two bottom sheets (`BottomSheet` primitive) — the strongest shadow in the system, because it's covering the most content underneath it.

### Named Rules
**The Floating-Only Rule.** Shadow means "this is temporarily covering the map or the page," never "this card is fancier than that card." A shadow on a static content card is a bug, not a style choice.

**Known gap:** shadows use Tailwind's default `rgb(0 0 0 / opacity)` color, which reads correctly on a light surface but is far less visible on the dark theme's near-black surface. Acceptable for now (the dark surface isn't pure black, so some falloff still shows), but a real fix would need dedicated `--shadow-*` theme tokens with a lighter/higher-opacity value under `.dark` — not done here to avoid migrating every `shadow-*` utility usage in one pass.

## 5. Components

Sturdy and reassuring: solid fills (never gradients or outline-only primaries), generous touch targets, unambiguous default/disabled states. Hover is intentionally under-specified — this is a touch-first product, and most primary actions rely on `:active`/`:disabled` feedback rather than desktop `:hover` polish.

### Buttons
- **Shape:** Two families. Rectangular controls use the Control radius (12px, `rounded-control`) — this is every button that sits inline with a form or list. Standalone, high-commitment CTAs (the report FAB, "Relatar agora", the report-success CTA, the error-boundary reload button, the account avatar chip) use the Pill radius (`rounded-full`) instead.
- **Primary:** Trust Green fill, white text, `font-semibold`, Body-size text, 12px vertical / 16px horizontal padding minimum, full-width in forms.
- **Disabled:** Same fill at `opacity: 0.5–0.6` — never a separate gray "disabled" color; the brand color just recedes.
- **Ghost:** Transparent background, Ink Muted text, Label-size, used for "Cancelar" / "Editar" / secondary navigation — never a border, never a background tint.
- **Icon-only:** Minimum 44×44px hit area even when the visible glyph is smaller (the "×" close buttons, the recenter FAB).

### Named Rules
**The Two-Radius Rule.** `rounded-control` (12px) is for anything living inside a form, list, or sheet. `rounded-full` is reserved for a small, deliberate set of standalone commitment-moment CTAs, the account avatar, and plain circular badges/icons. Don't introduce a third radius for buttons — pick whichever of the two matches the button's context. Both `--radius-control` and `--radius-sheet` (see Cards/Containers) are real `@theme` tokens in `index.css` — `--radius-*` is a Tailwind v4-recognized namespace, so `rounded-control` / `rounded-sheet` / `rounded-t-sheet` compile to genuine utility classes referencing the custom property, the same way the corrected z-index scale below does. `rounded-full` needs no matching custom property; it's already Tailwind's own primitive for "fully round."

### Chips (selectable)
- **Style:** Border-only by default (Border color, Ink text) — no fill.
- **Selected:** `border-accent`, `bg-accent/10` translucent fill, `text-accent`. Uses the Accent (not fill) token deliberately — a `bg-brand/10` tint of the *fill* green would be nearly invisible against the dark surface, since the fill green isn't brightened for dark mode. Used for flag reasons and nearby-place selection in the report flow.
- **Shape:** Control radius (12px), 44px minimum height.

### Cards / Containers
- **Corner Style:** Sheet radius (16px, `rounded-sheet`) for summary/error cards; Sheet radius top-only (`rounded-t-sheet`) for the two bottom sheets.
- **Background:** Surface Alt for summary content (the report confirm-step card), Surface for sheets and the default page background.
- **Shadow Strategy:** See Elevation — cards floating over the map get a shadow; cards embedded in normal page flow (the confirm-step summary) do not.
- **Border:** None on cards; Border color is reserved for dividers and input outlines.
- **Internal Padding:** 16px (`p-4`) for compact summary cards; 24px+ (`p-6`) for bottom sheets.

### Inputs / Fields
- **Style:** Border-color outline, Surface background, Control radius, Body-size text (16px — never smaller, to avoid mobile auto-zoom), label always above the field, never as placeholder-only.
- **Focus:** `focus:ring-2 ring-accent` — a solid 2px ring in the Accent (not fill) token, no color or border-width change on the field itself.
- **Error:** Error Red caption text directly below the field, field border itself does not change color.

### Navigation
- No persistent top bar. The account affordance is a single floating pill (avatar + name, or "Entrar") pinned top-right with `env(safe-area-inset-top)` handling for notched devices. Its dropdown is a small `shadow-lg` panel with `role="menu"` semantics, closing on click-outside and Escape.
- A second floating pill, top-left, is the `ThemeToggle` (`shared/ui/ThemeToggle.tsx`) — rendered globally in `RootLayout`, not inside `AppHeader`, so it's available on every route including `/signin`/`/signup` where `AppHeader` itself renders nothing.

### Bottom Sheet (signature component)
The recurring "sheet over the map" pattern (place details, flag/report dialog) is implemented as a single shared primitive (`shared/ui/BottomSheet.tsx`): `role="dialog"` + `aria-modal="true"`, focus-trapped, closes on Escape, restores focus to the trigger on close, and stacks correctly when one sheet opens another (flagging a Report from inside the place-detail sheet). Every new "sheet over content" surface should use this primitive rather than hand-rolling another `position: absolute` panel.

## 6. Do's and Don'ts

### Do:
- **Do** keep Trust Green as the only saturated accent color on any screen — Aging Amber and Stale Gray are functional freshness labels only, never decorative.
- **Do** use the system font stack everywhere; never load a webfont for this product.
- **Do** give every button, chip, and icon-only control a 44×44px minimum hit target.
- **Do** reserve shadow for things floating above the map (search bar, FABs, dropdown, toasts, bottom sheets) — flat everywhere else.
- **Do** build any new "sheet over content" surface on the shared `BottomSheet` primitive (dialog role, focus trap, Escape-to-close), not a bespoke `position: absolute` div.
- **Do** use `text-accent` / `border-accent` / `ring-accent` / `bg-accent/10` when Trust Green appears as text, a border, a focus ring, or a translucent tint directly on a surface. Reserve `bg-brand` for solid fills under white text. Using the fill token for an on-surface accent is invisible or badly-contrasted in dark mode.
- **Do** reference the semantic z-index scale (`z-dropdown` 20 → `z-sticky` 30 → `z-modal-backdrop` 40 → `z-modal` 50 → `z-toast` 60 → `z-tooltip` 70) via the `z-(--z-name)` syntax (e.g. `z-(--z-modal)`) for any new stacking-context element.
- **Do** use `rounded-control` / `rounded-sheet` / `rounded-t-sheet` for any new rectangular control or card — both are real `--radius-*` tokens in `index.css`, not raw Tailwind numbers. Reach for bare `rounded-full` only for the Pill CTA tier or a plain circular badge/icon; never introduce a third radius value.
- **Do** import from `apps/web/src/features/map/model/map-colors.ts`'s `MAP_COLORS` for any MapLibre paint-layer color — never inline a fresh hex literal into a paint object. DOM content drawn over the map (markers, popups) should reference the real CSS token instead (e.g. `bg-user-location`).

### Don't:
- **Don't** use purple/indigo gradients, glassmorphism, or neon-on-black "dashboard" looks — explicitly banned by `docs/PRODUCT.md`.
- **Don't** write generic SaaS hero sections, "Boost your productivity" energy, or fake-metric dashboards — this is a utility, not a marketing surface.
- **Don't** use gradient text, side-stripe card borders, or over-round-everything — a rectangular control gets the Control radius, not a pill, "for friendliness."
- **Don't** clutter the map, ship tap targets under 44px, or put low-contrast text over map imagery.
- **Don't** use emoji as primary illustration — `docs/PRODUCT.md` bans emoji-as-UI outright. `EmptyState`, `ReportPage`'s success screen, and `ErrorBoundary` (formerly 🗺️/✅/⚠️) now use hand-authored stroke icons matching the app's existing Feather-style SVG vocabulary instead.
- **Don't** write a bare `z-dropdown` / `z-sticky` / `z-modal` / `z-toast` class name (no parens, no `var()`). Tailwind v4's `@theme` block only recognizes its own token namespaces (`--color-*`, `--font-*`, `--radius-*`, …) and silently drops any `--z-*` custom property declared inside it — a bare `z-sticky` class compiles to nothing and silently resolves to `z-index: auto`. This is exactly what happened here (see `docs/audits/AUDIT-web-2026-07-03.md`): declare the scale as plain `:root` custom properties (already done in `index.css`), and reference them with the `z-(--z-name)` shorthand.
- **Don't** introduce a second saturated brand *fill* hue — `--color-brand` stays one value in both themes. (The accent role is expected to diverge across themes; that's `--color-accent`'s whole job, not a hue proliferation.)

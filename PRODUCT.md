# PRODUCT.md — Aonde Tem (design brief)

> Concise product context for design tooling (read by **Impeccable** on every command).
> Full product spec lives in [`docs/PRODUCT.en.md`](./docs/PRODUCT.en.md) / [`docs/PRODUTO.pt.md`](./docs/PRODUTO.pt.md).
> Generated visual system: [`DESIGN.md`](./DESIGN.md) (run `/impeccable document` to create/update it).

## What it is
A community-powered, real-time PWA for finding **where a specific item is available nearby** in
Brazil — and **how much** it costs. Core entity: a **Report** (item / where / how much / how many /
freshness). Users both *seek* items and *report* discoveries. "Waze for product availability & prices."

## Register
**Product.** This is a working tool, not a marketing site. Design serves the task: find a Report fast,
post a Report fast. (A future landing/marketing page would be designed in **brand** register — keep
the two separate.)

## Users & context of use
- **Everyday people in Brazil**, Portuguese-first, on **phones**, frequently **one-handed and on the move** (in a store aisle, on the street, in the car as passenger).
- Often **outdoors in bright sunlight** and on **patchy connectivity** → demand high contrast, large tap targets, fast first paint, offline tolerance.
- They glance, not read. The three things that must be legible **at a glance**: **price**, **distance/where**, and **freshness** (how recent the Report is).

## Brand voice / tone
- Friendly, local, plainspoken **Brazilian Portuguese**. Like a helpful neighbor who knows where to find things.
- Trustworthy and practical over clever. Calm, not hype. Never markety.
- Copy is short, concrete, action-first ("Relatar", "Ver no mapa", "Ainda tem?").

## Design priorities
1. **Map-first.** The map is the product. UI sits as light, legible cards/sheets over it — never burying it.
2. **Glanceable Reports.** Price, distance, and freshness shown as clear chips; stale Reports visibly fade.
3. **Trust signals.** Freshness and community confirmation are first-class visual elements, not afterthoughts.
4. **Mobile-native, one-handed.** Primary actions reachable by thumb; generous targets; bottom-sheet patterns.
5. **Fast & calm — performance is a pillar.** Built for low-end Android on slow/intermittent connections. Minimal chrome, lazy-loaded map, tiny payloads, restraint. See `PERFORMANCE.md` for the budgets every screen must meet.

## Navigation
- **A bottom tab bar is the app's global navigation**: **Mapa · Avisos · [+] · Perfil**, fixed to the bottom edge and present on every tabbed screen. Thumb-reachable, one-handed, always the same four destinations.
- The **report action is the raised centre control** (`+`), lifted above the bar's top edge — the one place in the app that earns a shadow, because it is the one control that floats over the map.
- **Search is collapsed on the map**: a single magnifier in the top-left corner that expands into the search field with product suggestions, and collapses again with `×`. The map keeps its full canvas by default; nothing permanent covers it.
- **Theme and account controls live in Perfil**, not as floating pills over the map. Nothing is fixed to the top of the screen any more.
- **Onboarding is shown once per device**, before the map, and never again. Deep links (a shared place, `/perfil`, `/report`) stay reachable directly — the intro intercepts the front door, not every door.

## Anti-references (slop to avoid)
- ❌ Purple/indigo gradients, glassmorphism, neon-on-black "dashboard" looks.
- ❌ Generic SaaS hero sections, "Boost your productivity" energy, fake metric dashboards.
- ❌ Gradient text, side-stripe card borders, over-rounded everything, default AI color palettes.
- ❌ Cluttered maps, tiny tap targets, low-contrast text over imagery, emoji-as-UI.
- ❌ Anything that reads "vibe-coded": treat the Impeccable slop catalog as banned by default.

## System constraints (inherit, don't reinvent)
- **Tailwind CSS v4**, CSS-first `@theme` tokens in `apps/web/src/app/index.css` — the **single source of truth** for color/type/spacing. New work extends these tokens, never hardcodes values.
- Feature-sliced React: `features/<feature>/{ui,model,api}`.
- MapLibre GL JS for the map; marker/label styling must stay readable at all zoom levels.

# Spec — Seek (map + item search)

> Feature spec · part of [`MVP-OVERVIEW.md`](./MVP-OVERVIEW.md) (shared model, personas, goals there).
> **Goal link:** G1 (core loop), G5 (performance). **Epics:** E3, E4.

## Summary
The open initial page. A visitor opens the app, sees a map centered on their location, types an item,
and sees matching **nearby discoveries** as markers — **no login required**. This is the read side of the
core loop and the product's first impression, so it must be **fast on weak phones/networks**.

## User stories
- As a visitor, I want to search an item and see nearby discoveries on a map so I can find it without an account.
- As a visitor, I want to tap a marker and see product, price, quantity, and freshness so I can judge if it's worth going.
- As a visitor, I want results centered on my location so I can pick the closest option.
- As a visitor who denies location, I want to still search by typing/panning the map.
- As a visitor with no results, I want a clear empty state ("ninguém relatou isso por aqui ainda — seja o primeiro").

## Requirements

### P0
- **Map** centered on the user's location (geolocation; graceful denial → manual pan/search).
- **Search input** for an item; results = discoveries of matching products rendered as **markers**.
- **Fuzzy matching (R-05):** search tolerates typos/variants (`pg_trgm` trigram + normalization + synonyms) so "coca 2l" finds "Coca-Cola 2L"; show **"você quis dizer…"** and, when truly empty, prompt to report. Exact-match-only would make the map look empty when it isn't.
- **Marker card** on tap: product name, price, quantity, freshness (age), place name; action to open the location in the user's maps app.
- **Freshness**: each result shows its age; expired discoveries are excluded or visibly de-emphasized.
  - *Given* I search "arroz" with location on, *when* fresh results exist in range, *then* matching discoveries appear as markers and a list updates; with none, I see the empty state.
- **Active-only results (R-08):** the nearby query **must** filter `product.status = 'active'`. Discoveries linked to `blocked` or `under_review` products must never appear in public search results — do not rely solely on `hiddenAt` on the discovery row, because blocking a product does not cascade to its discoveries.
  - *Implementation note:* add `AND p.status = 'active'` to the `WHERE` clause of any `GET /discoveries/nearby` SQL, not to a post-query JS filter.
- **Performance (gate):** MapLibre **lazy-loaded** (not in initial bundle, non-blocking first paint); first useful result ≤ 3s on slow 4G; Lighthouse mobile ≥ 90. See [`../PERFORMANCE.md`](../PERFORMANCE.md).

### P1
- Radius control (slider) wired to the query; recenter / follow-user.
- Marker **clustering** for dense areas; list/map toggle.
- "Search this area" on map pan.

### P2
- Save searches; filters by category/price.

## Open questions
- **Q4 — Freshness window:** default TTL before a discovery is "stale"/hidden (may vary by item). *(Product/Data, non-blocking.)*

## Dependencies
- Read API: `GET /discoveries/nearby?item=` (see [`report-discovery.spec.md`](./report-discovery.spec.md) / E2).
- Map tiles (MapTiler key, E3). Geolocation hook (E3).

## Backlog mapping
AT-040–AT-046 (map/geo), AT-053 (seek UI), AT-118/AT-123 (perf: lazy map, Save-Data).

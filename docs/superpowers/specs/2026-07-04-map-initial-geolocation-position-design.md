# Design: Map Waits for Geolocation Before Mounting

**Date:** 2026-07-04
**Status:** Approved

## Overview

`SeekPage` shows the full-screen map. On first render, `useGeolocation()` hasn't resolved yet, so
`coords` is `null`. Today's code gates the map's mount on `coords` truthy
(`{coords && <MapShell .../>}`), which means nothing map-like renders until the first GPS fix (or
denial/timeout) lands — no loading feedback for that window.

The underlying trap to avoid: `react-map-gl`'s `<Map initialViewState={...}>` is applied **once, at
mount**, and never again. If the map were ever mounted early (e.g. centered on `DEFAULT_COORDS`)
and `coords` resolved afterward, changing the `center` prop would silently do nothing — the map
would stay stuck at the default position forever. This is the bug behavior the user described.

## Solution

Gate the map's mount on `useGeolocation()`'s `loading` flag instead of on `coords`:

- **`loading === true`** — render a full-screen loading overlay in place of the map. The user
  cannot interact with anything underneath. Visually reuses the existing "map-loading skeleton"
  language already established by `MapShell`'s Suspense fallback (`bg-surface-alt`, centered muted
  text) — just full-screen instead of scoped to the map container.
- **`loading === false`** — mount `MapShell`/`MapView` exactly once, with
  `center = coords ?? DEFAULT_COORDS`. Because we only mount after geolocation has settled,
  `initialViewState` receives the correct final answer on its one and only application. No fly-to,
  no jump, no imperative ref hacks.

`useGeolocation`'s `loading` already flips to `false` in the same `setState` call as either a
resolved fix or a `denied`/error/timeout outcome (bounded by the existing
`{ timeout: 10_000 }` passed to `watchPosition`), so it's already a true "settled" signal — no
changes needed in `use-geolocation.ts`.

If geolocation never resolves (denied, unavailable, or timed out), `coords` stays `null`, the map
mounts at `DEFAULT_COORDS`, and the existing "Localização negada — mostrando São Paulo" banner
still shows. The user can pan freely from there — nothing new needed for that path, it already
works once the map is mounted.

### Why not keep the map mounted at `DEFAULT_COORDS` and fly-to once coords land?

That approach would mount the map early, triggering tile requests for the throwaway default
position, then discard them the moment real coords arrive and jump/fly elsewhere. On the low-end,
metered connections this product targets (`docs/PERFORMANCE.md`), wasted tile fetches are a real
cost, not just a code-cleanliness concern. Delaying the mount avoids the waste entirely and is
simpler — no ref-based effect, no "has this fired once" tracking.

### Changes

- `SeekPage.tsx`:
  - Read `loading` from `useGeolocation()` (already returned by the hook, just not destructured
    today).
  - Replace `{coords && <MapShell center={center} userPin={coords ?? undefined} .../>}` with:
    - `loading` → full-screen loading overlay (new, small inline component or JSX block).
    - otherwise → `<MapShell center={center} userPin={coords ?? undefined} discoveries={discoveries} />`
      (unchanged props/logic, just no longer gated on `coords`).
- No changes to `MapView.tsx`, `MapShell.tsx`, `map.slice.ts`, or `use-geolocation.ts` — the fix is
  entirely about *when* `SeekPage` decides to mount the map.

### Out of scope

- `PlacePicker.tsx` already handles its own pending state correctly (disables the "use current
  location" button while `coords` is `null`) and isn't affected by this change.
- No change to the manual recenter button or `flyTo` behavior for selecting a place — both already
  work correctly once the map is mounted.

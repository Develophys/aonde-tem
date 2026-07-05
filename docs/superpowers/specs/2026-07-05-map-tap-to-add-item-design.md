# Design — Tap-to-add-item on the map

> Extends [`report-discovery.spec.md`](../../specs/report-discovery.spec.md) with a new entry point
> into the existing report flow. Not on the current backlog as a numbered item — see "Docs to update."

## Summary

Today the only way into the report flow is the "+" FAB on `SeekPage`, which opens `/report` with an
empty draft; the user picks the place themselves inside `PlacePicker` (type a name, pick a nearby
suggestion, or tap "use my current location"). This adds a second entry point: tapping anywhere on
the base map drops a pin at that point, and tapping the pin opens the same `/report` flow with the
place's coordinates pre-filled to where the user tapped.

## Interaction flow

1. User taps a point on the map that is **not** an existing discovery marker/cluster.
2. A visually distinct "draft pin" appears at that point (different from the small cyan user-location
   dot and from discovery markers — an accent-colored pin, styled per this project's Impeccable
   design system at implementation time, not pixel-specified here).
3. Tapping a *different* point on the map moves the draft pin there (replaces, no separate "cancel"
   control needed).
4. Tapping the draft pin itself:
   - Sets `reportDraft.place = { lat, lng, name: "" }` (coordinates only — no name, no `placeId`).
   - Clears the draft pin.
   - Navigates to `/report`.
5. `/report` is unchanged and already behind `ProtectedRoute` — an unauthenticated user is redirected
   to sign-in exactly as when tapping the FAB today. `ReportPage`'s existing `PlacePicker` step shows
   nearby-place suggestions and requires the user to name/confirm the place before continuing, same
   as any other report.

The "+" FAB is unchanged: still opens `/report` with whatever draft is already in the store (usually
empty), with no auto-fill of GPS location.

## State

New fields on the existing map slice, `apps/web/src/features/map/model/map.slice.ts`:

```ts
export interface MapSlice {
  selectedPlaceId: string | null;
  mapRadius: number;
  draftPinCoords: { lat: number; lng: number } | null;
  selectPlace: (id: string) => void;
  clearSelectedPlace: () => void;
  setRadius: (r: number) => void;
  setDraftPin: (coords: { lat: number; lng: number } | null) => void;
}
```

`draftPinCoords` is ephemeral UI state, not added to the store's `partialize` list in
`apps/web/src/app/store/index.ts` — same treatment as `selectedPlaceId` today. A stale pin surviving
a route change and back is a harmless rough edge (tapping anywhere clears/moves it); no dismiss
control is needed for v1.

## Avoiding collision with discovery-marker clicks

`DiscoveryMarkerLayer` (`apps/web/src/features/map/ui/DiscoveryMarkerLayer.tsx`) already registers
`map.on("click", "places-points", …)` imperatively (opens `PlaceModal` via `selectPlace`). Adding a
generic `onClick` to the `<Map>` element in `MapView.tsx` fires independently on the *same* click —
so without a guard, tapping an existing marker would both open `PlaceModal` *and* drop a stray draft
pin underneath it.

Fix: the new `onClick` handler queries rendered features at the click point for the discovery layers
and bails if it hits one:

```ts
const hit = map.queryRenderedFeatures(e.point, { layers: DISCOVERY_LAYER_IDS });
if (hit.length > 0) return; // let the marker's own click handler take it from here
setDraftPin({ lat: e.lngLat.lat, lng: e.lngLat.lng });
```

`DISCOVERY_LAYER_IDS` is a new shared constant (`apps/web/src/features/map/model/map-layer-ids.ts`,
`["places-points", "places-clusters"] as const`) so `DiscoveryMarkerLayer` (which currently hardcodes
these two IDs when calling `map.addLayer(...)`) and `MapView` reference one source of truth instead
of two copies of the same strings.

The draft pin's own `Marker` click handler must call `e.originalEvent.stopPropagation()` before
navigating, so tapping the pin doesn't also re-trigger the base map's `onClick` (which would
otherwise just re-set the pin to the same coordinates — harmless, but unnecessary).

## Targeted fix: `PlacePicker`'s nearby-places query

`apps/web/src/features/report/ui/PlacePicker.tsx` currently queries `useNearbyPlaces(coords?.lat,
coords?.lng)` using the device's live GPS position (`useGeolocation()`), regardless of what `value`
(the place already selected in the draft) is. That's harmless today because nothing pre-fills `place`
before the user interacts with the picker. Once a map tap can seed a location far from the user's
actual position, showing GPS-based "nearby" suggestions there would be actively misleading — the
suggested places wouldn't be near the point the user just tapped.

Fix: prefer `value`'s coordinates for that query when they're real, falling back to GPS otherwise.
`{ lat: 0, lng: 0 }` is the existing sentinel this component already uses for "no real place chosen
yet" (see the free-text `onChange` handler's `const base = value ?? { lat: 0, lng: 0 }`), so treat
that sentinel as "not a real location":

```ts
const { coords: gpsCoords, denied } = useGeolocation();
const hasRealValue = value != null && (value.lat !== 0 || value.lng !== 0);
const searchCoords = hasRealValue ? { lat: value.lat, lng: value.lng } : gpsCoords;
const { data: nearbyPlaces } = useNearbyPlaces(searchCoords?.lat, searchCoords?.lng);
```

## Out of scope

- A new modal/bottom-sheet quick-add UI — this reuses the existing `/report` page as-is.
- Reverse-geocoding the tapped point into an address (tracked separately as a P1 item in
  `report-discovery.spec.md`).
- Any change to the "+" FAB's behavior.
- Any UI to browse/undo a history of past taps — only the single current draft pin exists at a time.

## ⚠️ Risk — not limiting where a report can be added (flagged, not decided)

This version does **not** restrict reporting to the user's current position. Once logged in, a user
can drop a pin and submit a report at **any** point on the map, including places they have never
physically visited. This is an intentional, explicit choice for this first version — not an oversight
— but it's a real risk that deserves team discussion before this ships broadly:

- **Data quality / abuse:** a bad actor can post fake prices at a competitor's store, or spam
  fictitious locations, without ever being there. The existing safeguards (confirmation-before-submit
  step, community flags, 24h freshness TTL, place-reuse suggestions) reduce blast radius but don't
  prevent this outright — none of them check proximity between the reporter and the reported point.
  Compare to R-03/R-04 in `docs/RISKS.md`, which name related-but-distinct risks (honest mistakes,
  place fragmentation) — this is closer to a new risk (call it "unverified remote reporting") that
  isn't currently tracked there.
- **Possible future mitigations** (explicitly not built now): warn or soft-block when the tapped
  point is beyond some distance from the user's GPS position; require a higher trust level (e.g.
  verified accounts, or reputation) to report far from one's location; surface distance-from-reporter
  on flagged items to moderators as a signal.
- **Recommendation:** treat this as a discussion item before wide rollout, and consider adding a
  tracked risk entry (e.g. `R-4x`) to `docs/RISKS.md` rather than letting it live only in this spec.

## Testing notes

- `map.slice.test.ts` (new or extended): `setDraftPin`/`clearDraftPin` update state as expected.
- `MapView.test.tsx` (new): tapping the map sets the draft pin; tapping a point that
  `queryRenderedFeatures` reports as hitting a discovery layer does *not* set the draft pin; tapping
  the draft pin navigates to `/report` with the expected `reportDraft.place` and clears the pin.
- `PlacePicker.test.tsx` (new or extended): nearby-places query uses `value`'s coordinates when
  they're non-zero, and falls back to GPS otherwise.

## Docs to update after implementation

- `docs/specs/report-discovery.spec.md` — add this as a new requirement (P0 or P1 — a product call,
  not made here) alongside the existing "Place via pin or GPS" bullet, cross-referencing this spec.
- `docs/RISKS.md` — add the "unverified remote reporting" risk described above, or explicitly fold it
  into an existing risk row if the team decides it's a variant of one already tracked.
- `docs/backlog/BACKLOG.en.md` / `.pt.md` — add a numbered backlog item for this (no AT-### exists for
  it yet).
- `docs/PRODUCT.en.md` / `docs/PRODUTO.pt.md` — document the new tap-to-add-item entry point.

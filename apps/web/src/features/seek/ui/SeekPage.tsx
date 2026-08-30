import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { MapShell } from "../../map/ui/MapShell.js";
import { EmptyState } from "./EmptyState.js";
import { useGeolocation, DEFAULT_COORDS } from "../../map/model/use-geolocation.js";
import { useNearbyDiscoveries } from "../api/discovery.queries.js";
import { useAppStore } from "@/app/store/index.js";
import { useSaveData } from "@/shared/model/use-save-data.js";
import { useDebounce } from "use-debounce";

// Default API page size is 50; shrink it under Save-Data per docs/PERFORMANCE.md §3.
const SAVE_DATA_RESULT_LIMIT = 20;

export function SeekPage() {
  // The active filter lives in the query string rather than in component state: the
  // Buscar tab is a sibling route now, so a local useState here could not survive the
  // navigation that sets it. It also makes a filtered map reloadable and shareable.
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("item")?.trim() ?? "";

  const { coords, denied, loading } = useGeolocation();
  const radius = useAppStore((s) => s.mapRadius);
  const [useDebouncedRadius] = useDebounce(radius, 300);
  const setRadius = useAppStore((s) => s.setRadius);
  const selectedPlaceId = useAppStore((s) => s.selectedPlaceId);
  const saveData = useSaveData();

  const center = coords ?? DEFAULT_COORDS;

  const { data, isLoading, isError, refetch } = useNearbyDiscoveries({
    lat: center.lat,
    lng: center.lng,
    radius: useDebouncedRadius,
    item: searchQuery || undefined,
    limit: saveData ? SAVE_DATA_RESULT_LIMIT : undefined,
  });

  const clearFilter = useCallback(() => {
    // `replace` so backing out of a cleared filter does not land the user on the same
    // map with the filter silently reapplied.
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const discoveries = data?.results ?? [];

  return (
    <div className="relative w-full h-screen bg-surface overflow-hidden">
      {/* Full-screen map — underneath everything */}
      <div className="absolute inset-0">
        {loading ? (
          <div className="w-full h-full bg-surface-alt flex items-center justify-center">
            <span className="text-text-muted text-sm">Localizando você…</span>
          </div>
        ) : (
          <MapShell center={center} userPin={coords ?? undefined} discoveries={discoveries} />
        )}
      </div>

      {/* Search bar — floats on top of the map. pointer-events-none because the wrapper
          still spans the full width for the expanded bar's right-4 edge, but its resting
          state is a 44px button — without this, the rest of the strip is an invisible
          hit target that steals pans/taps from the map underneath.

          Sits at the dropdown tier, not with the rest of the map chrome at z-10: a
          positioned+z-indexed wrapper is a stacking context, so the suggestion list's own
          z-(--z-dropdown) only ever ordered it against its siblings *inside* here, never
          against the "Buscando…" pill below, which is also z-10 and opens right where the
          list does. At equal z the later element in DOM order wins, so the pill painted
          over the first suggestion (measured in e2e/mobile-shell.spec.ts).

          Top offset is --header-inset-top, not a flat 4: index.html ships
          `viewport-fit=cover` and the PWA runs standalone, so on a notched device a bare
          16px would put the app's only search affordance behind the status bar. The
          `denied` banner rides the same inset. */}
      <div className="absolute top-(--header-inset-top) left-4 right-4 z-(--z-dropdown) pointer-events-none">
        {denied && (
          <p className="text-xs text-aging bg-surface/90 rounded-lg px-3 py-1.5 mb-2 pointer-events-auto">
            Localização negada — mostrando São Paulo. Pan para sua área.
          </p>
        )}
        {/* The × keeps a full 44px box even though the chip reads smaller — the target is
            the control, not the glyph. */}
        {searchQuery && (
          <div className="inline-flex items-center gap-1 bg-surface border border-border rounded-full pl-4 pr-0.5 shadow-md pointer-events-auto">
            <span className="text-text text-sm font-medium truncate max-w-50">{searchQuery}</span>
            <button
              type="button"
              onClick={clearFilter}
              aria-label={`Remover filtro ${searchQuery}`}
              className="w-11 h-11 rounded-full flex items-center justify-center text-text-muted text-xl leading-none"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Fetch error — distinct from a true empty result, so patchy connections don't read as "nobody reported this".
          Stacked 3.5rem above the nav clearance, not on it: the radius pill sits on the
          clearance line itself and, being later in DOM at the same z-10, wins the hit test
          wherever the two overlap — which used to swallow taps on "Tentar novamente" in
          exactly the flaky-connection case this card exists for. */}
      {!isLoading && isError && (
        <div className="absolute bottom-[calc(var(--bottom-nav-clearance)+3.5rem)] left-0 right-0 z-10 px-6">
          <div className="bg-surface rounded-sheet shadow px-4 py-4 text-center">
            <p className="text-text text-sm font-medium mb-2">Não foi possível buscar relatos.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="text-accent text-sm font-semibold min-h-11 px-4"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* Empty state — shown when search has results=0 and not loading, and the fetch actually succeeded */}
      {!isLoading && !isError && discoveries.length === 0 && (
        <div className="absolute bottom-(--bottom-nav-clearance) left-0 right-0 z-10">
          <EmptyState query={searchQuery || undefined} />
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-surface/90 rounded-full px-4 py-2 z-10 shadow">
          <span className="text-text-muted text-sm">Buscando…</span>
        </div>
      )}

      {/* Radius slider — bottom-left, clearing the bottom nav */}
      {!selectedPlaceId && (
        <div className="absolute bottom-(--bottom-nav-clearance) left-4 z-10 bg-surface/95 rounded-full px-4 py-2 shadow-sm border border-border flex items-center gap-2.5">
          <span className="text-xs text-text-muted">Raio</span>
          <input
            type="range"
            min={500}
            max={20_000}
            step={500}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-24"
            aria-label="Raio de busca"
          />
          <span className="text-xs text-text font-medium w-14 text-right tabular-nums">
            {radius >= 1000 ? `${(radius / 1000).toFixed(1)} km` : `${radius} m`}
          </span>
        </div>
      )}
    </div>
  );
}

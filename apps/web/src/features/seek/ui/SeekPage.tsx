import { useState, useCallback } from "react";
import { MapShell } from "../../map/ui/MapShell.js";
import { SearchBar } from "./SearchBar.js";
import { EmptyState } from "./EmptyState.js";
import { useGeolocation, DEFAULT_COORDS } from "../../map/model/use-geolocation.js";
import { useNearbyDiscoveries } from "../api/discovery.queries.js";
import { useAppStore } from "../../../app/store/index.js";

interface Props {
  onReport: () => void;
}

export function SeekPage({ onReport }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const { coords, denied } = useGeolocation();
  const radius = useAppStore((s) => s.mapRadius);
  const setRadius = useAppStore((s) => s.setRadius);

  const center = coords ?? DEFAULT_COORDS;

  const { data, isLoading } = useNearbyDiscoveries({
    lat: center.lat,
    lng: center.lng,
    radius,
    item: searchQuery || undefined,
  });

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
  }, []);

  const discoveries = data?.results ?? [];

  return (
    <div className="relative w-full h-screen bg-surface overflow-hidden">
      {/* Full-screen map — underneath everything */}
      <div className="absolute inset-0">
        <MapShell center={center} userPin={coords ?? undefined} discoveries={discoveries} />
      </div>

      {/* Search bar — floats on top of the map */}
      <div className="absolute top-4 left-4 right-4 z-10">
        {denied && (
          <p className="text-xs text-aging bg-surface/90 rounded-lg px-3 py-1.5 mb-2">
            Localização negada — mostrando São Paulo. Pan para sua área.
          </p>
        )}
        <SearchBar onSearch={handleSearch} />
      </div>

      {/* Empty state — shown when search has results=0 and not loading */}
      {!isLoading && discoveries.length === 0 && (
        <div className="absolute bottom-20 left-0 right-0 z-10">
          <EmptyState query={searchQuery || undefined} />
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-surface/90 rounded-full px-4 py-2 z-10 shadow">
          <span className="text-text-muted text-sm">Buscando…</span>
        </div>
      )}

      {/* Radius slider — bottom-left, above FAB */}
      <div className="absolute bottom-6 left-4 z-10 bg-surface/95 rounded-full px-4 py-2 shadow-sm border border-border flex items-center gap-2.5">
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

      {/* FAB — report discovery (links to contribute flow in Plan E) */}
      <button
        className="absolute bottom-6 right-4 z-10 bg-brand text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl"
        aria-label="Relatar produto"
        onClick={onReport}
      >
        +
      </button>
    </div>
  );
}

import Map, { Marker, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { DiscoveryResponse } from "@aonde-tem/contracts";
import { DiscoveryMarkerLayer } from "./DiscoveryMarkerLayer.js";
import { PlaceModal } from "./PlaceModal.js";
import { useRef, useCallback } from "react";
import { useAppStore } from "../../../app/store/index.js";

const MAP_STYLE =
  import.meta.env.VITE_MAP_KEY && import.meta.env.VITE_MAP_KEY !== "demo"
    ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${import.meta.env.VITE_MAP_KEY}`
    : "https://tiles.openfreemap.org/styles/bright";

interface MapViewProps {
  center: { lat: number; lng: number };
  userPin?: { lat: number; lng: number };
  discoveries: DiscoveryResponse[];
}

export function MapView({ center, userPin, discoveries }: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const selectedPlaceId = useAppStore((s) => s.selectedPlaceId);

  const recenter = useCallback(() => {
    if (!userPin || !mapRef.current) return;
    mapRef.current.flyTo({ center: [userPin.lng, userPin.lat], zoom: 15, duration: 800 });
  }, [userPin]);

  const flyToPlace = useCallback((coords: { lat: number; lng: number }) => {
    mapRef.current?.flyTo({ center: [coords.lng, coords.lat], zoom: 17, duration: 800 });
  }, []);

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: center.lng, latitude: center.lat, zoom: 14 }}
        mapStyle={MAP_STYLE}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
      >
        <DiscoveryMarkerLayer discoveries={discoveries} />

        {userPin && (
          <Marker longitude={userPin.lng} latitude={userPin.lat} anchor="center">
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                backgroundColor: "#2563eb",
                border: "2px solid white",
                boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
              }}
              aria-label="Sua localização"
            />
          </Marker>
        )}
      </Map>

      {userPin && (
        <button
          type="button"
          onClick={recenter}
          aria-label="Centralizar em minha localização"
          className="absolute bottom-24 right-4 z-10 bg-surface shadow-md rounded-full w-11 h-11 flex items-center justify-center border border-border"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
          </svg>
        </button>
      )}

      {selectedPlaceId && <PlaceModal placeId={selectedPlaceId} onFlyTo={flyToPlace} />}
    </div>
  );
}

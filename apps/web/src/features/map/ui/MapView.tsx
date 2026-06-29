import Map, { Marker, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { DiscoveryResponse } from "@aonde-tem/contracts";
import { DiscoveryMarkerLayer } from "./DiscoveryMarkerLayer.js";
import { DiscoveryPopup } from "./DiscoveryPopup.js";
import { useRef } from "react";
import { useAppStore } from "../../../app/store/index.js";

// Use VITE_MAP_KEY for MapTiler if set; fall back to OpenFreeMap (no key required)
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
  const selectedId = useAppStore((s) => s.selectedDiscoveryId);
  const selectedDiscovery = discoveries.find((d) => d.id === selectedId) ?? null;

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
            {/* Blue "you are here" dot — intentionally NOT a discovery marker */}
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

      {selectedDiscovery && <DiscoveryPopup discovery={selectedDiscovery} />}
    </div>
  );
}

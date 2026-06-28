import Map, { type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { DiscoveryResponse } from "@aonde-tem/contracts";
import { DiscoveryMarkerLayer } from "./DiscoveryMarkerLayer.js";
import { DiscoveryPopup } from "./DiscoveryPopup.js";
import { useRef } from "react";
import { useAppStore } from "../../../app/store/index.js";

const MAP_STYLE = `https://api.maptiler.com/maps/streets-v2/style.json?key=${import.meta.env.VITE_MAP_KEY}`;

interface MapViewProps {
  center: { lat: number; lng: number };
  discoveries: DiscoveryResponse[];
}

export function MapView({ center, discoveries }: MapViewProps) {
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
      </Map>
      {selectedDiscovery && (
        <DiscoveryPopup discovery={selectedDiscovery} />
      )}
    </div>
  );
}

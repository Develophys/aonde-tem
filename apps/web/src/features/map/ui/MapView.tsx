import Map, { Marker } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { PlaceResponse } from "@aonde-tem/contracts";

const MAP_KEY = import.meta.env.VITE_MAP_KEY;
// Swap this URL for your self-hosted PMTiles style when you outgrow the free tier.
const MAP_STYLE = `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAP_KEY}`;

interface Props {
  center: { lat: number; lng: number };
  places: PlaceResponse[];
  onSelect: (id: string) => void;
}

export function MapView({ center, places, onSelect }: Props) {
  return (
    <Map
      initialViewState={{ longitude: center.lng, latitude: center.lat, zoom: 14 }}
      mapStyle={MAP_STYLE}
      style={{ width: "100%", height: "100%" }}
    >
      {/* user location */}
      <Marker longitude={center.lng} latitude={center.lat} color="#2563eb" />
      {/* nearby places */}
      {places.map((p) => (
        <Marker
          key={p.id}
          longitude={p.coords.lng}
          latitude={p.coords.lat}
          color="#0f172a"
          onClick={() => onSelect(p.id)}
        />
      ))}
    </Map>
  );
}

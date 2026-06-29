import { useState } from "react";
import { useGeolocation } from "../../map/model/use-geolocation.js";
import { useNearbyPlaces } from "../api/places.api.js";

interface PlaceSelection {
  lat: number;
  lng: number;
  name: string;
  placeId?: string;
}

interface Props {
  value: PlaceSelection | null;
  onChange: (place: PlaceSelection) => void;
}

export function PlacePicker({ value, onChange }: Props) {
  const { coords } = useGeolocation();
  const [placeName, setPlaceName] = useState(value?.name ?? "");
  const { data: nearbyPlaces } = useNearbyPlaces(coords?.lat, coords?.lng);

  function useCurrentLocation() {
    if (!coords) return;
    onChange({ lat: coords.lat, lng: coords.lng, name: placeName || "Localização atual" });
  }

  function selectNearbyPlace(place: {
    id: string;
    name: string;
    coords: { lat: number; lng: number };
  }) {
    setPlaceName(place.name);
    onChange({ lat: place.coords.lat, lng: place.coords.lng, name: place.name, placeId: place.id });
  }

  return (
    <div>
      <label className="block text-sm font-medium text-text mb-1">Local</label>

      {nearbyPlaces && nearbyPlaces.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-text-muted mb-1.5">
            Locais próximos — selecione ou informe novo:
          </p>
          <div className="flex flex-col gap-1.5">
            {nearbyPlaces.slice(0, 3).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectNearbyPlace(p)}
                className={`text-left px-3 py-2.5 rounded-xl border text-sm min-h-11 ${
                  value?.placeId === p.id
                    ? "border-brand bg-brand/10 text-brand font-medium"
                    : "border-border text-text"
                }`}
              >
                {p.name}
                {p.address && (
                  <span className="block text-xs text-text-muted mt-0.5">{p.address}</span>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-text-muted mt-2.5 mb-1">Ou informe outro local:</p>
        </div>
      )}

      <input
        type="text"
        value={placeName}
        onChange={(e) => {
          const name = e.target.value;
          setPlaceName(name);
          const base = value ?? { lat: 0, lng: 0 };
          onChange({ ...base, name, placeId: undefined });
        }}
        placeholder="Nome do mercado / estabelecimento"
        className="w-full border border-border rounded-xl px-4 py-3 text-text text-base outline-none focus:ring-2 focus:ring-brand mb-2"
      />

      <button
        type="button"
        onClick={useCurrentLocation}
        disabled={!coords}
        className="flex items-center gap-2 text-brand text-sm font-medium disabled:text-text-muted min-h-[44px] py-3"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
          />
        </svg>
        {coords ? "Usar minha localização atual" : "Aguardando localização…"}
      </button>

      {value && (
        <p className="text-xs text-fresh mt-1">
          ✓ {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
        </p>
      )}
    </div>
  );
}

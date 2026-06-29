import { useState } from "react";
import { useGeolocation } from "../../map/model/use-geolocation.js";

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

  function useCurrentLocation() {
    if (!coords) return;
    onChange({ lat: coords.lat, lng: coords.lng, name: placeName || "Localização atual" });
  }

  return (
    <div>
      <label className="block text-sm font-medium text-text mb-1">Local</label>
      <input
        type="text"
        value={placeName}
        onChange={(e) => {
          setPlaceName(e.target.value);
          if (value) onChange({ ...value, name: e.target.value });
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
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

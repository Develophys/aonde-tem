import { useState, useEffect, useRef } from "react";
import { haversineMeters } from "@/shared/model/geo.js";

interface GeoCoords {
  lat: number;
  lng: number;
  accuracy: number;
}

interface GeolocationState {
  coords: GeoCoords | null;
  error: string | null;
  loading: boolean;
  denied: boolean;
}

// Below this, a new GPS fix is treated as sensor noise, not real movement — a standard
// "distance filter" (cf. iOS CLLocationManager.distanceFilter) that keeps watchPosition's
// per-second ticks from re-rendering the map and marker on every micro-jitter.
const MOVEMENT_THRESHOLD_METERS = 20;

// Last fix accepted by any mount, held at module scope for the life of the tab.
//
// The map is one tab of four now, so SeekPage unmounts and remounts on ordinary
// navigation (Mapa → Perfil → Mapa). Seeding from a per-hook ref only would restart every
// return at `loading: true`, which blanks the whole map behind "Localizando você…" while
// a fresh high-accuracy fix resolves — 1–3s indoors on a Moto G, up to the 10s timeout.
// Reusing the last fix renders the map immediately at the position the user last saw and
// lets watchPosition refine it in the background. PlacePicker and PlaceModal, which mount
// the same hook mid-flow, get the same benefit.
//
// Deliberately not persisted (no storage): a stale position across sessions would be
// worse than a spinner. The very first mount of a tab still has nothing cached and so
// still shows the loading state.
let lastKnownCoords: GeoCoords | null = null;

export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>(() => ({
    coords: lastKnownCoords,
    error: null,
    loading: lastKnownCoords === null,
    denied: false,
  }));
  const lastAcceptedRef = useRef<GeoCoords | null>(lastKnownCoords);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setState({
        coords: null,
        error: "Localização não disponível neste dispositivo",
        loading: false,
        denied: false,
      });
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const next = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        const last = lastAcceptedRef.current;
        if (last && haversineMeters(last, next) < MOVEMENT_THRESHOLD_METERS) return;

        lastAcceptedRef.current = next;
        lastKnownCoords = next;
        setState({ coords: next, error: null, loading: false, denied: false });
      },
      (err) => {
        const denied = err.code === err.PERMISSION_DENIED;
        // Permission revoked: drop the cache too, so the next mount doesn't seed itself
        // with a position the user has just withdrawn consent for.
        if (denied) {
          lastKnownCoords = null;
          lastAcceptedRef.current = null;
        }
        setState({ coords: null, error: err.message, loading: false, denied });
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 10_000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return state;
}

// Default coordinates — São Paulo city center (used when geolocation denied/unavailable)
export const DEFAULT_COORDS: GeoCoords = { lat: -23.5505, lng: -46.6333, accuracy: 0 };

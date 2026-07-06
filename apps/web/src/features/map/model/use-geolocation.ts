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

export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    coords: null,
    error: null,
    loading: true,
    denied: false,
  });
  const lastAcceptedRef = useRef<GeoCoords | null>(null);

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
        setState({ coords: next, error: null, loading: false, denied: false });
      },
      (err) => {
        const denied = err.code === err.PERMISSION_DENIED;
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

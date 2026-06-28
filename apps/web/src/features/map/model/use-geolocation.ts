import { useState, useEffect } from "react";

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

export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    coords: null,
    error: null,
    loading: true,
    denied: false,
  });

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setState({ coords: null, error: "Localização não disponível neste dispositivo", loading: false, denied: false });
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy },
          error: null,
          loading: false,
          denied: false,
        });
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

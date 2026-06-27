import { useEffect, useState } from "react";

interface GeoState {
  coords?: { lat: number; lng: number };
  error?: string;
  loading: boolean;
}

export function useGeolocation(): GeoState {
  const [state, setState] = useState<GeoState>({ loading: true });

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setState({ loading: false, error: "Geolocation is not supported" });
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (p) =>
        setState({ loading: false, coords: { lat: p.coords.latitude, lng: p.coords.longitude } }),
      (e) => setState({ loading: false, error: e.message }),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  return state;
}

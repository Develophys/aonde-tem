import { useQuery } from "@tanstack/react-query";
import type { PlaceResponse } from "@aonde-tem/contracts";

export function useNearbyPlaces(lat: number | undefined, lng: number | undefined) {
  return useQuery<PlaceResponse[]>({
    queryKey: ["places", "nearby", lat, lng],
    queryFn: async () => {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL ?? ""}/api/places/nearby?lat=${lat}&lng=${lng}&radius=300`,
      );
      if (!res.ok) return [];
      return res.json() as Promise<PlaceResponse[]>;
    },
    enabled: lat !== undefined && lng !== undefined,
    staleTime: 60_000,
  });
}

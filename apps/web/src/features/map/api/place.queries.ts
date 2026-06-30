import { useQuery } from "@tanstack/react-query";
import { fetchPlaceWithDiscoveries } from "./place.api.js";

const keys = {
  detail: (id: string) => ["places", id] as const,
};

export function usePlaceDiscoveries(placeId: string | null) {
  return useQuery({
    queryKey: placeId ? keys.detail(placeId) : (["places", "__disabled"] as const),
    queryFn: () => fetchPlaceWithDiscoveries(placeId!),
    enabled: !!placeId,
    staleTime: 30_000,
  });
}

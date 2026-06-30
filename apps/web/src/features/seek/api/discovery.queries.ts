import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { fetchNearbyDiscoveries } from "./discovery.api.js";

const keys = {
  nearby: (lat: number, lng: number, radius: number, item?: string) =>
    ["discoveries", "nearby", lat, lng, radius, item] as const,
};

export function useNearbyDiscoveries(
  params: { lat: number; lng: number; radius: number; item?: string } | null,
) {
  return useQuery({
    queryKey: params
      ? keys.nearby(params.lat, params.lng, params.radius, params.item)
      : ["discoveries", "disabled"],
    queryFn: () => fetchNearbyDiscoveries(params!),
    enabled: params !== null,
    staleTime: 30_000, // 30s — discoveries don't change every second
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

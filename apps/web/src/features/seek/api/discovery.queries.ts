import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { fetchNearbyDiscoveries } from "./discovery.api.js";

// ~3 decimal places (~110m at the equator) — coarse enough that GPS jitter from
// watchPosition doesn't mint a new query key (and a new network request) on every tick.
const QUERY_KEY_PRECISION = 1000;

function roundForKey(value: number): number {
  return Math.round(value * QUERY_KEY_PRECISION) / QUERY_KEY_PRECISION;
}

const keys = {
  nearby: (lat: number, lng: number, radius: number, item?: string, limit?: number) =>
    ["discoveries", "nearby", roundForKey(lat), roundForKey(lng), radius, item, limit] as const,
};

export function useNearbyDiscoveries(
  params: { lat: number; lng: number; radius: number; item?: string; limit?: number } | null,
) {
  return useQuery({
    queryKey: params
      ? keys.nearby(params.lat, params.lng, params.radius, params.item, params.limit)
      : ["discoveries", "disabled"],
    queryFn: () => fetchNearbyDiscoveries(params!),
    enabled: params !== null,
    staleTime: 30_000, // 30s — discoveries don't change every second
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

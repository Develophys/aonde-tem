import { useQuery } from "@tanstack/react-query";
import { fetchPlaceWithDiscoveries } from "./place.api.js";
import { useAppStore } from "../../../app/store/index.js";

const keys = {
  // accessToken is part of the key (not just an argument to queryFn) so that signing
  // in/out invalidates the cached response — isMine differs per requesting user, and a
  // stale cache entry fetched anonymously must not silently keep isMine:false forever.
  detail: (id: string, accessToken: string | null) => ["places", id, accessToken] as const,
};

export function usePlaceDiscoveries(placeId: string | null) {
  const accessToken = useAppStore((s) => s.accessToken);

  return useQuery({
    queryKey: placeId ? keys.detail(placeId, accessToken) : (["places", "__disabled"] as const),
    queryFn: () => fetchPlaceWithDiscoveries(placeId!, accessToken),
    enabled: !!placeId,
    staleTime: 30_000,
  });
}

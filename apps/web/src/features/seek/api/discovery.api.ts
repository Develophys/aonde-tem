import {
  nearbyDiscoveriesResponseSchema,
  type NearbyDiscoveriesResponse,
} from "@aonde-tem/contracts";
import { http } from "../../../shared/api/http.js";

export async function fetchNearbyDiscoveries(params: {
  lat: number;
  lng: number;
  radius: number;
  item?: string;
}): Promise<NearbyDiscoveriesResponse> {
  const qs = new URLSearchParams({
    lat: params.lat.toString(),
    lng: params.lng.toString(),
    radius: params.radius.toString(),
    ...(params.item ? { item: params.item } : {}),
  });
  return http(`/api/discoveries/nearby?${qs}`, nearbyDiscoveriesResponseSchema);
}

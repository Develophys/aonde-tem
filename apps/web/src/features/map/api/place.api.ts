import {
  placeWithDiscoveriesResponseSchema,
  type PlaceWithDiscoveriesResponse,
} from "@aonde-tem/contracts";
import { http } from "../../../shared/api/http.js";

export async function fetchPlaceWithDiscoveries(
  placeId: string,
): Promise<PlaceWithDiscoveriesResponse> {
  return http(`/api/places/${placeId}`, placeWithDiscoveriesResponseSchema);
}

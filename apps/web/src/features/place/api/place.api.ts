import {
  placeListSchema, placeResponseSchema, createPlaceSchema,
  type CreatePlaceDto,
} from "@aonde-tem/contracts";
import { http } from "../../../shared/api/http";

export function fetchNearby(lat: number, lng: number, radius: number) {
  const qs = new URLSearchParams({ lat: String(lat), lng: String(lng), radius: String(radius) });
  return http(`/api/places/nearby?${qs.toString()}`, placeListSchema);
}

export function createPlace(dto: CreatePlaceDto) {
  createPlaceSchema.parse(dto); // validate before sending
  return http(`/api/places`, placeResponseSchema, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}
